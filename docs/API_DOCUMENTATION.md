# FinovaX — REST API Specification & Endpoint Documentation

**Service Base URL (Production / Docker):** `http://localhost/api`  
**Direct Backend URL:** `http://localhost:5000/api`  
**Internal AI Microservice URL:** `http://ai-service:8000`  
**Authentication Scheme:** HttpOnly Secure Cookie (`finovax_token`) OR HTTP Bearer Token (`Authorization: Bearer <token>`)  

---

## Standard Response Envelopes

### Success Envelope
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Envelope
```json
{
  "status": "error",
  "code": "ERROR_CODE_STRING",
  "message": "Human readable description of the error"
}
```

---

## 1. System & Health Endpoints

### 1.1 Root API Welcome
- **Route:** `GET /`
- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "message": "Welcome to FinovaX Backend REST API",
    "version": "1.0.0",
    "documentation": "/api/health"
  }
  ```

### 1.2 System Health & Subsystem Readiness
- **Route:** `GET /api/health`
- **Access:** Public
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "service": "finovax-backend",
    "version": "1.0.0",
    "uptime": 120,
    "timestamp": "2026-11-20T14:22:03.401Z",
    "backend": { "status": "ok", "uptime": 120, "version": "1.0.0" },
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

---

## 2. Authentication Endpoints

### 2.1 Register New Account
- **Route:** `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Kushwah Ram",
    "email": "kushwahram989@gmail.com",
    "password": "FinovaX#2026Password",
    "currency": "INR",
    "monthlyIncome": 75000
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Account registered successfully",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "673da123456789abcdef0123",
        "name": "Kushwah Ram",
        "email": "kushwahram989@gmail.com",
        "currency": "INR",
        "monthlyIncome": 75000,
        "notifications": { "fraudAlerts": true, "budgetThresholds": true },
        "createdAt": "2026-11-20T12:00:00.000Z"
      }
    }
  }
  ```
- **Error Responses:**
  - `400 WEAK_PASSWORD`: Password does not meet 8+ char, mixed-case, digit, and symbol criteria.
  - `409 USER_EXISTS`: An account with this email already exists.

### 2.2 Login
- **Route:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "kushwahram989@gmail.com",
    "password": "FinovaX#2026Password"
  }
  ```
- **Response (200 OK):** Sets `Set-Cookie: finovax_token=...; HttpOnly; SameSite=Strict` and returns user profile.

### 2.3 Get Current Authenticated Profile
- **Route:** `GET /api/auth/me`
- **Access:** Private (Authenticated)
- **Response (200 OK):** Returns current user record (password hash is omitted).

### 2.4 Logout
- **Route:** `POST /api/auth/logout`
- **Access:** Public
- **Response (200 OK):** Clears authentication cookie.

### 2.5 Permanently Delete Account & Cascade Financial Purge
- **Route:** `DELETE /api/auth/account`
- **Access:** Private (Requires valid JWT session via HttpOnly Cookie or Bearer header)
- **Security Protections:**
  - Authenticated user ID is derived strictly from verified JWT middleware (`req.user.id`). Client cannot supply a target user ID.
  - Re-authentication: Requires user's current valid password, verified via `bcrypt.compare`.
  - Explicit Confirmation: Requires `confirmText === "DELETE"`.
  - Atomicity: Uses a MongoDB replica set transaction session where supported.
- **Request Body:**
  ```json
  {
    "password": "CurrentUserPassword123!",
    "confirmText": "DELETE"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Your FinovaX account and all associated financial records have been permanently deleted.",
    "data": {
      "deleted": true
    }
  }
  ```
- **Error Responses:**
  - `401 UNAUTHORIZED`: Missing, invalid, or expired authentication token.
  - `400 INVALID_CONFIRMATION_TEXT`: `confirmText` is not uppercase `"DELETE"`.
  - `400 PASSWORD_REQUIRED`: Password field is omitted.
  - `401 INVALID_CREDENTIALS`: Password does not match password hash. Aborts without modifying data.
  - `404 USER_NOT_FOUND`: Target user document not found in MongoDB.
- **Cascading Purge Scope:**
  1. Revokes Account Aggregator consents and connections (`status: 'revoked'`).
  2. Permanently purges user documents across all 12 financial collections: `FraudAlert`, `FinancialInsight`, `SpendingForecast`, `SpendingSegment`, `Budget`, `FinancialGoal`, `RecurringPayment`, `Transaction`, `StatementImport`, `BankAccount`, `ConsentRecord`, `BankConnection`.
  3. Deletes the `User` account document.
  4. Clears authentication cookies (`finovax_token`, `token`).
  5. Preserves global AI models and active-learning correction volume (`finovax-ai-corrections`).

---

## 3. Transaction Endpoints

### 3.1 List Transactions (Paginated & Filtered)
- **Route:** `GET /api/transactions`
- **Access:** Private
- **Query Parameters:** `page=1&limit=20&type=expense&category=Food&startDate=2026-11-01&endDate=2026-11-30&search=Swiggy`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "transactions": [
        {
          "id": "673da987654321fedcba0987",
          "title": "Swiggy Bangalore Order",
          "amount": 420.50,
          "type": "expense",
          "category": "Food",
          "date": "2026-11-20",
          "paymentMethod": "UPI",
          "description": "Lunch with team",
          "createdAt": "2026-11-20T13:45:00.000Z"
        }
      ],
      "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
    }
  }
  ```

### 3.2 Create Manual Transaction
- **Route:** `POST /api/transactions`
- **Access:** Private
- **Request Body:**
  ```json
  {
    "title": "Starbucks Coffee",
    "amount": 350,
    "type": "expense",
    "category": "Food",
    "date": "2026-11-20T14:00:00.000Z",
    "paymentMethod": "UPI"
  }
  ```
- **Response (201 Created):** Returns created transaction and any triggered `fraudAlert`.

### 3.3 Get Transaction by ID
- **Route:** `GET /api/transactions/:id`
- **Access:** Private (Scoped to authenticated user)

### 3.4 Update Transaction (PUT & PATCH Compatibility)
- **Routes:** `PUT /api/transactions/:id` AND `PATCH /api/transactions/:id`
- **Access:** Private
- **Request Body:** Partial or complete transaction fields (`title`, `amount`, `category`, `date`, `type`).
- **Response (200 OK):** Returns updated transaction.
- **Error Responses:**
  - `400 INVALID_ID_FORMAT`: `:id` is not a valid 24-character hexadecimal MongoDB ObjectId.
  - `400 INVALID_AMOUNT`: Amount is not a finite positive number $\le 100,000,000$.
  - `404 TRANSACTION_NOT_FOUND`: Record does not exist or belongs to another user.

### 3.5 Delete Transaction
- **Route:** `DELETE /api/transactions/:id`
- **Access:** Private

### 3.6 Evaluate AI Risk for Specific Transaction
- **Route:** `POST /api/transactions/:id/analyze`
- **Access:** Private
- **Response (200 OK):** Returns anomaly scoring, risk level (LOW/MEDIUM/HIGH), and advisory disclaimer.

---

## 4. Dashboard Endpoints

### 4.1 Dashboard Overview Summary
- **Route:** `GET /api/dashboard/summary`
- **Access:** Private
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "summary": {
        "totalBalance": 128450,
        "totalIncome": 195000,
        "totalExpenses": 66550,
        "monthlyIncome": 75000,
        "monthlyExpenses": 24200,
        "savingsRate": 68,
        "totalTransactions": 42,
        "pendingBillsCount": 2,
        "unresolvedFraudCount": 0
      }
    }
  }
  ```

### 4.2 Multi-Month Cash Flow Progression
- **Routes:** `GET /api/dashboard/cashflow` AND `GET /api/dashboard/cash-flow`
- **Access:** Private
- **Response (200 OK):** Returns 6 calendar months of historical income, expenses, and net cash flow.

### 4.3 Category Expense Breakdown (Dual-Key Response)
- **Routes:** `GET /api/dashboard/categories` AND `GET /api/dashboard/expenses-by-category`
- **Access:** Private
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "categories": [
        { "category": "Food", "name": "Food", "amount": 8450, "value": 8450, "count": 18 },
        { "category": "Bills", "name": "Bills", "amount": 4200, "value": 4200, "count": 3 }
      ],
      "expensesByCategory": [
        { "category": "Food", "name": "Food", "amount": 8450, "value": 8450, "count": 18 },
        { "category": "Bills", "name": "Bills", "amount": 4200, "value": 4200, "count": 3 }
      ]
    }
  }
  ```

---

## 5. Statement Ingestion Endpoints

### 5.1 Upload Statement File
- **Route:** `POST /api/statements/upload`
- **Access:** Private
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `statement`: File (CSV, XLSX, XLS, PDF) $\le 10$ MB.
  - `source`: `'bank_statement'` | `'gpay'`
  - `bankName`: Optional institution name (e.g. `'HDFC'`, `'DCB'`).
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Statement parsed successfully. 35 transactions found (2 potential duplicates).",
    "data": {
      "importId": "673db0000000000000000001",
      "totalRecords": 35,
      "duplicateCount": 2,
      "fileType": "bank_pdf",
      "status": "staged"
    }
  }
  ```
- **Error Responses:**
  - `400 UNSUPPORTED_FILE_TYPE`: Extension or magic bytes invalid.
  - `400 FILE_TOO_LARGE`: Payload exceeds 10 MB.

### 5.2 Confirm Staged Import
- **Route:** `POST /api/statements/imports/:id/confirm`
- **Access:** Private
- **Response (200 OK):** Bulk commits staged transactions to the `transactions` collection.

### 5.3 Cancel Staged Import
- **Route:** `POST /api/statements/imports/:id/cancel`
- **Access:** Private
- **Response (200 OK):** Purges staged transactions without database writes.

---

## 6. AI Microservice Direct Endpoints (Port 8000)

### 6.1 Microservice Health
- **Route:** `GET /health`
- **Response (200 OK):** Status and boolean readiness flags for all 4 models.

### 6.2 Empirical Model Status & Benchmark Metrics
- **Route:** `GET /models/status`
- **Response (200 OK):** Returns complete evaluation metrics across all 4 machine learning models.

### 6.3 Transaction Categorization
- **Route:** `POST /predict/category`
- **Request Body:** `{ "title": "Swiggy Bangalore Order", "direction": "debit" }`
- **Response (200 OK):**
  ```json
  {
    "category": "Food",
    "subcategory": "Online Food Delivery",
    "confidence": 0.85,
    "source": "ml",
    "status": "MODEL_READY",
    "model_metadata": { "algorithm": "RandomForestClassifier with TF-IDF Vectorizer", "trained": true }
  }
  ```

### 6.4 Active Learning Category Correction
- **Route:** `POST /predict/category/correct`
- **Request Body:** `{ "title": "Local Coffee Roaster", "category": "Food" }`
- **Response (200 OK):** Appends correction to persistent volume `finovax-ai-corrections`.

### 6.5 Spending Forecast
- **Route:** `POST /predict/forecast`
- **Request Body:** `{ "historicalMonthlyExpenses": [24500, 26000, 23800, 25200], "horizonMonths": 3 }`
- **Response (200 OK):** Returns predicted expenditures and confidence bounds.

