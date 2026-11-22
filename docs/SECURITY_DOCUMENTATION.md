# FinovaX — Security & Reliability Engineering Specification

**Document Version:** 1.0.0  
**Status:** Verified & Enforced across Full-Stack Implementation  

---

## 1. Threat Model & Security Posture

FinovaX handles sensitive personal banking transactions, financial balances, and authentication credentials. The platform enforces a **Defense-in-Depth** security strategy across transport, identity, application logic, database storage, and container orchestration layers.

```
[ Client / Browser ]
        │ HTTPS / HTTP (Port 80)
        ▼
[ Nginx Reverse Proxy ] ──> Security Headers, 12M Body Limit, Gzip
        │ Internal Docker Network (finovax-network)
        ▼
[ Express API Gateway ] ──> Rate Limiter, Helmet, Bcrypt 12, JWT Verify, Hex ID Guard
        │ Internal Docker Network
        ▼
[ AI Microservice ]     ──> Non-root user (UID 1000), Isolated Port 8000
        │ TLS 1.2+ encrypted port 27017
        ▼
[ MongoDB Atlas Cloud ] ──> RBAC, select: false passwordHash, Strict Tenant Scoping
```

---

## 2. Authentication & Credential Security

### 2.1 Password Salting & Hashing
- **Algorithm:** Bcrypt with a work factor of **12 salt rounds** (`bcrypt.genSalt(12)` in `authController.ts`).
- **Computational Cost:** 12 rounds requires approximately 250–350 ms per hash calculation, rendering offline GPU dictionary and rainbow-table attacks computationally prohibitive.
- **Enforced Password Complexity (`isStrongPassword`):**
  - Minimum 8 characters.
  - At least 1 uppercase letter (`[A-Z]`).
  - At least 1 lowercase letter (`[a-z]`).
  - At least 1 numerical digit (`[0-9]`).
  - At least 1 special character symbol (`[\W_]`).

### 2.2 Mongoose Schema Projection Security
- In `backend/src/models/User.ts`, the password hash field is configured with:
  ```typescript
  passwordHash: {
    type: String,
    required: true,
    select: false
  }
  ```
- **Guaranteed Isolation:** Normal database queries (`User.find()`, `User.findById()`, etc.) will **never** return `passwordHash` in their output document.
- Only the dedicated `login()` controller chains `.select('+passwordHash')` to perform constant-time comparison via `bcrypt.compare()`.
- Automated test `User model schema select:false prevents passwordHash leakage on findById` verifies this behavior.

### 2.3 Session Tokens & Cookie Security
- **Token Signing:** JSON Web Tokens (JWT) signed with HMAC-SHA256 using a high-entropy secret (`JWT_SECRET` $\ge$ 32 chars).
- **Expiration:** Hardcoded session ceiling of **7 days** (`expiresIn: '7d'`).
- **HttpOnly Cookie Delivery (`setAuthCookie`):**
  - `httpOnly: true`: Completely immune to JavaScript DOM access and Cross-Site Scripting (XSS) token theft.
  - `sameSite: 'strict'` (in production): Protects against Cross-Site Request Forgery (CSRF).
  - `secure: true` (in production): Ensures transmission occurs only over encrypted TLS connections.
- **Dual Bearer Header Fallback:** Programmatic API clients and automated test suites authenticate via `Authorization: Bearer <token>`.

---

## 3. Multi-Tenant Data Isolation

FinovaX strictly enforces tenant boundaries at the database query level:
1. **Zero Client Trust:** The server derives user identity solely from the cryptographically verified JWT payload (`req.user.id`).
2. **Mandatory Query Ownership:**
   ```typescript
   // Transactions
   const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
   
   // Budgets
   const budget = await Budget.findOne({ _id: req.params.id, userId: req.user.id });
   
   // Goals
   const goal = await FinancialGoal.findOne({ _id: req.params.id, userId: req.user.id });
   ```
3. **Anti-Enumeration 404 Response:** If User B attempts to access, update, or delete User A's resource, the API returns **HTTP 404 NOT_FOUND** (not 403 Forbidden), preventing attackers from probing for the existence of valid IDs.
4. **Mass Assignment Protection:** `userId` and `_id` values submitted in request bodies are ignored; documents are instantiated with `userId: req.user.id`.

---

## 4. Input Validation & Parameter Guarding

1. **MongoDB ObjectId Format Guarding (`validateObjectId.ts`):**
   - All route parameters accepting an `:id` are guarded by `validateObjectId('id')`.
   - Rejects non-hexadecimal strings with **HTTP 400 INVALID_ID_FORMAT** before Mongoose query compilation, preventing unhandled `CastError` 500 exceptions.
2. **Numeric Boundary Enforcement:**
   - Transaction amounts are validated: `!isNaN(amount) && Number.isFinite(amount) && amount > 0 && amount <= 100,000,000`.
   - Completely eliminates `NaN`, `Infinity`, negative numbers, or integer overflow injection.
3. **Enum & Schema Constraints:**
   - Transaction `type` is constrained to `['income', 'expense']`.
   - Transaction `transactionType` is constrained to `['income', 'expense', 'refund', 'transfer']`.
   - Currency is constrained to `['INR', 'USD', 'EUR', 'GBP']`.

---

## 5. File Upload Security Architecture

The financial statement ingestion pipeline adheres to strict upload defense standards:
1. **In-Memory Storage (`multer.memoryStorage()`):** Uploaded files are buffered in memory during parsing and garbage collected immediately after staging. Zero temporary files are written to host disk, preventing local file inclusion (LFI) or disk-filling attacks.
2. **Strict Size Ceiling:** Enforces an unbypassable 10 MB limit (`MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`). Payloads exceeding 10 MB return **HTTP 400 FILE_TOO_LARGE**.
3. **Magic Byte Inspection (`validateMagicBytes`):**
   - PDF files must begin with `%PDF` (`0x25, 0x50, 0x44, 0x46`).
   - Excel workbooks must begin with PKZip signature (`0x50, 0x4B, 0x03, 0x04`).
   - Windows PE (`MZ`) and Linux ELF binaries disguised with `.csv` or `.pdf` extensions are rejected immediately.
   - CSV files are scanned for binary null bytes (`0x00`).
4. **Filename Sanitization (`sanitizeFilename`):**
   - Strips directory traversal sequences (`../../`, `..\..\`).
   - Strips shell metacharacters (`@`, `$`, `;`, `&`, `|`, `` ` ``).
   - Truncates filenames exceeding 120 characters while preserving valid extensions.

---

## 6. Docker & Infrastructure Security

1. **Internal Service Isolation:**
   - `backend` (port 5000) and `ai-service` (port 8000) are **not published to the host**.
   - Only `frontend` (port 80) is published. All backend API and AI operations communicate strictly over the internal bridge network (`finovax-network`).
2. **Non-Root Container Users:**
   - Backend runs as unprivileged user `node` (UID 1000).
   - AI microservice runs as unprivileged user `appuser` (UID 1000).
3. **Zero Baked Secrets:**
   - `.dockerignore` files prevent `.env`, `.git`, or credential files from entering image layers.
4. **Raw Dataset Exclusion:**
   - Excluded 644 MB raw CSV files from container images, ensuring no training data leakage.
5. **Nginx Hardening:**
   - Injected security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`).
   - Configured `client_max_body_size 12M` to align with the 10 MB application upload limit.

---

## 7. Known Security Limitations & Mitigation Roadmap

| Identified Risk | Risk Severity | Current Mitigation | Production Cloud Recommendation |
| :--- | :--- | :--- | :--- |
| **HTTP Ingress (Port 80)** | Medium | Acceptable for local / staging environments. | Terminate TLS via Cloudflare, Let's Encrypt / Certbot, or AWS ALB on Port 443. |
| **Single-Host Rate Limiter** | Low | `express-rate-limit` in memory (300 req / 15 min). | Connect to Redis-backed distributed store (`rate-limit-redis`) across multiple container replicas. |
| **MongoDB Atlas Global Access**| Low | TLS 1.2+ encryption with strong database user credentials. | Bind MongoDB Atlas Network Access to static production egress IPs. |

