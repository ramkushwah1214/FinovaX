# FinovaX — Production Deployment & Operations Guide

**Platform:** FinovaX (AI-Powered Personal Finance & Fraud Intelligence Platform)  
**Deployment Model:** Multi-Container Docker Compose Orchestration  
**Target Environment:** Local Workstations, Linux Cloud VMs (Ubuntu 22.04/24.04), AWS EC2, or DigitalOcean Droplets.  

---

## 1. Prerequisites

Before deploying FinovaX, ensure your host environment meets the following specifications:
- **Operating System:** Windows 10/11 (with WSL 2 and Docker Desktop) OR Ubuntu 22.04/24.04 LTS Linux OR macOS.
- **Docker Engine:** Version $\ge$ 24.0.0 (Verified with Docker Engine 29.9.3).
- **Docker Compose:** Version $\ge$ v2.20.0 (Verified with Docker Compose v5.7.0).
- **Available System Memory:** Minimum 4.0 GiB allocated to Docker.
- **Outbound Port 27017:** Egress permitted to connect to MongoDB Atlas Cloud.

---

## 2. Environment Configuration

### Step 1: Clone or Navigate to the Repository
```powershell
Set-Location "E:\Finovax"
```

### Step 2: Configure Environment Files
FinovaX utilizes a secure configuration model where credentials are kept in service-specific `.env` files that are automatically loaded by Docker Compose without baking them into image layers.

Verify the presence of:
1. `backend/.env`:
   ```ini
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=http://localhost
   CLIENT_URL=http://localhost
   AI_SERVICE_URL=http://ai-service:8000
   MONGODB_URI=mongodb+srv://<username>:<password>@finovax.bhcqkia.mongodb.net/finovax?retryWrites=true&w=majority
   JWT_SECRET=your_cryptographically_secure_random_64_character_hex_string_here
   JWT_EXPIRES_IN=7d
   ```
2. `ai-service/.env`:
   ```ini
   PORT=8000
   HOST=0.0.0.0
   ENVIRONMENT=production
   ADMIN_API_KEY=finovax_ai_admin_secret_key_2026
   ```

*Tip: A template file [`.env.example`](file:///E:/Finovax/.env.example) is available in the root directory.*

---

## 3. Deployment Commands

### 3.1 Build Container Images
Build all three images using multi-stage compilation:
```powershell
docker compose build
```

### 3.2 Launch Containers in Detached Mode
Launch the multi-tier microservice mesh:
```powershell
docker compose up -d
```

### 3.3 Verify Container Status
Confirm all three containers report `healthy`:
```powershell
docker compose ps
```

Expected output:
```
NAME                 IMAGE                COMMAND                  SERVICE      STATUS                    PORTS
finovax-ai-service   finovax-ai-service   "uvicorn main:app --…"   ai-service   Up 10 minutes (healthy)   8000/tcp
finovax-backend      finovax-backend      "docker-entrypoint.s…"   backend      Up 10 minutes (healthy)   5000/tcp
finovax-frontend     finovax-frontend     "/docker-entrypoint.…"   frontend     Up 10 minutes (healthy)   0.0.0.0:80->80/tcp
```

---

## 4. Health & Verification Probes

### 4.1 Probe Frontend Web Ingress
```powershell
curl -I http://localhost
```
*Expected: `HTTP/1.1 200 OK` from `nginx/1.27.5`.*

### 4.2 Probe Backend & Database Health
```powershell
curl http://localhost/api/health
```
*Expected: `{"status":"ok","database":{"status":"connected","connected":true,"readyState":1},"aiService":{"status":"ok","connected":true}}`.*

### 4.3 Inspect AI Microservice Readiness
```powershell
docker compose exec ai-service curl -s http://localhost:8000/health
```
*Expected: `{"status":"ok","models_active":{"categorization":true,"fraud_detection":true,"forecasting":true,"segmentation":true}}`.*

---

## 5. Operations & Log Monitoring

### View Combined Live Logs
```powershell
docker compose logs -f
```

### View Individual Service Logs
```powershell
# Backend API logs
docker compose logs backend --tail=100

# AI service logs
docker compose logs ai-service --tail=100

# Frontend Nginx logs
docker compose logs frontend --tail=100
```

---

## 6. Shutdown & Maintenance

### Graceful Shutdown (Preserves Persistent Volumes)
```powershell
docker compose down
```

### Restart Services
```powershell
docker compose restart
```

### Complete Reset (Purges Containers, Networks, and Volumes)
> [!CAUTION]
> This command will permanently erase the `finovax-ai-corrections` volume. Use only when doing a full clean install.
```powershell
docker compose down -v
```

---

## 7. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Port 80 Already Bound** | Windows IIS, Apache, Skype, or local Nginx is running on port 80. | Stop the conflicting service, or change `docker-compose.yml` frontend port mapping to `"8080:80"`. Access via `http://localhost:8080`. |
| **MongoDB Atlas Connection Timeout** | Current host public IP is not in MongoDB Atlas Network Access whitelist. | Go to **cloud.mongodb.com** $\to$ **Network Access** $\to$ **Add IP Address** $\to$ Click **Add Current IP Address** (or `0.0.0.0/0`). |
| **Backend Reports 503 DATABASE_UNAVAILABLE** | MongoDB Atlas connection has dropped or failed during request processing. | Verify Atlas cluster status and check `docker compose logs backend` for connection string errors. |
| **AI Container Exits with Error 137** | WSL 2 memory exhaustion during high-volume inference. | Create or edit `%USERPROFILE%\.wslconfig` and allocate at least 4 GB RAM: `[wsl2]` `memory=4GB`. |
| **`docker` command not recognized** | Docker Desktop bin directory is missing from host PowerShell `$env:PATH`. | Run: `$env:PATH = "C:\Users\Victus\AppData\Local\Programs\DockerDesktop\resources\bin;$env:PATH"`. |

