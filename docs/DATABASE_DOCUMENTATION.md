# FinovaX — Database Documentation & Schema Specification

**Database Engine:** MongoDB Atlas (Cloud Multi-Node Replica Set)  
**Object Data Modeling (ODM):** Mongoose 9.11.3  
**Connection Security:** TLS 1.2+ encrypted transport, SRV DNS resolution, URL-encoded credential sanitization.  

---

## 1. Overview & Data Architecture

FinovaX utilizes a document-oriented database design optimized for high-velocity transaction logging, analytical aggregation, and strict multi-tenant isolation. All financial records are partitioned at the database layer through mandatory `userId` foreign key references.

```
                    ┌─────────────────────────┐
                    │          User           │
                    │      (_id, email)       │
                    └────────────┬────────────┘
                                 │ 1:N
       ┌─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐          ┌──────────────┐
│ Transaction  │         │    Budget    │          │FinancialGoal │
│ (userId,     │         │ (userId,     │          │ (userId,     │
│  amount, ...)│         │  limit, ...) │          │  target, ...)│
└──────┬───────┘         └──────────────┘          └──────────────┘
       │ 1:1                                               
       ▼                                                   
┌──────────────┐         ┌──────────────┐          ┌──────────────┐
│  FraudAlert  │         │StatementImp. │          │RecurringPay. │
│ (userId,     │         │ (userId,     │          │ (userId,     │
│  riskScore)  │         │  stagedTxs)  │          │  dueDates)   │
└──────────────┘         └──────────────┘          └──────────────┘
```

---

## 2. Collections & Schema Specifications

The database consists of 13 Mongoose collections:

### 2.1 `users` Collection (`User.ts`)
Stores user profiles and cryptographic authentication credentials.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Auto-generated MongoDB identifier |
| `name` | String | Required, trim, max 100 | User's full name |
| `email` | String | Required, unique, lowercase, regex | Strict RFC 5322 email address |
| `passwordHash` | String | Required, **`select: false`** | Bcrypt hash (work factor 12). Never exposed in default queries. |
| `phone` | String | Optional, trim, default: `""` | User contact phone number |
| `currency` | String | Enum: `['INR', 'USD', 'EUR', 'GBP']` | Account currency (default: `'INR'`) |
| `monthlyIncome` | Number | Min: 0, default: `0` | Estimated monthly baseline income |
| `notifications` | Object | Sub-document | Notification toggles (`fraudAlerts`, `budgetThresholds`, `billReminders`, `weeklyReports`) |
| `createdAt` / `updatedAt` | Date | Timestamps | Document lifecycle audit timestamps |

**Indexes:**
- `{ email: 1 }` (Unique compound index)

---

### 2.2 `transactions` Collection (`Transaction.ts`)
Stores individual financial movements (expenses, income, refunds, and transfers).

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique transaction identifier |
| `userId` | ObjectId | Required, Ref: `'User'` | Foreign key to owning user |
| `title` | String | Required, trim, max 150 | Clean transaction narration / merchant name |
| `amount` | Number | Required, min: 0.01, max: 100M | Transaction numeric value |
| `type` | String | Enum: `['income', 'expense']` | High-level cash flow direction |
| `category` | String | Required, trim, max 60 | Expense or income category (e.g. Food, Shopping) |
| `date` | Date | Required, default: `Date.now` | Transaction execution date |
| `paymentMethod`| String | Enum: `['UPI', 'Card', 'NetBanking', 'Cash', 'Other']` | Payment vehicle |
| `description` | String | Optional, trim, max 500 | Notes or memo description |
| `transactionType`| String | Enum: `['income', 'expense', 'refund', 'transfer']` | Accounting classifier preventing distorted totals |
| `statementImportId`| ObjectId | Optional, Ref: `'StatementImport'` | Linked statement upload record |
| `referenceId` | String | Optional, trim, max 60 | External bank reference / 12-digit UPI UTR |
| `balanceAfter` | Number | Optional | Running account balance after transaction |
| `rawNarration` | String | Optional, trim | Unparsed, raw bank line text |

**Indexes:**
- `{ userId: 1, date: -1 }` (Optimizes chronological dashboard and ledger queries)
- `{ userId: 1, category: 1 }` (Optimizes category aggregation queries)
- `{ userId: 1, referenceId: 1 }` (Accelerates duplicate detection)

---

### 2.3 `budgets` Collection (`Budget.ts`)
Defines monthly spending ceilings per category.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Budget identifier |
| `userId` | ObjectId | Required, Ref: `'User'` | Foreign key to owning user |
| `category` | String | Required, trim | Budgeted category |
| `limitAmount` | Number | Required, min: 0 | Spending threshold limit |
| `month` | Number | Required, min: 1, max: 12 | Calendar month (1–12) |
| `year` | Number | Required, min: 2020 | Calendar year |

**Indexes:**
- `{ userId: 1, category: 1, month: 1, year: 1 }` (Unique: prevents duplicate category budgets in the same month)

---

### 2.4 `financialgoals` Collection (`FinancialGoal.ts`)
Tracks savings milestones and target balances.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Goal identifier |
| `userId` | ObjectId | Required, Ref: `'User'` | Owning user |
| `title` | String | Required, trim | Name of savings milestone (e.g., Emergency Fund) |
| `targetAmount` | Number | Required, min: 1 | Target financial milestone |
| `currentAmount`| Number | Required, min: 0, default: 0 | Accumulated balance toward goal |
| `deadline` | Date | Required | Target completion date |
| `category` | String | Optional, default: `'Savings'` | Goal category |
| `status` | String | Enum: `['in_progress', 'completed', 'abandoned']` | Goal lifecycle state |

---

### 2.5 `recurringpayments` Collection (`RecurringPayment.ts`)
Manages utility bills, subscriptions, and scheduled financial obligations.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Recurring payment identifier |
| `userId` | ObjectId | Required, Ref: `'User'` | Owning user |
| `name` | String | Required, trim | Service or payee name |
| `amount` | Number | Required, min: 0.01 | Expected bill amount |
| `category` | String | Required, default: `'Bills'` | Expense category |
| `frequency` | String | Enum: `['weekly', 'monthly', 'quarterly', 'yearly']` | Recurrence period |
| `nextDueDate` | Date | Required | Next scheduled payment date |
| `status` | String | Enum: `['active', 'paused', 'cancelled', 'overdue']` | Payment schedule status |

---

### 2.6 `fraudalerts` Collection (`FraudAlert.ts`)
Stores anomalous transactions flagged by Isolation Forest or velocity checks.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Alert identifier |
| `userId` | ObjectId | Required, Ref: `'User'` | Owning user |
| `transactionId`| ObjectId | Optional, Ref: `'Transaction'` | Linked transaction |
| `amount` | Number | Required | Transaction amount |
| `merchant` | String | Required, trim | Merchant or counterparty name |
| `date` | Date | Required | Transaction timestamp |
| `riskScore` | Number | Required, min: 0, max: 100 | Continuous anomaly risk score |
| `riskLevel` | String | Enum: `['LOW', 'MEDIUM', 'HIGH']` | Triage classification |
| `reasons` | [String] | Required, non-empty | Explainable risk contributing factors |
| `status` | String | Enum: `['pending_review', 'resolved_fraud', 'resolved_legitimate']` | User resolution state |

---

### 2.7 `statementimports` Collection (`StatementImport.ts`)
Tracks document ingestion lifecycle, audit metadata, and staged transactions.

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Statement import identifier |
| `userId` | ObjectId | Required, Ref: `'User'` | Owning user |
| `originalFilename`| String | Required | Name of uploaded file |
| `sanitizedFilename`| String| Required | Sanitized safe filename |
| `fileHashSha256` | String | Required | Cryptographic hash for file duplicate detection |
| `fileType` | String | Enum: `['csv', 'excel', 'bank_pdf', 'gpay_pdf']` | Ingestion parser selected |
| `source` | String | Enum: `['bank_statement', 'gpay']` | High-level data source |
| `bankName` | String | Optional | Bank institution (e.g. HDFC, SBI, DCB) |
| `totalRecords` | Number | Required | Total rows parsed |
| `duplicateCount`| Number | Required | Potential duplicates detected |
| `status` | String | Enum: `['staged', 'confirmed', 'cancelled', 'failed']` | Ingestion lifecycle state |
| `stagedTransactions`| Array | Sub-documents | Parsed items awaiting user confirmation |

---

### 2.8 Auxiliary Analytics Collections
- `bankconnections`: Simulated Account Aggregator linked bank credentials.
- `bankaccounts`: Individual accounts linked to a connection.
- `consentrecords`: Simulated RBI NBFC-AA user data sharing consents.
- `financialinsights`: AI-generated personalized advice items.
- `spendingforecasts`: Cached 3-month forecast projections.
- `spendingsegments`: Cached user persona cluster assignments.

---

## 3. Multi-Tenant User Data Isolation

FinovaX implements strict tenant isolation at the query execution level:
1. **Server-Side Identity:** The user ID is derived strictly from the cryptographically verified JWT (`req.user.id`).
2. **Mandatory Query Scoping:** All operations enforce ownership filtering:
   ```typescript
   const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
   ```
3. **No Cross-User Leakage:** Probing an ID belonging to another user returns an HTTP 404 NOT_FOUND response.
4. **Mass Assignment Immune:** Mongoose documents explicitly assign `userId: req.user.id` on creation, ignoring any `userId` present in the request body.

---

## 4. End-to-End Data Flow

```
1. Client Uploads Bank Statement
   │ (multipart/form-data)
   ▼
2. Multer In-Memory Buffer
   │ (Validated: size <= 10MB, magic bytes match)
   ▼
3. Statement Parser Strategy Selected
   │ (CSV / Excel / Bank PDF / Google Pay PDF)
   ▼
4. Multi-Tier Duplicate Check
   │ (Tier 1: SHA256, Tier 2: UTR, Tier 3: Fuzzy Temporal)
   ▼
5. Staged in StatementImport Collection
   │ (status: 'staged')
   ▼
6. User Reviews & Confirms via UI
   │ (POST /api/statements/imports/:id/confirm)
   ▼
7. Bulk Committed into Transactions Collection
   │ (status: 'confirmed')
   ▼
8. Real-Time Dashboard Aggregation
   │ (MongoDB $match, $group, $sum)
   ▼
9. Anomaly Risk Scoring Triggered
   │ (AI Service Isolation Forest + Historical Velocity)
```

