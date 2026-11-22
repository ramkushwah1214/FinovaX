# FinovaX — AI-Powered Personal Finance & Fraud Intelligence Platform

FinovaX is a modern, modular fintech web application designed to help users track cash flows, plan category budgets, achieve financial savings goals, manage recurring payments, and analyze anomalies using genuine ledger analytics.

> **Current Status: Phase 6 — Testing, Security & Production Readiness Complete**  
> End-to-end integration verified across React Frontend, Express Backend, MongoDB Atlas, and FastAPI AI Intelligence microservice. Comprehensive security guards enforce bcrypt 12-round hashing, strict JWT verification, anti-tampering, NaN/Infinity numerical injection rejection, strict user isolation across all ledger records and fraud alerts, and resilient zero-crash fallback if the AI microservice is temporarily unavailable. 100% real database records; zero mock data.


---

## 🚫 CRITICAL RULE: Zero Dummy Data Policy

FinovaX operates under an uncompromising **Zero Dummy Data** architecture:
1. **No Simulated Records**: Newly registered accounts start with an empty financial database. There are no pre-seeded transactions, fake balances, or mock charts.
2. **Mathematically Safe Zero Calculations**: When an account has zero transactions, the application displays clean empty states (e.g., *"No transactions found. Add your first transaction"*), zero balances (`₹0.00`), and a zero-denominator-safe savings rate (`0%`).
3. **Fail-Fast Error Handling**: If MongoDB is unavailable or disconnected, the backend immediately responds with HTTP `503 Service Unavailable` (`DATABASE_UNAVAILABLE`) with actionable instructions. The application never silently falls back to local mock arrays or demo fixtures.
4. **Strict User Ownership**: All transactions, budgets, goals, recurring payments, and fraud alerts are securely bound to verified JWT credentials and isolated by `userId`. Users cannot view, modify, or delete another user's records.

---

## 🔐 Phase 4 Security & Authentication Architecture

### 1. Registration Security
* **Full Name Validation**: 2–100 characters, trimmed.
* **Email Validation**: RFC 5322 regex validation, normalized to lowercase and trimmed.
* **Strong Password Validation**:
  * Minimum 8 characters
  * At least one uppercase letter (`A-Z`)
  * At least one lowercase letter (`a-z`)
  * At least one number or special character (`0-9`, `!@#$%^&*...`)
* **Duplicate Account Protection**: Checks existing email in MongoDB; returns HTTP `409 Conflict` (`USER_EXISTS`).
* **Password Hashing**: 12 rounds of bcrypt salt hashing. Plaintext passwords and hashes are never exposed in API responses or logs.

### 2. Login & Session Security
* **Generic Credential Errors**: Returns generic `401 INVALID_CREDENTIALS` on both non-existent emails and wrong passwords to prevent user enumeration.
* **Rate Limiting**: `express-rate-limit` enforces a maximum of 10 attempts per 15-minute window per IP on `/api/auth/login` and `/api/auth/register` (returns `429 RATE_LIMIT_EXCEEDED`).
* **Secure Cookie Strategy**: Issues signed JWT via an `HttpOnly`, `SameSite=Lax` (development) / `SameSite=Strict` (production), `Secure` (production) cookie named `finovax_token`.
* **Zero Long-Lived LocalStorage**: Tokens are never persisted in browser `localStorage`, neutralizing XSS token theft.
* **Logout & Invalidation**: `POST /api/auth/logout` explicitly clears the `finovax_token` cookie and wipes client-side session state.

### 3. Frontend Route Protection
* **Dedicated Authentication Pages**: Full-page `/login` and `/register` views with interactive strength meters and accessible error alerts.
* **Session Restoration**: On page load or refresh, `AuthContext` calls `GET /api/auth/me` with `credentials: 'include'`. The user is not shown as authenticated until the server confirms the session.
* **Loading State**: An authentic branded spinner is displayed during session verification.
* **Protected Routes**: `<ProtectedRoute>` guards `/`, `/transactions`, `/budgets`, `/goals`, `/bills`, `/fraud`, `/assistant`, `/reports`, and `/settings`. Unauthenticated users are redirected to `/login` with their return path preserved in router state.

### 4. Query Isolation & Parameter Guards
* **Server-Side Identity**: User identity is derived strictly from verified JWT tokens (`req.user.id`). Client-supplied `userId` fields in request bodies or query params are ignored.
* **Database Scoping**: Every CRUD operation scopes queries by `{ _id: id, userId: req.user.id }`.
* **Object ID Validation**: `validateObjectId` middleware validates MongoDB 24-hex-char format on all `/:id` routes, returning `400 INVALID_ID_FORMAT` for malformed IDs.

---

## 📁 System Architecture & Directory Structure

```text
Finovax/
├── package.json                    # Workspace orchestration scripts
├── README.md                       # Comprehensive deployment and setup guide
│
├── backend/                        # Node.js + Express + TypeScript + Mongoose
│   ├── src/
│   │   ├── config/                 # Environment variables & MongoDB connection
│   │   │   ├── env.ts              # Strict env validation & defaults
│   │   │   └── db.ts               # Mongoose connection with lifecycle hooks
│   │   ├── middleware/             # Security and operational guards
│   │   │   ├── auth.ts             # JWT authentication (Cookie + Bearer transport)
│   │   │   ├── checkDbReady.ts     # 503 guard for database readiness
│   │   │   ├── rateLimiter.ts      # Rate limiter for auth endpoints (10 req/15m)
│   │   │   ├── validateObjectId.ts # 400 guard for invalid MongoDB ObjectIds
│   │   │   └── errorHandler.ts     # Centralized error mapping & formatting
│   │   ├── models/                 # Mongoose schemas with finite validation & indexes
│   │   │   ├── User.ts             # User credentials, bcrypt hash & preferences
│   │   │   ├── Transaction.ts      # Inflow/outflow records
│   │   │   ├── Budget.ts           # Monthly category spending caps
│   │   │   ├── FinancialGoal.ts    # Target corpus & deadline milestones
│   │   │   ├── RecurringPayment.ts # Bills, subscriptions, and loan EMIs
│   │   │   └── FraudAlert.ts       # Genuine risk flags & triage status
│   │   ├── controllers/            # Real-time ledger computation & aggregations
│   │   │   ├── authController.ts   # Register, login, logout, me, profile updates
│   │   │   ├── transactionController.ts
│   │   │   ├── budgetController.ts
│   │   │   ├── goalController.ts
│   │   │   ├── recurringPaymentController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── reportsController.ts
│   │   │   └── fraudAlertController.ts
│   │   ├── routes/                 # Express REST router definitions
│   │   │   ├── health.ts           # /api/health probe
│   │   │   ├── auth.ts             # /api/auth (register, login, logout, me, profile)
│   │   │   ├── transactions.ts     # /api/transactions CRUD
│   │   │   ├── budgets.ts          # /api/budgets CRUD
│   │   │   ├── goals.ts            # /api/goals CRUD + contributions
│   │   │   ├── recurringPayments.ts# /api/recurring-payments CRUD + status toggles
│   │   │   ├── dashboard.ts        # /api/dashboard summary & analytics
│   │   │   ├── reports.ts          # /api/reports audit & timeline analytics
│   │   │   └── fraudAlerts.ts      # /api/fraud-alerts triage & resolution
│   │   ├── test/                   # Automated Phase 4 test suite (26 tests)
│   │   │   └── api.test.ts
│   │   └── index.ts                # Express server entry point (Cookie-parser & CORS)
│   ├── .env.example                # Backend environment template
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                       # React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/                    # Centralized, typed HTTP client (credentials: include)
│   │   │   └── client.ts           # In-memory token + HttpOnly cookie handling
│   │   ├── context/
│   │   │   ├── AuthContext.tsx     # Cookie session verification & lifecycle
│   │   │   ├── FinanceContext.tsx  # Dynamic financial state, zero dummy data
│   │   │   └── ThemeContext.tsx    # Light & dark theme provider
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── ProtectedRoute.tsx # Route guard with session loading screen
│   │   │   │   └── AuthModal.tsx      # Modal alternative for in-place actions
│   │   │   └── layout/             # Sidebar, Header, Disconnection Banner
│   │   ├── pages/                  # Auth + Application Pages
│   │   │   ├── Login.tsx           # Dedicated Sign-In page
│   │   │   ├── Register.tsx        # Dedicated Registration page with strength meter
│   │   │   ├── Dashboard.tsx       # Live KPI cards, bar chart, pie chart
│   │   │   ├── Transactions.tsx    # Live ledger, filters, sorting, search, pagination
│   │   │   ├── Budgets.tsx         # Category allocations with real-time spent
│   │   │   ├── Goals.tsx           # Milestone targets with live contribution tracking
│   │   │   ├── Bills.tsx           # Recurring payment reminders & status updates
│   │   │   ├── FraudIntelligence.tsx# Incident investigation & resolution triage
│   │   │   ├── Assistant.tsx       # AI queries reasoned strictly against user records
│   │   │   ├── Reports.tsx         # Executive summaries, area charts, CSV exports
│   │   │   └── Settings.tsx        # Profile preferences & session management
│   │   └── types/index.ts          # Strongly typed domain entities
│   ├── .env.example                # Frontend environment template
│   └── package.json
│
└── ai-service/                     # Python + FastAPI (ML Anomaly Service)
    ├── requirements.txt
    └── main.py
```

---

## 🛠️ Prerequisites for Windows

1. **Node.js** (v18.0.0 or higher) — [Download Node.js](https://nodejs.org/)
2. **PowerShell** (Pre-installed on Windows 10/11)
3. **MongoDB**:
   - **Option A (Recommended: MongoDB Atlas Free Cloud Tier)**: [mongodb.com/atlas](https://www.mongodb.com/atlas).
   - **Option B (Local Community Server)**: [Download MongoDB Community Server](https://www.mongodb.com/try/download/community).

---

## ⚙️ Step-by-Step Windows PowerShell Installation

Open Windows PowerShell and navigate to the project directory:

```powershell
cd E:\Finovax
```

### 1. Environment Files Configuration

```powershell
# Backend configuration
Copy-Item backend\.env.example backend\.env

# Frontend configuration
Copy-Item frontend\.env.example frontend\.env
```

Configure `backend\.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000

# MongoDB Connection String:
MONGODB_URI=mongodb://localhost:27017/finovax
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/finovax?retryWrites=true&w=majority

# JWT Authentication Secret
JWT_SECRET=your_secure_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d
```

### 2. Install Dependencies

```powershell
# Backend dependencies
cd E:\Finovax\backend
npm.cmd install

# Frontend dependencies
cd E:\Finovax\frontend
npm.cmd install
```

---

---

## 📥 Phase 2: Smart Bank & Google Pay Statement Import Engine

FinovaX features an enterprise-grade, multi-format financial statement processing engine designed for Indian banking standards, digital UPI statements, and strict accounting compliance:

### 1. Supported Document Formats
* **CSV Statements**: Auto-detects column layouts (Date, Value Date, Narration, Description, Debit, Credit, Amount, UTR/Ref, Balance). Handles Indian lakh formatting (`₹ 1,50,000.50`), commas within quoted strings, negative brackets `(1,200.00)`, and DD/MM/YYYY date structures. Unparsed rows are captured with line numbers and reasons.
* **Excel Workbooks (`.xlsx` / `.xls`)**: Scans sheets for transaction tables (`Transactions`, `Statement`, `Sheet1`), bypasses non-tabular metadata rows (account number, branch summary), converts 5-digit Excel serial dates (`44927` -> `2023-01-01`), and enforces a 10,000 row DoS safety ceiling.
* **Text-Based Bank PDFs**: Dedicated parser strategies for major Indian banks:
  * **HDFC Bank**: Multi-column withdrawal, deposit, and balance patterns.
  * **State Bank of India (SBI)**: Tabular passbook and e-statement layouts.
  * **ICICI Bank**: Transaction indicators (`Cr`/`Dr`) and UPI descriptions.
  * **Axis Bank**: Statement rows with UTR reference tokens.
  * **Generic Fallback**: High-precision regular expression extractor for standard regional bank formats.
* **Scanned PDF Detection (`OCR_REQUIRED`)**: If a PDF document lacks a digital text layer (scanned paper or photo), the system raises a structured `OCR_REQUIRED` diagnostic rather than failing silently, providing an `OcrAdapter` interface for optical character recognition.
* **Google Pay Statements (UPI)**: Parses Google Pay transaction activity PDFs:
  * Extracts **12-digit UPI Transaction Reference Numbers (UTR)**.
  * Identifies counterparties (*Paid to XYZ* = debit, *Received from ABC* = credit).
  * Automatically tags payment method as `Google Pay (UPI)`.
  * **Limitation Transparency**: States upfront that GPay statements capture UPI transfers only, do not contain bank account balances, and mask beneficiary account numbers for user privacy.

### 2. File Upload Security & Memory-Only Storage
* **10 MB Strict Limit**: Rejects oversized statement uploads.
* **Magic Bytes Validation**: Verifies file headers against true binary signatures (`%PDF` for PDFs, `PK\x03\x04` for XLSX, OLE header for XLS), instantly rejecting disguised Windows executables (`MZ`) or Linux binaries (`ELF`).
* **Path Traversal Sanitization**: Strips directory paths, null bytes, and unsafe characters from uploaded filenames.
* **In-Memory Streaming**: All statement parsing occurs strictly in server RAM buffers (`multer.memoryStorage()`). Raw, unencrypted financial files are never permanently saved or exposed to the public filesystem.

### 3. Accounting Rules & Clean Merchant Normalization
* **Refund Rule**: Refunds, cashback, and reversals are tagged `transactionType: 'refund'` and **never counted as new income**.
* **Internal Transfer Rule**: Transfers between user's own accounts are tagged `transactionType: 'transfer'` and **excluded from income and expense metrics**.
* **Clean Merchant Tokenizer**: Normalizes complex bank narrations (e.g., `UPI/412345678901/SWIGGY/swiggy@icici/UPI` -> `Swiggy`, `POS 43210987 STARBUCKS BANGALORE` -> `Starbucks Bangalore`).

### 4. Multi-Tier Duplicate Detection Engine
1. **Tier 1 (Exact Reference Match)**: Compares 12-digit UPI/UTR reference IDs against user's historical database records.
2. **Tier 2 (Same-Day / Amount / Direction)**: Identifies matches on identical calendar dates, exact amounts (within $\pm 0.01$), and inflow/outflow direction.
3. **Tier 3 (Intra-Batch Duplication)**: Detects duplicate transactions appearing within the same uploaded statement file.
* *Suspected duplicates are flagged for user review (`isDuplicate: true`) and never deleted silently.*

### 5. Two-Stage Preview & Ledger Commit Workflow
* Uploaded statements create a `StatementImport` batch with status `preview_ready`.
* **Zero Premature Insertion**: No transactions are written to the `Transaction` collection prior to user review.
* Users can modify categories, adjust merchants, or toggle `userExcluded` to exclude specific rows.
* On confirmation, eligible transactions are atomically committed to the live database, updating the user's dashboard and balance in real-time.
* Fully idempotent: confirmed imports cannot be re-confirmed.

---

## 🌐 MongoDB Atlas IP Whitelisting & Connection Guide

FinovaX uses MongoDB Atlas for cloud persistence. If your backend logs indicate:
`❌ [Database Connection Error]: MongoDB Atlas rejected connection.`
`👉 Diagnostic: Current IP address is not whitelisted on MongoDB Atlas Network Access.`

Follow these official steps to whitelist your current IP address:

1. **Log in to MongoDB Atlas**: Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign in.
2. **Select your Project & Cluster**: Choose the FinovaX project cluster.
3. **Navigate to Network Access**: In the left sidebar under **Security**, click **Network Access**.
4. **Add IP Address**:
   - Click the green **"Add IP Address"** button.
   - Click **"Add Current IP Address"** to authorize your development machine's current public IP address.
   - *(Optional for dynamic IPs / mobile hotspots during testing)*: Set entry comment to `Development Workstation`.
   - > ⚠️ **Security Warning**: Do **not** leave `0.0.0.0/0` (Allow Access from Anywhere) permanently enabled in production. Always restrict access to your application server's static IP or VPC peering.
5. **Confirm**: Click **Confirm**. Status will change to *Active* within 1–2 minutes.
6. **Backend Auto-Reconnect**: The FinovaX backend automatically detects network availability and re-establishes the connection without requiring a manual server restart.

---

## ⚡ Running the Microservices Locally

Open three separate Windows PowerShell terminals to launch the entire platform:

### Terminal 1: FastAPI AI Intelligence Microservice
```powershell
cd E:\Finovax\ai-service
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
> AI service running at: **`http://localhost:8000`**  
> Health probe: **`http://localhost:8000/health`**  
> Interactive Docs: **`http://localhost:8000/docs`**

### Terminal 2: Backend Express REST API + MongoDB Atlas
```powershell
cd E:\Finovax\backend
npm.cmd run dev
```
> Server runs at: **`http://localhost:5000`**  
> System Health & Service probe: **`http://localhost:5000/api/health`**  
> (Verifies MongoDB Atlas connectivity and FastAPI AI service status in real-time)

### Terminal 3: Frontend React Web Application
```powershell
cd E:\Finovax\frontend
npm.cmd run dev
```
> Web UI runs at: **`http://localhost:5173`**  
> Sign-in: **`http://localhost:5173/login`**  
> Registration: **`http://localhost:5173/register`**

---

## 🧪 Automated Testing Suite

FinovaX features end-to-end automated test suites for both backend and AI intelligence services:

### 1. Express Backend & MongoDB End-to-End Suite (71 Tests)
```powershell
cd E:\Finovax\backend
cmd /c npm test
```

Verifies:
* **System Readiness**: Health check probes, uptime, and verified connectivity of MongoDB and FastAPI AI service.
* **Security & Auth**: RFC 5322 email regex, strong password rules, bcrypt 12-round hashing, JWT cryptographic signing, token expiration, tamper rejection, anti-enumeration generic 401s, and HttpOnly session cookies.
* **Input Validation & Safety**: Rejection of NaN, Infinity, negative values, and out-of-bounds numbers across all domain models and endpoints.
* **Zero Dummy Data**: Validates that brand-new accounts with zero transactions return safe mathematical defaults (`₹0.00` balances, `0%` savings rate, zero-division protected).
* **AI Anomaly Detection**: Automatic real-time risk assessment via FastAPI AI service, generating genuine `FraudAlert` records for high-risk transactions.
* **Authorized AI Risk Analysis**: `POST /api/transactions/:id/analyze` returns verified risk indicators, reasons, and transparency disclaimer.
* **Strict User Isolation**: Complete cross-user segregation preventing unauthorized read, update, delete, or AI analysis of other users' records.

### 2. Statement Import & Parsing Engine Suite (52 Tests)
```powershell
cd E:\Finovax\backend
cmd /c npm run test:statement
```

Verifies:
* **File Validation & Security**: 10 MB file ceiling, magic bytes header validation (`%PDF`, `PK\x03\x04`), binary null-byte rejection in CSVs, instant rejection of disguised executables (`MZ`, `ELF`), and path traversal filename sanitization.
* **CSV Parsing**: Autodetection of column headers, RFC 4180 quoted string preservation, Indian number formatting (`1,50,000.50`), and tracking of unparsed rows with row numbers and exact reasons.
* **Excel Workbook Parsing**: Header detection beneath bank metadata/branch rows, serial date conversion (`44927` -> `2023-01-01`), and sheet scanning.
* **Bank PDF & OCR Diagnostics**: Dedicated bank strategies (HDFC, SBI, ICICI, Axis) and structured `OCR_REQUIRED` error generation for scanned/image-only PDFs.
* **Google Pay UPI Extraction**: Extraction of 12-digit UPI transaction reference numbers (UTR), counterparty direction (Paid to vs. Received from), and disclosure verification.
* **Accounting Integrity**: Guarantees that refunds are never counted as new income, and own-account transfers are never counted as income or expense.
* **Multi-Tier Duplicate Detection**: Exact reference ID matching, fuzzy same-day/amount/direction matching, and intra-batch duplicate detection within the same statement file.
* **Staged Workflow Lifecycle**: Ensures zero premature database writes, verifies target transaction updates, confirms idempotent ledger insertions, and validates batch cancellation.

### 3. FastAPI AI Service Unit & Anomaly Suite (9 Tests)
```powershell
cd E:\Finovax\ai-service
.\venv\Scripts\python.exe -m unittest test_ai_service.py
```

Verifies:
* Statistical z-score outlier calculations and historical user baseline ratio tests.
* Strict Pydantic input validation (rejects NaN, negative values, and invalid transaction types with HTTP 422).
* Cold-start heuristic evaluation for new accounts without historical records.
* Batch transaction evaluation.
* Mandatory ethical disclaimer and transparency notice on all risk predictions (no fabricated model accuracy claims).

### 3. Production Compilation Verification
```powershell
# Compile backend TypeScript
cd E:\Finovax\backend
cmd /c npm run build

# Compile and bundle frontend with Vite
cd E:\Finovax\frontend
cmd /c npm run build
```

---

## 🔒 Production Readiness & Configuration Checklist

| Area | Status | Implementation Details |
| :--- | :---: | :--- |
| **MongoDB Atlas** | ✅ Connected | DNS SRV resolution (`8.8.8.8`, `1.1.1.1`), strict query sanitization, fail-fast 503 guard on network disruption. |
| **Password Security** | ✅ Verified | Bcrypt 12 salt rounds, minimum 8 characters with mixed case + digits + symbols, passwords never logged. |
| **Token Transport** | ✅ Verified | HttpOnly, SameSite cookies with production `Secure` flag. Zero persistent credentials in `localStorage`. |
| **Numeric Validation** | ✅ Verified | Strict `Number.isFinite()` and positive boundary checks rejecting `NaN`, `Infinity`, and negative values. |
| **AI Reliability** | ✅ Verified | 2.5s timeout with `AbortController`, graceful degradation if AI service is offline (zero application crashes). |
| **User Data Isolation**| ✅ Verified | Database queries scoped strictly by `{ _id, userId: req.user.id }`; verified with cross-user integration tests. |
| **Secrets & Keys** | ✅ Protected | `.gitignore` explicitly prevents `.env`, `**/.env`, `*.pem`, `*.key`, and credential files from being committed. |

---

## 📄 License
This project is proprietary and confidential. Built as part of the FinovaX Fintech Engineering Series.

