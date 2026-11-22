# FinovaX — Final Project Demonstration & Presentation Guide
**Audience**: Final-Year Project Evaluators, External Examiners, Department Committee  
**Workstation URL**: `http://localhost:80` (Docker Ingress)  
**Estimated Demonstration Duration**: 12–15 Minutes  

---

## 1. Quick Demonstration Overview

| Stage | Duration | Primary Focus | URL / Command |
| :---: | :---: | :--- | :--- |
| **Stage 1** | 1 min | System Health, Docker Topology & MongoDB Atlas | Terminal (`docker compose ps`) & `/api/health` |
| **Stage 2** | 1.5 mins | Secure Authentication & Token Isolation | `http://localhost/login` & DevTools Cookies |
| **Stage 3** | 1.5 mins | Executive Financial Dashboard | `http://localhost/dashboard` |
| **Stage 4** | 2.5 mins | Multi-Bank Statement Import & Staged De-duplication | `http://localhost/import/statement` |
| **Stage 5** | 2 mins | Real-Time AI Categorization & Active Learning Feedback | `http://localhost/transactions` |
| **Stage 6** | 2 mins | Fraud Intelligence & Live Anomaly Injection | `http://localhost/fraud` |
| **Stage 7** | 1.5 mins | Spending Forecast & Persistence Baseline | `http://localhost/forecast` |
| **Stage 8** | 1 min | Behavioral Segmentation & Persona Insights | `http://localhost/segmentation` |
| **Stage 9** | 1 min | Financial AI Assistant & Reports Analytics | `http://localhost/assistant` & `/reports` |
| **Stage 10** | 1 min | Architecture Wrap-Up & Viva Defense Hand-off | Summary Slide / Q&A |

---

## 2. Step-by-Step Demonstration Sequence

---

### Stage 1: System Health, Docker Topology & Database Connection (1 Minute)
**Objective**: Prove the application is running as a containerized microservices architecture with live cloud connectivity.

1. **Terminal Action**:
   ```powershell
   $env:PATH = "C:\Users\Victus\AppData\Local\Programs\DockerDesktop\resources\bin;$env:PATH"
   docker compose ps
   ```
   **Expected Output**:
   - `finovax-frontend` — `Up (healthy)` on `0.0.0.0:80->80/tcp`
   - `finovax-backend` — `Up (healthy)` on `5000/tcp` (internal)
   - `finovax-ai-service` — `Up (healthy)` on `8000/tcp` (internal)
2. **Browser Action**: Navigate to `http://localhost/api/health`.
   **Expected Output**:
   ```json
   {
     "status": "ok",
     "database": { "status": "connected", "readyState": 1 },
     "aiService": { "status": "ok", "latencyMs": 6 }
   }
   ```
   *Spoken Cue*: *"Here, we verify our 3 Docker microservices. The backend is actively connected to MongoDB Atlas over TLS (`readyState: 1`), and the AI service responds within 6 milliseconds over the private internal Docker bridge."*

---

### Stage 2: Secure Authentication & Token Isolation (1.5 Minutes)
**Objective**: Demonstrate enterprise security against XSS and session theft.

1. Navigate to `http://localhost/login`.
2. Enter registered credentials:
   - Email: `kushwahram989@gmail.com`
   - Password: `Password@123`
3. Click **Sign In**.
4. Open Chrome DevTools (`F12`) -> **Application** -> **Cookies** -> `http://localhost`.
5. Point out the `finovax_token` cookie:
   - `HttpOnly`: Checked (JavaScript cannot access it).
   - `SameSite`: `Strict` (Zero CSRF vulnerability).
6. In DevTools **Console**, type `document.cookie` and hit Enter:
   - Output: `""` (Empty string).
   *Spoken Cue*: *"Notice that typing `document.cookie` returns blank. This proves total immunity against Cross-Site Scripting (XSS) token theft. All authentication is maintained via secure, server-managed HttpOnly cookies."*

---

### Stage 3: Executive Financial Dashboard (1.5 Minutes)
**Objective**: Show real-time financial aggregation and responsive UI.

1. Navigate to `http://localhost/dashboard`.
2. Highlight:
   - Summary Cards: Total Balance, Monthly Income, Monthly Expenses, and Calculated Savings Rate.
   - Interactive Charts: Category Expense Breakdown (Doughnut) and Monthly Cash Flow (Area chart).
   - Recent Transactions ledger with status tags.
   *Spoken Cue*: *"All summary metrics are computed dynamically across the user's isolated Mongoose tenant records. Notice how zero-income scenarios are safeguarded against division-by-zero errors."*

---

### Stage 4: Multi-Bank Statement Import & Staged De-duplication (2.5 Minutes)
**Objective**: Demonstrate in-memory parsing, multi-bank formatting, and duplicate transaction prevention.

1. Navigate to `http://localhost/import/statement`.
2. Drag and drop sample statement file (`sample_statement.csv` or `.pdf`).
3. If using an encrypted bank PDF, enter the sample statement password.
4. Click **Parse Statement**.
5. Show the **Staged Review Grid**:
   - Total rows extracted.
   - Inferred Categories and Debit/Credit directions.
   - Show how duplicate transactions matching existing hashes are flagged with a **Duplicate Detected** tag and unchecked by default.
6. Click **Confirm & Import**.
7. Show that records are batched into MongoDB Atlas and the ledger updates immediately.
   *Spoken Cue*: *"The uploaded file was parsed entirely in volatile RAM using Multer memory storage. Temporary files are never written to disk, preventing sensitive banking documents from lingering in `/tmp`."*

---

### Stage 5: Real-Time AI Categorization & Active Learning Feedback (2 Minutes)
**Objective**: Prove hybrid NLP categorization and human-in-the-loop active learning.

1. Navigate to `http://localhost/transactions` and click **Add Transaction**.
2. Type Narration: `Swiggy Food Delivery Bangalore`.
3. Notice: The category automatically suggests or defaults to **Food & Dining** with high confidence.
4. Save the transaction.
5. Demonstrate **Active Learning Correction**:
   - In the transaction table, find an Amazon transaction categorized as `Shopping`.
   - Click Edit and change category to `Education` (e.g., academic textbooks).
   - Click Save.
6. Explain backend log:
   - `POST /predict/category/correct` updated `category_corrections.json` in the named Docker volume `finovax-ai-corrections`.
   *Spoken Cue*: *"When a user corrects a category, FinovaX writes the feedback to our persistent Docker volume. Future transactions matching this narration token are intercepted with 100% confidence, closing the loop between user feedback and inference."*

---

### Stage 6: Fraud Intelligence & Live Anomaly Injection (2 Minutes)
**Objective**: Demonstrate real-time Isolation Forest anomaly detection with explainable AI reasons.

1. Click **Add Transaction** in `/transactions`.
2. Inject an anomalous transaction:
   - Title: `Suspicious Luxury Electronics Purchase`
   - Amount: `₹350,000` (Extreme outlier compared to typical ₹500 transactions).
   - Category: `Electronics`
   - Payment Method: `Cash`
   - Time: `03:30 AM` (Off-hours).
3. Click Save.
4. Navigate to `http://localhost/fraud` (Fraud Intelligence Center).
5. Show the generated Fraud Alert:
   - **Risk Level**: `HIGH`
   - **Risk Score**: `100` (or $\ge 60$)
   - **Explainable Reasons**:
     - *Amount is 350x higher than historical average.*
     - *First-time spending category 'Electronics'.*
     - *Off-hours transaction initiated at 03:30.*
     - *Large outflow via high-anonymity payment method (Cash).*
6. Click **Resolve Alert** -> Mark as **"Verified by User"** to demonstrate full workflow resolution.
   *Spoken Cue*: *"Notice our model does not just output an arbitrary score. It provides Explainable AI (XAI) factors so users and fraud analysts understand exactly why the anomaly was flagged."*

---

### Stage 7: Spending Forecast & Baseline Model (1.5 Minutes)
**Objective**: Show empirical time-series forecasting and explain why simpler models outperform complex ones on short histories.

1. Navigate to `http://localhost/forecast`.
2. Highlight:
   - Projected Total Spending for Next Month.
   - Category-wise Spending Projections with upper and lower confidence bounds.
   - Minimum History Guard ($N \ge 3$ consecutive months).
   *Spoken Cue*: *"Here, we project the user's spending using our calibrated Previous-Period Baseline Model. During empirical testing, this baseline achieved an MAE of ₹2,393, beating XGBoost Regressor (MAE ₹4,803) by 50.2%. We chose empirical accuracy over algorithmic buzzwords."*

---

### Stage 8: Behavioral Customer Segmentation (1 Minute)
**Objective**: Show K-Means clustering ($k=5$) on RFM features.

1. Navigate to `http://localhost/segmentation`.
2. Highlight:
   - Assigned Persona: e.g., *"Low Spending & High Savings"* or *"Disciplined Saver"*.
   - Cluster Metrics: Recency, Frequency, Monetary volume, Savings Rate.
   - Tailored Recommendations generated specifically for that behavioral cluster.
   *Spoken Cue*: *"Our K-Means clustering achieves a Silhouette Score of 0.6556 and a Davies-Bouldin index of 0.5014 across 5 distinct behavioral profiles, providing personalized financial advice."*

---

### Stage 9: AI Assistant & Reports Analytics (1 Minute)
**Objective**: Demonstrate financial query assistant and analytics generation.

1. Navigate to `http://localhost/assistant`.
2. Type: `"How much did I spend on food this month?"` or `"What is my savings rate?"`.
3. Show the real-time financial assistant response calculated from ledger records.
4. Navigate to `http://localhost/reports`.
5. Show monthly summary, category distributions, and downloadable ledger views.

---

### Stage 10: Docker Deployment Architecture Wrap-Up (1 Minute)
**Objective**: Final summary of engineering contributions.

1. Conclude:
   - 3 containerized microservices running under Docker Compose.
   - 4 empirical ML models deployed with mathematical proofs.
   - 198 automated test assertions passing.
   - Zero credential leaks and 100% tenant data isolation.
2. Invite examiners to ask viva questions.

---

## 3. Emergency Troubleshooting & Demo Recovery

| Issue During Demo | Immediate Diagnostic | Fast Recovery Step |
| :--- | :--- | :--- |
| **Container shows exited / stopped** | `docker compose ps` shows `Exited (1)` | Run: `docker compose restart <service-name>` |
| **API returns 503 or Network Error** | Backend lost connection to MongoDB Atlas | Check Wi-Fi connection; restart backend: `docker compose restart backend` |
| **Browser shows blank screen / 404** | Old asset hash in browser cache | Press `Ctrl + Shift + R` (Hard Reload) or open Incognito tab (`Ctrl + Shift + N`) |
| **Login fails with invalid credentials** | Test account password forgotten | Register fresh user at `http://localhost/register` in 15 seconds |
| **Port 80 conflict on host** | Windows IIS or Skype took port 80 | Run in admin PowerShell: `Stop-Service W3SVC` |

