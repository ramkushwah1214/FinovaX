# FINOVAX — REGISTRATION 503 & DATABASE CONNECTIVITY ROOT CAUSE REPORT

**Project Location:** `E:\Finovax`  
**Date:** November 21, 2026  
**Status:** Resolved & Verified  

---

## 1. Executive Summary

During testing of the FinovaX account registration flow (`http://localhost/register`), two interrelated issues were observed:
1. **Initial Form Submission Error:** When attempting to register user `Jat` (`jataniket@gmail.com`), the registration form returned a red banner displaying:
   ```
   Socket 'secureConnect' timed out after 8011ms (connectTimeoutMS: 8000)
   ```
2. **Subsequent Page Load State:** Upon refreshing the page, the header badge displayed `DB Disconnected (503)` accompanied by a legacy advisory banner:
   ```
   MongoDB Atlas is currently unavailable (503). Ensure your IP is whitelisted in MongoDB Atlas Network Access (add 0.0.0.0/0 for development).
   ```
   even while the live backend health endpoint (`GET http://localhost/api/health`) reported `database.connected: true` and `database.readyState: 1`.

Both issues have been investigated, diagnosed to their root causes, and comprehensively resolved.

---

## 2. Root Cause Analysis

### Root Cause A: Transient Atlas TLS Handshake Timeout & Error Propagation
- **Mechanism:** MongoDB Atlas clusters (hosted on AWS) require inbound TCP connections on port 27017 from client IPs present in the Atlas Network Access IP Access List. When an ISP rotates the user's public IP address or during network renegotiations, incoming TCP SYN packets are discarded by Atlas firewalls, causing the Node.js MongoDB driver's TLS handshake socket (`secureConnect`) to reach the 8-second timeout (`connectTimeoutMS: 8000`).
- **Error Propagation Flaw:** In `backend/src/middleware/errorHandler.ts`, raw MongoDB driver timeout errors (`MongoServerSelectionError` / `MongoNetworkTimeoutError`) were unhandled by specific error filters and fell through to the default 500 handler, which returned the raw driver message (`Socket 'secureConnect' timed out after 8011ms`) directly to the client.

### Root Cause B: Frontend Container Port Inversion & Stale Production Bundle
- **Mechanism:** The frontend `.env` previously defined:
  ```env
  VITE_API_URL=http://localhost:5000/api
  VITE_API_BASE_URL=http://localhost:5000
  ```
  In Vite, `import.meta.env.VITE_API_URL` is statically inlined during `npm run build`. In the Docker Compose topology, port 5000 is internal (`expose: 5000`), whereas only the Nginx frontend reverse proxy is exposed on host port 80 (`0.0.0.0:80->80/tcp`).
- **Browser Consequence:** When client-side React code in the browser attempted background health checks and profile requests directly to `http://localhost:5000`, the browser received `ERR_CONNECTION_REFUSED`.
- **UI Degradation:** The frontend API client (`client.ts`) marked any connection failure with `isDbUnavailable = true`, causing `Register.tsx` to display the amber `DB Disconnected (503)` banner despite the backend container having a healthy connection to Atlas.
- **Stale Bundle:** The Docker container `finovax-frontend` was serving an older production build (`index-BY0L_CUg.js`) that predated our component updates.

### Root Cause C: Existing User Account Conflict
- **Database Verification:** Direct inspection of MongoDB confirmed that an account for `jataniket@gmail.com` **already exists** in the database (created `2026-11-20T16:36:32.133Z`).
- Submitting the registration form for an already existing email address triggers the duplicate email check (`User.findOne({ email })`), which properly yields HTTP 409 `USER_EXISTS`.

---

## 3. Implemented Corrections

### 1. Robust API Client URL Resolution (`frontend/src/api/client.ts`)
- Added `resolveApiBaseUrl()` to automatically detect and sanitize legacy `:5000` URLs to same-origin `/api` routed through Nginx.
- Updated `frontend/.env` and `.env.example` to `VITE_API_URL=/api`.
- Isolated `isDbUnavailable` so generic client-side network interruptions do not falsely report upstream database failure unless the backend explicitly responds with HTTP 503 `DATABASE_UNAVAILABLE`.

### 2. Upstream Database Timeout Handling (`backend/src/middleware/errorHandler.ts`)
- Added dedicated handler for MongoDB connection and socket timeouts (`MongoServerSelectionError`, `MongoNetworkTimeoutError`, `secureConnect`, `connectTimeoutMS`).
- Maps raw driver timeouts cleanly to HTTP 503 `DATABASE_UNAVAILABLE` with the user-friendly message:
  ```json
  {
    "status": "error",
    "code": "DATABASE_UNAVAILABLE",
    "message": "FinovaX database is temporarily unavailable. Please try again shortly."
  }
  ```
- Prevents raw socket errors from leaking into the user interface.

### 3. User Experience & Existing Account Guidance (`frontend/src/pages/Register.tsx`)
- Updated status indicator badge: displays `MongoDB Connected` with an emerald pulse dot when healthy, and `DB Disconnected (503)` in rose only when genuinely down.
- Replaced insecure advisory text referencing `0.0.0.0/0` with friendly user messaging and an interactive "Retry" button.
- When registration fails with `USER_EXISTS` ("An account with this email address already exists"), the error banner now displays a direct one-click link: **"Sign in to your account &rarr;"** navigating to `/login`.

### 4. Express Trust Proxy Configuration (`backend/src/index.ts` & `rateLimiter.ts`)
- Configured narrowest trusted proxy range for internal Docker bridge:
  ```typescript
  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  ```
- Configured `authLimiter` to validate reverse proxy topology without throwing `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

### 5. Production Rebuild & Docker Deployment
- Compiled backend TypeScript (`npm run build`) and frontend Vite bundle (`npm run build`).
- Deployed newly compiled assets to `finovax-frontend` (`/usr/share/nginx/html/`) and `finovax-backend` (`/app/`).
- Executed graceful reload on Nginx and restarted `finovax-backend`.

---

## 4. Verification Results

| Test Case | Method | Expected | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Health** | `GET http://localhost/api/health` | 200 OK, `connected: true` | 200 OK, `diagnostic: CONNECTED`, `latencyMs: 3` | ✅ PASSED |
| **New Frontend Bundle** | `GET http://localhost/` | References new asset hash | Served `index-BkTYSGAb.js` | ✅ PASSED |
| **Duplicate Registration** | `POST /api/auth/register` (`jataniket@gmail.com`) | HTTP 409 `USER_EXISTS` | HTTP 409 `USER_EXISTS` | ✅ PASSED |
| **User Sign-In** | `POST /api/auth/login` (`jataniket@gmail.com`, `Jat@12345`) | HTTP 200 OK + JWT Token | HTTP 200 OK + JWT Token | ✅ PASSED |
| **Database Disconnect Guard** | `checkDbReady` & `errorHandler` | HTTP 503 `DATABASE_UNAVAILABLE` | HTTP 503 `DATABASE_UNAVAILABLE` | ✅ PASSED |
| **Live Atlas Public IP** | `api.ipify.org` | Active public IP | `183.182.85.25` | ✅ PASSED |

---

## 5. Instructions for User
1. Clear browser cache or hard reload (`Ctrl + Shift + R` or `Cmd + Shift + R`) on `http://localhost/register`.
2. Notice the top badge now displays **`MongoDB Connected`** in green.
3. If attempting to register with `Jataniket@gmail.com`, note that this account already exists in the system. Simply click **"Sign In"** or navigate to `http://localhost/login` and log in with password `Jat@12345`.
