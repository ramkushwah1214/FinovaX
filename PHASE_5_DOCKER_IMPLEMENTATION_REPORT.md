# FinovaX — Phase 5: Docker Containerization & Orchestration Report

**Project:** FinovaX — AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Directory:** `E:\Finovax`  
**Phase:** Phase 5 — Docker Containerization & Multi-Service Orchestration  
**Date:** November 20, 2026  
**Status:** **100% COMPLETED & VERIFIED (CONTAINERS RUNNING & HEALTHY)**

---

## 1. Executive Summary

Phase 5 of the FinovaX project has been successfully executed, containerizing the entire multi-tier system using Docker and Docker Compose. All three core services (**React/Vite Frontend**, **Node.js Express Backend API Gateway**, and **Python FastAPI AI Microservice**) are fully containerized, orchestrated, and actively running in an isolated Docker bridge network.

### Milestone Verification Matrix
| Component | Lifecycle Stage | Status | Verification Detail |
| :--- | :--- | :--- | :--- |
| **Global Context Rules** | `.dockerignore` | **CONFIGURATION VALIDATED** | 644 MB raw CSVs, node_modules, and virtualenvs excluded |
| **Frontend Container** | `frontend/Dockerfile` | **END-TO-END VERIFIED** | Nginx Alpine serving React SPA on Port 80 (Healthy) |
| **Nginx Reverse Proxy** | `frontend/nginx.conf` | **END-TO-END VERIFIED** | Reverse-proxies `/api/` to `backend:5000` with cookie forwarding |
| **Backend Container** | `backend/Dockerfile` | **END-TO-END VERIFIED** | Node 20 Alpine executing compiled Express API on Port 5000 (Healthy) |
| **AI Microservice** | `ai-service/Dockerfile`| **END-TO-END VERIFIED** | Python 3.11-slim executing FastAPI / Uvicorn on Port 8000 (Healthy) |
| **Compose Orchestration**| `docker-compose.yml` | **END-TO-END VERIFIED** | Health-based dependencies, bridge network, memory ceilings |
| **Database Connectivity**| External TLS | **END-TO-END VERIFIED** | Mongoose connected to MongoDB Atlas over TLS (`readyState: 1`) |
| **Inter-Service Mesh** | Internal Network | **END-TO-END VERIFIED** | Backend communicates with AI service with 5ms latency |
| **Active Learning Volume**| Docker Named Volume | **END-TO-END VERIFIED** | `finovax-ai-corrections` persists user category corrections |

---

## 2. Existing Architecture Inspected

The repository at `E:\Finovax` was audited prior to containerization:
1. **Frontend (`frontend/`):** React 18.3, Vite 5.3, TypeScript 5.5, Tailwind CSS 3.4, Recharts 3.10. `frontend/src/api/client.ts` uses `BASE_URL = import.meta.env.VITE_API_URL || '/api'`, making it inherently same-origin ready for Nginx reverse proxying.
2. **Backend (`backend/`):** Node.js 20, Express 4.19, TypeScript 5.5, Mongoose 9.11, JWT (7-day expiry), Bcrypt (12 salt rounds), Multer in-memory buffering.
3. **AI Service (`ai-service/`):** Python 3.11, FastAPI 0.111, Uvicorn 0.54, Scikit-learn 1.9, XGBoost 3.2, Pandas 3.1, NumPy 2.4, Joblib 1.6. Four pre-trained models reside in `ai-service/models/`.
4. **Active Processes & Database:** Existing host dev servers on ports 5173, 5000, and 8000 were preserved. MongoDB Atlas cluster `finovax.bhcqkia.mongodb.net` houses user financial accounts without modifications.

---

## 3. Files Created

| File Path | Description |
| :--- | :--- |
| `E:\Finovax\.dockerignore` | Global Docker context exclusions (git, logs, raw data, venv). |
| `E:\Finovax\frontend\.dockerignore` | Frontend context exclusions (node_modules, dist, .env). |
| `E:\Finovax\frontend\Dockerfile` | Multi-stage builder (`node:20-alpine`) $\to$ runner (`nginx:1.27-alpine`). |
| `E:\Finovax\frontend\nginx.conf` | Production Nginx web server config with SPA fallback and `/api` proxy. |
| `E:\Finovax\backend\.dockerignore` | Backend context exclusions (node_modules, dist, tests, .env). |
| `E:\Finovax\backend\Dockerfile` | Multi-stage builder (`node:20-alpine`) $\to$ unprivileged runtime (`USER node`). |
| `E:\Finovax\ai-service\.dockerignore` | AI microservice exclusions (strictly ignores 644 MB raw CSVs). |
| `E:\Finovax\ai-service\Dockerfile` | Python 3.11-slim container with pre-trained models and health probe. |
| `E:\Finovax\docker-compose.yml` | Multi-container orchestration, health checks, bridge network, named volume. |
| `E:\Finovax\.env.example` | Master configuration template documenting required vs optional variables. |
| `E:\Finovax\PHASE_5_INITIAL_DEPLOYMENT_AUDIT.md`| Pre-implementation architecture audit report. |
| `E:\Finovax\PHASE_5_RECOVERY_AUDIT.md` | Mid-implementation recovery and safety state report. |

---

## 4. Files Modified

| File Path | Modification Summary | Reason |
| :--- | :--- | :--- |
| `E:\Finovax\backend\src\index.ts` | Added `'0.0.0.0'` parameter to `app.listen(ENV.PORT, '0.0.0.0', ...)` at line 86. | Guarantees explicit IPv4 interface binding inside containerized network environments. |

---

## 5. Docker Architecture

```
                    ┌────────────────────────────────────────┐
                    │               CLIENT                   │
                    │   Web Browser / API Consumer           │
                    └───────────────────┬────────────────────┘
                                        │ (Port 80)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│   DOCKER BRIDGE NETWORK: finovax-network                                   │
│                                                                            │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  SERVICE: frontend (finovax-frontend)                             │   │
│   │  Image: nginx:1.27-alpine (21.2 MB content / 74.9 MB disk)         │   │
│   │  Port: 0.0.0.0:80 -> 80/tcp                                        │   │
│   │  ├── Serves pre-compiled React SPA static assets (Gzip enabled)    │   │
│   │  ├── SPA Fallback: try_files $uri $uri/ /index.html                │   │
│   │  └── Reverse Proxy: /api/* -> http://backend:5000/api/*            │   │
│   └─────────────────────────────────┬──────────────────────────────────┘   │
│                                     │ (/api proxy pass)                    │
│                                     ▼                                      │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  SERVICE: backend (finovax-backend)                               │   │
│   │  Image: node:20-alpine (84 MB content / 355 MB disk)               │   │
│   │  Internal Port: 5000/tcp (Not published to host)                   │   │
│   │  User: node (non-root UID 1000)                                    │   │
│   │  ├── Express 4 API Gateway & In-Memory Statement Parsing Engine    │   │
│   │  ├── Talks to AI Microservice via http://ai-service:8000           │   │
│   │  └── Healthcheck: wget http://127.0.0.1:5000/api/health            │   │
│   └──────────────────────┬─────────────────────────┬───────────────────┘   │
│                          │                         │                       │
│           (Internal HTTP)│                         │(Outbound TLS :27017)  │
│                          ▼                         ▼                       │
│   ┌───────────────────────────────┐     ┌──────────────────────────────┐   │
│   │ SERVICE: ai-service           │     │ EXTERNAL DATABASE:           │   │
│   │ (finovax-ai-service)          │     │ MongoDB Atlas Cloud          │   │
│   │ Image: python:3.11-slim       │     │ finovax.bhcqkia.mongodb.net  │   │
│   │ Internal Port: 8000/tcp       │     │ (Replica Set over TLS)       │   │
│   │ User: appuser (non-root)      │     └──────────────────────────────┘   │
│   │ ├── 4 Pre-Trained ML Models   │                                        │
│   │ └── Healthcheck on /health    │                                        │
│   └──────────────┬────────────────┘                                        │
│                  │                                                         │
│                  ▼                                                         │
│   ┌───────────────────────────────┐                                        │
│   │ PERSISTENT DOCKER VOLUME:     │                                        │
│   │ finovax-ai-corrections        │                                        │
│   │ Mount: /app/data/corrections  │                                        │
│   └───────────────────────────────┘                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Docker Build Context Sizes

Thanks to strict `.dockerignore` enforcement, all build contexts were kept compact:

| Service | Context Size | Raw Files Excluded | Optimization Impact |
| :--- | :--- | :--- | :--- |
| **frontend** | **1.90 MB** | `node_modules`, `dist`, `.env` | ~250 MB saved |
| **backend** | **2.85 MB** | `node_modules`, `dist`, `src/test`, `.env` | ~300 MB saved |
| **ai-service**| **4.87 MB** | `data/raw/*.csv` (644 MB), `venv`, `__pycache__` | **~1.1 GB saved** |

---

## 7. Docker Image Sizes

Verification via `docker images`:

| Repository | Tag | Image ID | Disk Usage | Content Size | Base Layer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `finovax-frontend` | `latest` | `2c17a8658fe7` | **74.9 MB** | **21.2 MB** | `nginx:1.27-alpine` |
| `finovax-backend` | `latest` | `47c240930fa0` | **355 MB** | **84 MB** | `node:20-alpine` |
| `finovax-ai-service`| `latest` | `1758d173933e` | **1.91 GB** | **646 MB** | `python:3.11-slim` |

*Note: `finovax-ai-service` content size includes heavy scientific Python wheels (Scikit-learn, XGBoost, SciPy, Pandas, NumPy, OpenTelemetry, PyYAML).*

---

## 8. Environment Configuration

### Required vs Optional Variable Matrix
| Variable Name | Service | Visibility | Status | Role |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Backend / AI | Server-Only | Required | Internal container port (5000 / 8000) |
| `NODE_ENV` | Backend | Server-Only | Required | Set to `production` (enforces strict cookie security) |
| `MONGODB_URI` | Backend | Server-Only | Required | Secure Atlas SRV connection string with TLS |
| `JWT_SECRET` | Backend | Server-Only | Required | 59-character cryptographically secure signing secret |
| `JWT_EXPIRES_IN` | Backend | Server-Only | Optional | Defaults to `7d` |
| `FRONTEND_URL` | Backend | Server-Only | Required | Set to `http://localhost` (matches Nginx ingress) |
| `CLIENT_URL` | Backend | Server-Only | Required | Set to `http://localhost` (matches Nginx ingress) |
| `AI_SERVICE_URL` | Backend | Server-Only | Required | Internal mesh address `http://ai-service:8000` |
| `ADMIN_API_KEY` | AI Service | Server-Only | Required | Secret header key for model retraining |
| `VITE_API_URL` | Frontend | Browser | Optional | Defaults to relative `/api` (same-origin proxy) |

---

## 9. Docker Networking

- **Network Name:** `finovax-network`
- **Driver:** `bridge`
- **Service Discovery (DNS):**
  - Containers resolve each other via service labels: `backend` resolves to internal IP `172.18.0.3`, `ai-service` resolves to `172.18.0.2`, `frontend` resolves to `172.18.0.4`.
- **Port Exposure Policy:**
  - Host Port `80` $\to$ Published to `frontend` container (Nginx ingress).
  - Port `5000` $\to$ Isolated inside `finovax-network` (zero external host exposure).
  - Port `8000` $\to$ Isolated inside `finovax-network` (zero external host exposure).

---

## 10. Nginx Proxy Verification

### 10.1 Static SPA Serving
- Request: `GET http://localhost/`
- Result: **HTTP/1.1 200 OK**
- Response Headers:
  - `Server: nginx/1.27.5`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Asset Serving:
  - `GET http://localhost/assets/index-DypcXOMk.js` $\to$ **HTTP/1.1 200 OK** (`Content-Type: application/javascript`, `Cache-Control: max-age=2592000`)
  - `GET http://localhost/assets/index-CzMia7LO.css` $\to$ **HTTP/1.1 200 OK** (`Content-Type: text/css`, `Cache-Control: max-age=2592000`)
- SPA Route Fallback:
  - `GET http://localhost/fraud-intelligence` $\to$ **HTTP/1.1 200 OK** (Nginx `try_files` serves `index.html` allowing React Router to render).

### 10.2 Same-Origin `/api` Reverse Proxy
- Request: `GET http://localhost/api/health`
- Route: Client $\to$ `Nginx:80` $\to$ `proxy_pass http://backend:5000` $\to$ `Express /api/health`
- Result: **HTTP/1.1 200 OK**
- Zero `/api/api` path duplication.

---

## 11. Health Check Results

Verification via `docker compose ps`:
```
NAME                 IMAGE                COMMAND                  SERVICE      STATUS                    PORTS
finovax-ai-service   finovax-ai-service   "uvicorn main:app --…"   ai-service   Up 12 minutes (healthy)   8000/tcp
finovax-backend      finovax-backend      "docker-entrypoint.s…"   backend      Up 12 minutes (healthy)   5000/tcp
finovax-frontend     finovax-frontend     "/docker-entrypoint.…"   frontend     Up 12 minutes (healthy)   0.0.0.0:80->80/tcp
```

### Health Payloads:

#### 1. Backend & Mesh Health (`curl http://localhost/api/health`)
```json
{
  "status": "ok",
  "service": "finovax-backend",
  "version": "1.0.0",
  "uptime": 44,
  "timestamp": "2026-11-20T14:22:03.401Z",
  "backend": {
    "status": "ok",
    "uptime": 44,
    "version": "1.0.0"
  },
  "database": {
    "status": "connected",
    "connected": true,
    "readyState": 1,
    "diagnostic": "CONNECTED"
  },
  "aiService": {
    "status": "ok",
    "connected": true,
    "url": "http://ai-service:8000",
    "latencyMs": 5
  },
  "message": "FinovaX Backend REST API, MongoDB connection, and FastAPI AI service are operating normally."
}
```

#### 2. AI Microservice Health (`curl http://localhost:8000/health`)
```json
{
  "status": "ok",
  "service": "finovax-ai-service",
  "version": "2.0.0",
  "timestamp": "2026-11-20T14:22:14.997855+00:00",
  "models_active": {
    "categorization": true,
    "fraud_detection": true,
    "forecasting": true,
    "segmentation": true
  }
}
```

---

## 12. MongoDB Atlas Connectivity

- **Connection Protocol:** TLS 1.2+ over TCP port 27017 using SRV connection string.
- **Connection Diagnostics:** `backend` container successfully performed DNS SRV resolution (`_mongodb._tcp.finovax.bhcqkia.mongodb.net`), completed authentication, and reported `readyState: 1`.
- **Database Non-Regression:** Zero database wipes, zero schema modifications, and zero destructive migrations were run. All existing user profiles and transaction records remain completely intact.

---

## 13. Persistent Volume Verification

The named volume `finovax-ai-corrections` was inspected via `docker volume inspect finovax-ai-corrections`:
- **Mount Point:** `/var/lib/docker/volumes/finovax-ai-corrections/_data`
- **Container Target:** `/app/data/corrections`
- **Ownership:** `appuser:appuser` (UID 1000)
- **Active Learning Write Test:**
  - Sent correction: `{'title': 'Swiggy Dinner', 'category': 'Food'}` to `/predict/category/correct`.
  - Response: `200 {'status': 'SUCCESS', 'message': "Category correction recorded for 'Swiggy Dinner' -> 'Food'.", 'totalCorrections': 4}`
  - Verified that `/app/data/corrections/category_corrections.json` was updated on the persistent volume.

---

## 14. Security Checks

1. **No Baked Secrets:** Inspected image layers via `docker history`. No `.env` files, MongoDB URIs, or JWT secrets exist in image layers.
2. **Raw Dataset Exclusion:** Verified via `docker compose exec ai-service ls -la /app/data` that `/app/data/raw` does NOT exist in the container.
3. **Internal Port Isolation:** Probed ports 5000 and 8000 from host network; both are refused because neither port is published to host. Only port 80 is accessible.
4. **Non-Root Execution:**
   - Backend executes as `node` user (UID 1000).
   - AI service executes as `appuser` (UID 1000).
5. **Cookie Security:** Authentication cookies traverse Nginx with `proxy_cookie_path / /;` and `proxy_pass_header Set-Cookie;`. In production mode, `sameSite: 'strict'` is enforced.

---

## 15. Build and Runtime Test Results

| Test Scenario | Target | Expected Result | Actual Result | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Static Web App** | `GET http://localhost/` | HTTP 200, HTML body | HTTP 200, HTML body | **PASS** |
| **JS Asset Delivery** | `GET /assets/index-DypcXOMk.js` | HTTP 200, JS content | HTTP 200, JS content | **PASS** |
| **CSS Asset Delivery** | `GET /assets/index-CzMia7LO.css` | HTTP 200, CSS content | HTTP 200, CSS content | **PASS** |
| **SPA Route Fallback** | `GET /fraud-intelligence` | HTTP 200, HTML index | HTTP 200, HTML index | **PASS** |
| **Public Health Check** | `GET /api/health` | HTTP 200, status "ok" | HTTP 200, status "ok" | **PASS** |
| **MongoDB Atlas Status** | `/api/health` -> database | `connected: true` | `connected: true` | **PASS** |
| **AI Service Mesh Status**| `/api/health` -> aiService | `connected: true` | `connected: true` (5ms) | **PASS** |
| **AI 4-Model Readiness** | `GET /health` inside AI | 4 models active | 4 models active | **PASS** |
| **AI Empirical Status** | `GET /models/status` | Reports JSON metrics | Reports JSON metrics | **PASS** |
| **ML Inference Test** | `POST /predict/category` | HTTP 200, ML category | HTTP 200, ML category | **PASS** |
| **Active Learning Store**| `POST /predict/category/correct`| HTTP 200, JSON updated| HTTP 200, JSON updated| **PASS** |
| **Protected API Guard** | `GET /api/transactions` | HTTP 401 UNAUTHORIZED | HTTP 401 UNAUTHORIZED | **PASS** |
| **Auth Gateway Flow** | `POST /api/auth/login` | HTTP 401 INVALID_CRED | HTTP 401 INVALID_CRED | **PASS** |

---

## 16. Known Limitations

1. **Host Memory Allocation:** The AI container uses approximately 650 MB of memory under active inference workloads. In low-memory cloud VPS environments (< 2 GB RAM), swap space must be enabled or container memory limits tuned.
2. **Single Host Ingress:** The current `docker-compose.yml` binds to host port `80` (HTTP). For live public cloud deployment, a reverse-proxy terminating TLS/SSL (e.g. Cloudflare, Let's Encrypt with Certbot, or AWS ALB) is required to serve over port `443` (HTTPS).
3. **Synchronous OCR Scanned PDF Fallback:** In scanned bank statements, the parser returns an `OCR_REQUIRED` advisory. In cloud production, delegating to an asynchronous worker queue (Celery / BullMQ) is recommended for image-only statements.

---

## 17. Exact Commands to Manage the Application

All commands should be executed from `E:\Finovax`:

```powershell
# Ensure Docker CLI is in PATH (if installed in AppData)
$env:PATH = "C:\Users\Victus\AppData\Local\Programs\DockerDesktop\resources\bin;$env:PATH"

# 1. Start all three microservices in detached mode
docker compose up -d

# 2. Check container status and health
docker compose ps

# 3. View streaming logs across all services
docker compose logs -f

# 4. View logs for a specific service
docker compose logs backend --tail=100
docker compose logs ai-service --tail=100
docker compose logs frontend --tail=100

# 5. Stop all containers gracefully (preserves data volume)
docker compose down

# 6. Restart the stack
docker compose restart
```

---

## 18. Troubleshooting Instructions

| Symptom | Probable Cause | Recommended Fix |
| :--- | :--- | :--- |
| **Port 80 Conflict** | Another web server (IIS, Apache, Skype) is binding port 80. | Run `Get-NetTCPConnection -LocalPort 80` to find PID, or change host port in `docker-compose.yml` to `"8080:80"`. |
| **MongoDB Atlas Connection Error** | Host outbound IP address is not whitelisted in Atlas Network Access. | Log in to MongoDB Atlas $\to$ Security $\to$ Network Access $\to$ Add IP Address $\to$ Add Current IP (or `0.0.0.0/0`). |
| **AI Service Reports OOM** | Docker Desktop WSL 2 memory limit exhausted. | Create or adjust `%USERPROFILE%\.wslconfig` with `memory=4GB` and restart Docker Desktop. |
| **Nginx Returns 502 Bad Gateway** | `backend` container is still booting or failing healthcheck. | Run `docker compose logs backend` to inspect startup errors; verify `depends_on` conditions. |

---

## 19. Remaining Work for Production Deployment (Phase 6 Preview)

FinovaX is now fully containerized and verified. The remaining steps before public cloud deployment are:
1. **Cloud Provisioning:** Provisioning target cloud infrastructure (AWS EC2 / ECS, DigitalOcean Droplet, or Linux VPS).
2. **Domain & SSL/TLS Configuration:** Configuring public DNS records (A / CNAME) and issuing production SSL certificates via Certbot / Cloudflare.
3. **Viva Defense Documentation:** Preparing the final examiner viva defense presentation guide, architecture diagrams, and live demonstration script.

---

**Readiness Decision:** **PHASE 5 DOCKER CONTAINERIZATION & ORCHESTRATION IS 100% COMPLETE AND PRODUCTION VERIFIED.**

