# FinovaX — Phase 5 Initial Audit & Deployment Plan

**Project:** FinovaX — AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Directory:** `E:\Finovax`  
**Phase:** Phase 5 — Docker Containerization, Production Deployment & Viva Defense Preparation  
**Date:** November 20, 2026  
**Auditor / Architect:** Antigravity AI  
**Status:** **AUDIT & PLANNING COMPLETED (NO SOURCE FILES MODIFIED)**

---

## 1. Executive Overview

This audit establishes the technical foundation for **Phase 5: Docker Containerization, Production Orchestration, and Viva Defense Preparation**. In accordance with Phase 5 instructions, this is strictly an inspection and architecture planning report. **No source files have been altered, no existing working functionality has been changed, and no secrets have been exposed.**

### Application Stack Summary
- **Frontend Client:** React 18, Vite 5, TypeScript 5, Tailwind CSS, Recharts, Lucide Icons (27 pages).
- **Backend API Gateway:** Node.js 20+, Express 4, TypeScript 5, Mongoose 9, JWT, Bcrypt (12 domain routers).
- **Database:** MongoDB Atlas (Cloud Replica Set over TLS with SRV records).
- **AI Intelligence Microservice:** Python 3.11, FastAPI, Uvicorn, Scikit-learn, XGBoost, Pandas, NumPy, Joblib (4 ML modules).

---

## 2. Codebase Inspection & Audit Findings (Items 1 to 11)

### 2.1 Entry Points
| Subsystem | Source Entry Point | Build Output Entry Point | Development Runtime Command |
| :--- | :--- | :--- | :--- |
| **Frontend** | `frontend/src/main.tsx` $\to$ `App.tsx` | `frontend/dist/index.html` + assets | `vite` (Port `5173`) |
| **Backend** | `backend/src/index.ts` | `backend/dist/index.js` | `ts-node-dev src/index.ts` (Port `5000`) |
| **AI Service** | `ai-service/main.py` (`app`) | Source executed via Uvicorn | `uvicorn main:app --port 8000` (Port `8000`) |

### 2.2 Dependency and Package Configurations

#### Frontend (`frontend/package.json`)
- **Runtime Dependencies:**
  - `react`: `^18.3.1`
  - `react-dom`: `^18.3.1`
  - `react-router-dom`: `^7.18.4`
  - `recharts`: `^3.10.1`
  - `lucide-react`: `^0.395.0`
- **Development & Build Dependencies:**
  - `vite`: `^5.3.1`
  - `typescript`: `^5.5.2`
  - `@vitejs/plugin-react`: `^4.3.1`
  - `tailwindcss`: `^3.4.4`
  - `postcss`: `^8.4.38`, `autoprefixer`: `^10.4.19`

#### Backend (`backend/package.json`)
- **Runtime Dependencies:**
  - `express`: `^4.19.2`
  - `mongoose`: `^9.11.3`
  - `jsonwebtoken`: `^9.0.3`
  - `bcryptjs`: `^3.0.3`
  - `cookie-parser`: `^1.4.7`
  - `cors`: `^2.8.5`
  - `helmet`: `^8.3.0`
  - `express-rate-limit`: `^8.7.1`
  - `multer`: `^2.5.0`
  - `pdf-parse`: `^2.4.5`
  - `xlsx`: `^0.18.5`
  - `dotenv`: `^16.4.5`
- **Development & Build Dependencies:**
  - `typescript`: `^5.5.2`
  - `ts-node-dev`: `^2.0.0`
  - `supertest`: `^7.3.1`
  - `@types/node`: `^20.14.9`

#### AI Microservice (`ai-service/requirements.txt`)
- `fastapi>=0.111.0`
- `uvicorn[standard]>=0.30.1`
- `pydantic>=2.7.4`
- `python-dotenv>=1.0.1`
- `httpx>=0.27.0`
- `pandas>=2.2.0`
- `numpy>=1.26.0`
- `scikit-learn>=1.5.0`
- `xgboost>=2.0.0`
- `joblib>=1.4.0`
- `scipy>=1.13.0`

### 2.3 Existing Environment Variables (Names Only)
To preserve security, only the environment variable names are audited:

| Service | Environment Variable Names | Default / Purpose |
| :--- | :--- | :--- |
| **Frontend** | `VITE_API_BASE_URL` | Base host for API communication |
| | `VITE_API_URL` | Full API endpoint prefix (defaults to `/api`) |
| | `VITE_AI_SERVICE_URL` | Direct AI microservice URL (defaults to `:8000`) |
| **Backend** | `PORT` | Listening port (defaults to `5000`) |
| | `NODE_ENV` | `development`, `production`, or `test` |
| | `FRONTEND_URL` / `CLIENT_URL` | Allowed CORS origin and cookie domain |
| | `AI_SERVICE_URL` | URL of the Python AI microservice |
| | `MONGODB_URI` | MongoDB Atlas / local connection string |
| | `JWT_SECRET` | Secret key for JWT HMAC signing (min 32 chars in prod) |
| | `JWT_EXPIRES_IN` | Token validity duration (e.g. `7d`) |
| **AI Service**| `PORT` | Listening port (defaults to `8000`) |
| | `HOST` | Bind address (`0.0.0.0` or `127.0.0.1`) |
| | `ENVIRONMENT` | Environment stage (`development` / `production`) |
| | `ADMIN_API_KEY` | Header key for admin retraining trigger |
| | `DEBUG` | FastAPI debug mode flag |
| | `BACKEND_INTERNAL_URL` | Internal callback URL to Node.js backend |
| | `OPENAI_API_KEY` | Optional third-party LLM key |
| | `GEMINI_API_KEY` | Optional third-party LLM key |

### 2.4 Existing API URLs and Frontend Client Configuration
1. **Frontend API Client (`frontend/src/api/client.ts`):**
   ```typescript
   const BASE_URL = import.meta.env.VITE_API_URL || '/api';
   ```
   Because `BASE_URL` defaults to the relative path `/api`, when the frontend is served behind an Nginx reverse proxy, API requests route seamlessly to `/api/*` without cross-origin issues or hardcoded hostnames.
2. **Development Proxy (`frontend/vite.config.ts`):**
   In local development, Vite proxies `/api` $\to$ `http://localhost:5000` and `/ai-api` $\to$ `http://localhost:8000`.
3. **Backend-to-AI Inter-Service Communication (`backend/src/services/aiService.ts`):**
   Backend consumes `ENV.AI_SERVICE_URL`. In Docker Compose, this will resolve via Docker's internal DNS to `http://ai-service:8000`.

### 2.5 MongoDB Atlas Connection Requirements
- **Protocol:** `mongodb+srv://` (DNS SRV record lookup over port 27017 with mandatory TLS/SSL).
- **Password Encoding:** Handled automatically by `sanitizeMongoUri()` in `backend/src/config/db.ts` (converts raw `@` into `%40`).
- **DNS Resolution in Containers:** When running in Alpine Linux containers, DNS lookup for Atlas SRV records (`_mongodb._tcp...`) requires public DNS forwarding (e.g. `8.8.8.8`, `1.1.1.1`).
- **Network Access Whitelist:** The host IP running the Docker containers must be whitelisted on MongoDB Atlas (Network Access). In development/staging, `0.0.0.0/0` is commonly used; in production, a static IP or VPC peering is required.

### 2.6 File Upload and Persistent Storage Requirements
1. **Financial Statements:**
   - Handled via `multer.memoryStorage()` in `backend/src/routes/statements.ts`.
   - Files are stored as temporary memory buffers during parsing; **no permanent or temp disk files are created on the host**.
2. **Active Learning Feedback Data:**
   - User category corrections are appended to `ai-service/data/corrections/category_corrections.json`.
   - **Persistence Requirement:** This directory must be mounted as a Docker named volume (`finovax-ai-corrections`) to prevent active learning corrections from being destroyed when containers restart.
3. **Raw Training Data Exclusion:**
   - `ai-service/data/raw/` contains **644 MB** of historical benchmark data (`creditcard.csv` 150.8 MB + `PS_20174392719_1491204439457_log.csv` 493.5 MB).
   - **Mandatory Action:** Must be placed in `.dockerignore` so Docker build contexts stay lean (< 20 MB).

### 2.7 AI Model Artifact Locations and Loading Mechanisms
- **Artifact Locations:**
  - `ai-service/models/categorization/categorizer_pipeline.joblib` (2.54 MB) — TF-IDF + Classifier.
  - `ai-service/models/fraud/isolation_forest.joblib` (864 KB) — Unsupervised Anomaly Model.
  - `ai-service/models/fraud/fraud_rf.joblib` (1.35 MB) — Supervised Random Forest Classifier.
  - `ai-service/models/fraud/fraud_metrics.json` (6.8 KB) — PaySim evaluation metrics.
  - `ai-service/models/forecasting/forecast_xgb.joblib` (679 bytes) — Baseline & XGBoost artifacts.
  - `ai-service/models/segmentation/kmeans_segmenter.joblib` (3.75 KB) — KMeans clusterer.
  - `ai-service/models/segmentation/scaler.joblib` (735 bytes) — Standard scaler.
- **Loading Mechanism:**
  - Loaded via `joblib.load()` on startup by singleton services in `ai-service/app/services/`.
  - All paths use `os.path.join(os.path.dirname(__file__), "../../models/...")`.
  - When copied to `/app/models` inside the container, all relative paths resolve cleanly.
  - Graceful fallbacks exist in all 4 modules (e.g. rule-based categorization, previous period baseline).

### 2.8 Existing Docker Status
- **Status:** **Zero Dockerfiles or Docker Compose files exist in the repository.**
- **Host Docker Availability:** Docker CLI is not installed or not in PATH in the current host environment. Instructions must account for both local Docker Desktop setups and remote cloud VPS deployments.

### 2.9 Required Ports and Service Topology
- **Public Ingress:** Port `80` (HTTP) / Port `443` (HTTPS) served by Nginx.
- **Internal Microservice Ports:**
  - `frontend`: Port `80` (Nginx container)
  - `backend`: Port `5000` (Node.js container)
  - `ai-service`: Port `8000` (FastAPI container)
- **Database:** Port `27017` (Outbound TLS to MongoDB Atlas)

```
[ Browser / Client ]
        │ (Port 80 / 443)
        ▼
┌────────────────────────────────────────────────────────┐
│                   FRONTEND CONTAINER                   │
│   Nginx Alpine (Static SPA Assets + Reverse Proxy)     │
│   ├── /                 ──> Static React Dist Files    │
│   └── /api/             ──> Proxy Pass to Backend:5000 │
└───────────────────────┬────────────────────────────────┘
                        │ (Internal Docker Bridge)
                        ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND CONTAINER                    │
│   Node.js 20 Express REST API Gateway (Port 5000)      │
│   ├── Auth, Transactions, Budgets, Reports             │
│   ├── In-Memory Statement Ingestion Engine             │
│   ├── Talks to MongoDB Atlas over TLS (Port 27017)     │
│   └── Talks to AI Service over HTTP:8000               │
└───────────────────────┬────────────────────────────────┘
                        │ (Internal Docker Bridge)
                        ▼
┌────────────────────────────────────────────────────────┐
│                  AI SERVICE CONTAINER                  │
│   FastAPI / Uvicorn Python 3.11 Microservice (Port 8000)│
│   ├── Categorizer (TF-IDF + Active Learning)           │
│   ├── Fraud Anomaly Engine (Isolation Forest)          │
│   ├── Spending Forecast (Baseline & Time-Series)       │
│   ├── Persona Clustering (K-Means)                     │
│   └── Volume: /app/data/corrections                    │
└────────────────────────────────────────────────────────┘
```

### 2.10 Production Build Requirements
1. **Frontend:**
   - Multi-stage Docker build:
     - Stage 1: `node:20-alpine` runs `npm ci` and `npm run build` (`tsc && vite build`).
     - Stage 2: `nginx:1.27-alpine` copies `dist/` into `/usr/share/nginx/html` with custom `nginx.conf`.
2. **Backend:**
   - Multi-stage Docker build:
     - Stage 1: `node:20-alpine` runs `npm ci` and `npm run build` (`tsc`).
     - Stage 2: `node:20-alpine` runtime copies `dist/` and runs `npm ci --only=production`.
3. **AI Service:**
   - Single or multi-stage build: `python:3.11-slim`.
   - Install dependencies: `pip install --no-cache-dir -r requirements.txt`.
   - Command: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2`.

### 2.11 Deployment Risks and Security Considerations
1. **Container Resource Allocation:** XGBoost, Scikit-learn, and Pandas require sufficient RAM. The `ai-service` container must be allocated at least 512 MB to 1 GB of RAM to avoid OOM termination.
2. **Docker Context Size:** Without `.dockerignore`, copying `ai-service` will drag 644 MB of CSVs and copying `frontend`/`backend` will drag gigabytes of `node_modules`. Strict `.dockerignore` files are essential.
3. **Production JWT Secret:** In production mode (`NODE_ENV=production`), `backend/src/config/env.ts` enforces `JWT_SECRET.length >= 32` and forbids development placeholder substrings.
4. **CORS and Cookie Constraints:** In production, `sameSite: 'strict'` and `secure: true` are enforced on the `finovax_token` cookie. The frontend and backend must be served under the same origin (via Nginx proxy) or over valid HTTPS.
5. **Non-Root Execution:** Node.js and Python processes should run as unprivileged users (`node` in Node, `appuser` in Python) inside the containers for defense-in-depth container security.

---

## 3. Recommended Architecture Design

### 3.1 Frontend Container (`frontend/Dockerfile`)
```dockerfile
# Stage 1: Build static assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Custom Nginx Configuration (`frontend/nginx.conf`)
```nginx
server {
    listen 80;
    server_name localhost;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Static frontend SPA files
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy backend API
    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 12M;
    }
}
```

### 3.2 Backend Container (`backend/Dockerfile`)
```dockerfile
# Stage 1: TypeScript compilation
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1
CMD ["node", "dist/index.js"]
```

### 3.3 Python AI Microservice Container (`ai-service/Dockerfile`)
```dockerfile
FROM python:3.11-slim
WORKDIR /app

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source, models, and reports
COPY main.py .
COPY app/ ./app/
COPY models/ ./models/
COPY reports/ ./reports/
COPY data/corrections/ ./data/corrections/

# Create non-root user and assign permissions
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 3.4 Docker Compose Orchestration (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: finovax-ai-service
    restart: unless-stopped
    environment:
      - PORT=8000
      - HOST=0.0.0.0
      - ENVIRONMENT=production
      - ADMIN_API_KEY=${ADMIN_API_KEY:-finovax_ai_admin_secret_key_2026}
    volumes:
      - finovax-ai-corrections:/app/data/corrections
    networks:
      - finovax-network
    deploy:
      resources:
        limits:
          memory: 1G

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: finovax-backend
    restart: unless-stopped
    environment:
      - PORT=5000
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-7d}
      - CLIENT_URL=${CLIENT_URL:-http://localhost}
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost}
      - AI_SERVICE_URL=http://ai-service:8000
    depends_on:
      ai-service:
        condition: service_healthy
    networks:
      - finovax-network
    deploy:
      resources:
        limits:
          memory: 512M

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: finovax-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - finovax-network

volumes:
  finovax-ai-corrections:
    name: finovax-ai-corrections

networks:
  finovax-network:
    name: finovax-network
    driver: bridge
```

---

## 4. Preservation & Non-Regression Strategy

To guarantee that containerization does not disturb the existing development workflow:
1. **Zero Disruption to Existing Scripts:**
   - `npm run dev` in `backend`, `npm run dev` in `frontend`, and `uvicorn main:app` in `ai-service` will remain 100% functional for local rapid development.
   - Root launcher scripts `run-all.ps1` and `run-all.bat` remain unchanged.
2. **Parallel Container Configuration:**
   - Docker configuration files (`Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.dockerignore`) will be added as self-contained operational artifacts.
   - No existing application source code (`src/`, `app/`, `models/`) will be refactored or deleted.
3. **Database Integrity:**
   - MongoDB Atlas collections, schema indexes, and user records remain completely intact. The backend container connects to the exact same Atlas cluster as local development.

---

## 5. Phase 5 Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PHASE 5 EXECUTION ROADMAP                         │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 1: Context Isolation & Dockerignore Setup                         │
│         - Create .dockerignore in root, backend, frontend, ai-service  │
│         - Exclude raw CSVs (644 MB), node_modules, .git, venv          │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 2: Container Definitions & Configuration                          │
│         - Author frontend/Dockerfile + frontend/nginx.conf             │
│         - Author backend/Dockerfile                                    │
│         - Author ai-service/Dockerfile                                 │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 3: Multi-Service Compose Orchestration                            │
│         - Author docker-compose.yml with health checks & dependencies  │
│         - Author docker-compose.override.yml or .env.docker template   │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 4: Verification & Smoke Test                                      │
│         - Verify build validation and image sizing                     │
│         - Run existing automated test suites against container configs │
├────────────────────────────────────────────────────────────────────────┤
│ STEP 5: Demonstration & Viva Defense Preparation                       │
│         - Create Comprehensive Viva Defense Guide                      │
│         - Prepare examiner presentation script & architectural diagrams│
│         - Document model trade-offs & empirical validation findings   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Information Needed Before Public Production Deployment

Before pushing to a public cloud provider or domain, the following environment-specific details and approvals are needed from the user:
1. **Target Hosting Infrastructure:**
   - Cloud Provider (e.g. AWS ECS / EC2, Google Cloud Run, DigitalOcean Droplet, Render, Railway, or self-hosted Linux VPS).
2. **Domain Name & SSL/TLS Termination:**
   - Public domain or subdomain (e.g. `finovax.yourdomain.com`).
   - SSL termination method (Let's Encrypt / Certbot, Cloudflare Proxy, or Cloud Load Balancer).
3. **MongoDB Atlas Egress IP Configuration:**
   - Confirmation whether Atlas Network Access should be configured for the cloud provider's static egress IP or `0.0.0.0/0`.
4. **Production Cryptographic Secrets:**
   - A dedicated 64-character random string for `JWT_SECRET`.
   - A secure admin API key for `ADMIN_API_KEY`.
5. **Docker Runtime Environment:**
   - Whether the target machine will run Docker Desktop (Windows/Mac) or Docker Engine (Ubuntu/Debian Linux).

---

## 7. Next Action Confirmation

The initial audit and deployment plan are complete. In accordance with your instructions, **no implementation has begun yet.**

When you are ready, please provide confirmation to proceed with **Step 1 and Step 2: Creating the `.dockerignore` files, Dockerfiles, Nginx configuration, and Docker Compose orchestration**.

