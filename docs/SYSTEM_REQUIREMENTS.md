# FinovaX — System Requirements Specification

**Project Title:** FinovaX: AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Document Version:** 1.0.0  
**Date:** November 2026  

---

## 1. Hardware Requirements

### 1.1 Development & Demonstration Workstation (Current Host Specs)
- **Processor:** 64-bit multi-core processor (x86_64 / amd64), 6+ cores recommended (e.g. AMD Ryzen 5/7 or Intel Core i5/i7).
- **Physical RAM:** Minimum 8 GB (16 GB recommended for running Docker Desktop, WSL 2, IDE, and browsers simultaneously).
- **Available Docker Memory:** Minimum 4.0 GiB allocated to Docker / WSL 2 (FinovaX container stack consumes ~1.75 GiB).
- **Disk Storage:** Minimum 15 GB available SSD storage (for Docker base images, node_modules, and model artifacts).
- **Network Interface:** Active Internet connection (required for MongoDB Atlas cloud connectivity over TLS port 27017 and initial Docker base image pulls).

### 1.2 Target Cloud Production Environment (Single-Node VPS / Cloud VM)
- **Instance Type:** e.g. AWS `t3.medium` / `t4g.medium`, DigitalOcean Basic Droplet, or GCP `e2-medium`.
- **vCPU:** 2 vCPUs.
- **System Memory:** 4 GB RAM (with 2 GB swap enabled).
- **Storage:** 25 GB NVMe / SSD.
- **Egress Ports:** Port 27017 outbound permitted to MongoDB Atlas.

### 1.3 Client Browser Requirements
- Modern web browser with ECMAScript 2022+ and WebAssembly support:
  - Google Chrome $\ge$ 110
  - Mozilla Firefox $\ge$ 115
  - Microsoft Edge $\ge$ 110
  - Apple Safari $\ge$ 16.4
- Display Resolution: Responsive design supports mobile (360x640), tablet (768x1024), and desktop (1920x1080).

---

## 2. Software Requirements

### 2.1 Host Operating System & Container Engine
- **Host OS:** Windows 10/11 Pro, Enterprise, or Home (Build 19041+) with WSL 2 backend; OR Ubuntu 22.04/24.04 LTS Linux; OR macOS Ventura+.
- **Virtualization Backend:** Windows Subsystem for Linux 2 (WSL 2) with Linux kernel 5.15+.
- **Container Engine:** Docker Engine $\ge$ 24.0 (Installed version: Docker Engine 29.9.3 / Docker Desktop 4.30+).
- **Container Orchestration:** Docker Compose $\ge$ v2.20 (Installed version: Docker Compose v5.7.0).

### 2.2 Local Development Prerequisites (Non-Docker Local Mode)
- **Node.js Runtime:** Node.js $\ge$ 20.14.0 (Active LTS: Node 20 or Node 24).
- **Package Manager:** npm $\ge$ 10.0.0.
- **Python Environment:** Python 3.10 or 3.11 (Active version: Python 3.11 with `venv` module).
- **Git:** Git $\ge$ 2.40.0.

---

## 3. Technology Stack & Component Architecture

| Subsystem | Layer | Technologies & Frameworks | Role |
| :--- | :--- | :--- | :--- |
| **Frontend** | Presentation | React 18.3.1, TypeScript 5.5.2, Vite 5.3.1, Tailwind CSS 3.4.4 | Single Page Application (27 interactive views) |
| **Frontend Web Server** | Ingress | Nginx 1.27 Alpine | Static asset delivery, Gzip, reverse proxy to backend |
| **Backend** | API Gateway | Node.js 20, Express 4.19.2, TypeScript 5.5.2 | REST API, statement parsing, auth, business logic |
| **Database** | Persistence | MongoDB Atlas (Cloud Replica Set over TLS 1.2+) | Document database (13 Mongoose collections) |
| **AI / ML Service** | Inference | Python 3.11, FastAPI 0.111.0, Uvicorn 0.54.0 | ML categorization, fraud triage, forecast, persona |
| **Data Science** | Modeling | Scikit-learn 1.9.1, XGBoost 3.2.0, Pandas 3.1.1, NumPy 2.4.6 | Model training, evaluation, vectorization |
| **DevOps** | Containerization | Docker Engine 29, Docker Compose 5, Alpine Linux | Multi-stage builds, isolated bridge network |

---

## 4. Software Dependencies

### 4.1 Frontend Dependencies (`frontend/package.json`)
```json
{
  "dependencies": {
    "lucide-react": "^0.395.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.18.4",
    "recharts": "^3.10.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.2",
    "vite": "^5.3.1"
  }
}
```

### 4.2 Backend Dependencies (`backend/package.json`)
```json
{
  "dependencies": {
    "@types/multer": "^2.3.0",
    "@types/pdf-parse": "^1.1.5",
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^8.7.1",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.11.3",
    "multer": "^2.5.0",
    "pdf-parse": "^2.4.5",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.14.9",
    "@types/supertest": "^7.2.1",
    "supertest": "^7.3.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.5.2"
  }
}
```

### 4.3 AI Microservice Dependencies (`ai-service/requirements.txt`)
```text
fastapi>=0.111.0
uvicorn[standard]>=0.30.1
pydantic>=2.7.4
python-dotenv>=1.0.1
httpx>=0.27.0
pandas>=2.2.0
numpy>=1.26.0
scikit-learn>=1.5.0
xgboost>=2.0.0
joblib>=1.4.0
scipy>=1.13.0
```

---

## 5. Runtime & Operational Constraints

### 5.1 Port Allocation
| Port Number | Target Service | Scope | Protocol |
| :--- | :--- | :--- | :--- |
| **80** | `frontend` (Nginx) | Host & Public Ingress | HTTP (TCP) |
| **5000** | `backend` (Express) | Internal Docker Network only | HTTP (TCP) |
| **8000** | `ai-service` (FastAPI) | Internal Docker Network only | HTTP (TCP) |
| **27017** | MongoDB Atlas | Outbound to Cloud | TCP over TLS |

### 5.2 Container Resource Ceilings (`docker-compose.yml`)
- `finovax-ai-service`: **1.0 GiB RAM ceiling** (safeguards against XGBoost / Scikit-learn memory spikes).
- `finovax-backend`: **512 MiB RAM ceiling** (Node.js heap size optimized).
- `finovax-frontend`: **256 MiB RAM ceiling** (Nginx static delivery is extremely low overhead).
- Total stack memory footprint: **~1.75 GiB maximum**.

### 5.3 Storage & Volumes
- `finovax-ai-corrections`: Persistent Docker named volume mounted to `/app/data/corrections` in the AI container. Retains user active learning corrections across container lifecycles.

