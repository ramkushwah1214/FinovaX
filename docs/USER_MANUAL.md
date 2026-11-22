# FinovaX — End-User Manual & Operational Walkthrough

**Application URL:** `http://localhost` (or deployed server address)  
**Target Audience:** Retail Consumers, Financial Auditors, Viva Examiners  

---

## 1. Getting Started: Account Setup & Authentication

### 1.1 New User Registration
1. Open your browser and navigate to `http://localhost`.
2. Click **Get Started** or **Register** in the top navigation bar.
3. Fill in the registration form:
   - **Full Name:** Enter your name (e.g., `Kushwah Ram`).
   - **Email Address:** Provide a valid email (e.g., `kushwahram989@gmail.com`).
   - **Password:** Must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., `FinovaX#2026Password`).
   - **Preferred Currency:** Select `INR (₹)`, `USD ($)`, `EUR (€)`, or `GBP (£)`.
   - **Estimated Monthly Income:** Enter your baseline monthly income.
4. Click **Create Account**. You will be logged in automatically and redirected to the Dashboard.

### 1.2 User Login
1. Navigate to `http://localhost/login`.
2. Enter your registered email and password.
3. Click **Sign In**. The system authenticates credentials against MongoDB Atlas, establishes a secure session via HttpOnly cookies, and redirects you to your personal financial overview.

---

## 2. Main Financial Dashboard (`/dashboard`)

The FinovaX Dashboard aggregates your financial health in real time:
- **Net Total Balance Card:** Displays cumulative net worth ($\text{Total Income} - \text{Total Expenses}$).
- **Monthly Cash Inflow & Outflow:** Summarizes current month earnings vs expenses.
- **Zero-Safe Savings Rate Meter:** Computes $\frac{\text{Income} - \text{Expenses}}{\text{Income}} \times 100\%$, safely handling zero-income edge cases.
- **Interactive Multi-Month Cash Flow Graph:** A 6-calendar-month AreaChart visualizing revenue, expenditure, and net accumulation.
- **Expense Breakdown Chart:** An interactive category donut chart showing where money flows this month.
- **Recent Transactions Ledger:** Quick view of the latest 5 transactions with direct navigation to the full ledger.

---

## 3. Managing Transactions (`/transactions`)

### 3.1 Adding a Transaction
1. Click **Transactions** in the sidebar.
2. Click the **+ Add Transaction** button.
3. Fill in the modal fields:
   - **Description / Title:** e.g., `Starbucks Coffee`.
   - **Amount:** Numerical positive value (e.g., `350`).
   - **Type:** Select `Expense` or `Income`.
   - **Category:** Select or type category (`Food`, `Shopping`, `Bills`, etc.).
   - **Date & Payment Method:** Select transaction date and vehicle (`UPI`, `Card`, `NetBanking`, `Cash`).
4. Click **Save Transaction**. The transaction is logged, historical statistics are recomputed, and the Isolation Forest anomaly detector automatically scores the entry.

### 3.2 Editing & Deleting
- **Edit:** Click the pencil icon on any transaction row. Update title, amount, or category. (Submits via `PUT` / `PATCH`).
- **Delete:** Click the trash icon and confirm. The record is permanently removed from your personal ledger.

---

## 4. Multi-Format Bank Statement Ingestion (`/statements/upload` & `/import/gpay`)

FinovaX eliminates manual receipt entry through its intelligent statement ingestion workflow:

### 4.1 Supported Statement Formats
- **Bank CSV & Excel (.xlsx / .xls):** HDFC, SBI, ICICI, Axis, DCB Bank, or generic bank sheets.
- **Native Bank PDFs:** Automatically parses tables and running balances. (Image-only scanned PDFs display a helpful `OCR_REQUIRED` advisory).
- **Google Pay UPI Statements:** Specifically designed for GPay export PDFs. Extracts 12-digit UPI UTR reference numbers and counterparties.

### 4.2 The 3-Step Staged Import Lifecycle
1. **Upload & Auto-Parse:** Drag and drop your file into the upload zone. The server inspects magic bytes, detects duplicate rows, and stages the transactions in memory.
2. **Review & Correct:**
   - **Duplicate Review:** Review potential duplicates flagged by the multi-tier detection engine (Tier 1 hash, Tier 2 reference ID, Tier 3 fuzzy time window).
   - **Category Review:** Inspect ML-predicted categories and adjust any misclassifications.
3. **Commit or Cancel:**
   - Click **Confirm Import**: Transactions are bulk committed to your ledger.
   - Click **Cancel Import**: Staged transactions are purged with zero database impact.

---

## 5. Fraud Intelligence & Anomaly Guard (`/fraud-intelligence`)

1. **Anomaly Triage Ledger:** Displays all transactions evaluated by the unsupervised Isolation Forest model and velocity $Z$-score analyzers.
2. **Explainable Risk Scores:**
   - **LOW Risk (Green):** Normal transaction consistent with historical patterns.
   - **MEDIUM Risk (Yellow):** Statistical outlier (unusual hour or deviation from category mean).
   - **HIGH Risk (Red):** Severe anomaly ($> 3.5\sigma$ spike or rapid consecutive velocity).
3. **Contributing Reasons:** Transparently lists why a transaction was flagged (e.g., *Amount is ₹8,500 above your typical Food average of ₹420*).
4. **Resolution Actions:** Mark flagged alerts as **Confirmed Fraud** (to trigger security warnings) or **Legitimate Expense** (to train your baseline).

---

## 6. Predictive Analytics & Customer Segmentation

### 6.1 Spending Forecast (`/spending-forecast`)
- Analyzes historical monthly aggregates.
- Employs the empirically validated Previous-Period Persistence Baseline to project 3-month future spending with 95% statistical confidence bounds.
- If fewer than 3 months of history exist, a helpful notice indicates more transaction data is needed before generating projections.

### 6.2 Customer Segmentation (`/spending-segmentation`)
- Maps your multi-attribute spending profile against the 5 standardized K-Means behavioral archetypes:
  1. *Low Spending & High Savings*
  2. *Moderate Balanced Spender*
  3. *High Volume Discretionary*
  4. *Fixed-Obligation Heavy*
  5. *Volatile Irregular Transactor*
- Delivers actionable, personalized financial wellness recommendations tailored to your cluster.

---

## 7. Budgets, Goals & Recurring Bills

- **Budgets (`/budgets`):** Set monthly category spending ceilings. A progress bar turns yellow at 80% and red when exceeded.
- **Goals (`/goals`):** Track multi-month savings milestones (e.g. *Emergency Fund ₹1,00,000*). Log contributions to watch the completion percentage update.
- **Bills & Subscriptions (`/bills`):** Schedule recurring payments and track upcoming due dates.

---

## 8. Platform Settings & Danger Zone (`/settings`)

### 8.1 Personalization & Regional Preferences
- Update your full name, phone number, and baseline monthly income.
- Select your primary currency symbol (`₹ INR`, `$ USD`, `€ EUR`, `£ GBP`).
- Toggle interface color themes (Light / Dark mode).
- Configure alert dispatch channels for fraud anomalies and budget threshold triggers.

### 8.2 Danger Zone: Permanent Account Deletion
Under **Settings → Account Settings → Danger Zone**, authenticated users can permanently terminate their FinovaX account and wipe their financial history.

**Step-by-Step Deletion Procedure:**
1. Navigate to **Settings** (`/settings`) while logged in.
2. Scroll to the bottom to the **Danger Zone** card.
3. Click the red **"Delete My Account"** button to open the confirmation modal.
4. **Re-authenticate:** Enter your current account password in the password field (toggle the eye icon to verify input).
5. **Type Confirmation:** Enter `DELETE` in capital letters in the confirmation input field.
6. Click **"Permanently Delete Account"**.

**Safety Guarantees & Deletion Scope:**
- **Zero Accidental Deletions:** The delete button remains strictly disabled until both the password is provided and `DELETE` is typed exactly.
- **Re-Authentication Guard:** Even if a session token is active, deletion requires validating the password hash using `bcrypt`. An incorrect password immediately aborts deletion with a 401 error.
- **Multi-Collection Cascading Purge:** All 12 user-scoped collections (transactions, budgets, goals, recurring payments, fraud alerts, statement imports, bank accounts, consent logs, financial insights, spending forecasts, and spending segments) plus the core `User` profile document are wiped in an atomic database operation.
- **Preservation of System Assets:** Shared machine learning models, benchmark training datasets, and anonymous active-learning weights are never touched or modified.
- **Immediate Session Invalidation:** HttpOnly authentication cookies (`finovax_token`, `token`) are cleared, user state is reset, and the user is redirected to `/login` with the confirmation toast: *"Your FinovaX account has been successfully deleted."*


