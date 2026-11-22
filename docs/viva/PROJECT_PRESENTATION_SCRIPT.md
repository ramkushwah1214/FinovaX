# FinovaX — Project Presentation & Viva Speech Script
**Degree**: Bachelor of Technology in Computer Science & Engineering  
**Project Title**: FinovaX — An AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Target Audience**: External Viva Examiners, Department Project Committee, Academic Evaluators  
**Estimated Total Presentation Time**: 17–20 Minutes (2-min pitch + 5-min architecture & ML deep dive + 10-min live demo + conclusion)

---

## 1. Timing & Structure Overview

| Segment | Duration | Focus Area | Supporting Visual / Screen |
| :--- | :--- | :--- | :--- |
| **Segment 1: Executive Opening** | 2 mins | Problem statement, core vision, real-world relevance, solution overview | Slide 1–3 (Title, Problem, Vision) |
| **Segment 2: Technical Architecture & ML** | 5 mins | Microservice design, security architecture, 4 ML modules, empirical validation | Slide 4–8 (Architecture, Tech Stack, ML Engines) |
| **Segment 3: Live Application Demonstration** | 10 mins | End-to-end user journey, statement parser, fraud scoring, forecasting, segmentation | Live Browser (`http://localhost:80`) |
| **Segment 4: Conclusion & Viva Transition** | 1 min | Summary of engineering achievements, transition to oral defense | Slide 9 (Conclusion & Q&A) |

---

## 2. Segment 1: Executive Opening (2 Minutes)

### Slide 1: Title & Introduction (0:00 – 0:30)
> *"Respected external examiners, head of department, project guides, and members of the evaluation committee. A very pleasant good morning to you all.*
>
> *I am presenting **FinovaX**, an end-to-end, AI-powered personal finance management and fraud intelligence platform. In modern retail banking and digital payment ecosystems, consumers are inundated with fragmented financial streams—UPI payments, credit card swipes, digital wallets, and net banking transfers. Yet, our banking apps remain fundamentally passive ledgers. They inform us where money went only after it has departed, offer zero proactive fraud intelligence, and require painful, manual ledger-keeping.*
>
> *FinovaX bridges this chasm by merging deterministic financial engineering with empirical machine learning microservices."*

### Slide 2: The Core Industry Problem (0:30 – 1:15)
> *"Let us examine the three structural challenges in consumer fintech today:*
> 1. *First, **Data Ingestion Friction**: Retail consumers receive monthly statements as messy CSVs, Excel sheets, or password-protected PDF files. No standard schema exists across Indian banks—HDFC, SBI, ICICI, and Axis all format dates, descriptions, and debits differently.*
> 2. *Second, **Absence of Real-time Anomaly Intelligence**: Rule-based banking alerts only flag simplistic threshold triggers (such as transactions over ₹50,000). They completely miss velocity spikes, contextual deviations, or irregular night-time drain transactions.*
> 3. *Third, **Black-Box AI Fallacy**: Many academic AI projects boast 99% accuracy on synthetic benchmarks, but crumble when exposed to un-curated real-world user data, high-cardinality merchant strings, or small personal time series.*
>
> *FinovaX was engineered from day one to confront these production realities."*

### Slide 3: The FinovaX Solution (1:15 – 2:00)
> *"FinovaX is not just a dashboard; it is a full-stack, distributed microservices ecosystem:*
> - *It features a **Multi-Bank Statement Parsing Engine** that normalizes heterogeneous bank statements with zero server-side disk leakage.*
> - *An **Active Learning Hybrid NLP Classifier** that maps noisy merchant narrations to 10 standard expense categories.*
> - *An **Unsupervised Isolation Forest Engine** detecting fraudulent transactions based on contextual velocity, amount deviations, and temporal features.*
> - *An **Empirically Proven Spending Baseline Forecaster**, tested rigorously against autoregressive ML algorithms.*
> - *And an **RFM-based K-Means Behavioral Clustering Engine** providing actionable financial profiling.*
>
> *Let us now examine the technical architecture powering these capabilities."*

---

## 3. Segment 2: Technical Architecture & ML Deep Dive (5 Minutes)

### Slide 4: System Architecture & Docker Orchestration (2:00 – 3:15)
> *"FinovaX is engineered as a three-tier, microservices-based distributed system, fully containerized using Docker and Docker Compose.*
>
> *Please direct your attention to the architecture diagram:*
> - *At the ingress layer sits **Nginx 1.27 Alpine**, serving an optimized React 18 Single Page Application built with Vite and Tailwind CSS. Nginx acts as our reverse proxy, serving static assets with immutable cache headers and forwarding `/api` traffic internally over a private Docker bridge network (`finovax-network`).*
> - *At the core business layer is our **Node.js 20 & Express Backend**. It handles stateless JWT authentication with secure HttpOnly cookies, request validation, tenant isolation via Mongoose with strict schema enforcement, and connection pooling to **MongoDB Atlas Cloud**.*
> - *At the intelligence layer is our **Python 3.11 FastAPI Microservice**, running Uvicorn with parallel workers. This service houses our scikit-learn and joblib machine learning pipelines.*
>
> *A crucial architectural decision here is **network boundary isolation**: ports 5000 and 8000 are completely unexposed to the host operating system. All client traffic enters through port 80, ensuring strict perimeter security."*

### Slide 5: The Categorization Engine & Active Learning (3:15 – 3:55)
> *"Let us examine our first AI engine: **Transaction Categorization**.*
>
> *Indian banking narrations are notoriously noisy—strings like `UPI-SWIGGY-BANGALORE-98234` or `POS 401289 ZOMATO GURGAON`. To handle this, we engineered a hybrid two-tier pipeline:*
> 1. *A deterministic rule dictionary with over 150 high-precision regex signatures for known Indian merchants (Swiggy, Zomato, Uber, Amazon, D-Mart, Netflix).*
> 2. *For un-curated narrations, a **Linear Support Vector Classifier (LinearSVC)** paired with a character and word-level TF-IDF vectorizer (1-to-3 ngrams). The decision function is calibrated using Platt's scaling (CalibratedClassifierCV) to output true probabilistic confidence.*
> 3. *Most importantly, we implemented an **Active Learning Human-in-the-Loop** feedback loop. When a user corrects a category in the UI, the correction is persisted to a Docker named volume (`finovax-ai-corrections`). The runtime engine dynamically intercepts predictions using this cache, continuously learning without requiring immediate full-model retraining.*
>
> *On our production test dataset, this hybrid pipeline achieves a weighted **Macro F1-score of 0.7755**, outperforming standard Logistic Regression."*

### Slide 6: Fraud Detection & Anomaly Intelligence (3:55 – 4:35)
> *"Our second AI module is **Fraud & Anomaly Detection**.*
>
> *In real-world finance, fraud is unlabeled and extremely rare (<1%). Supervised classifiers suffer from severe class imbalance and fail against zero-day attack patterns. Hence, we deployed an **Unsupervised Isolation Forest** algorithm.*
>
> *Each incoming transaction is vectorized across 7 dimensional features: transaction amount, logarithmic amount, hour of the day, day of the week, deviation from the user's historical mean (`z_amount`), velocity deviation (`z_velocity`), and an off-hours flag.*
>
> *Rather than arbitrary score thresholds, we conducted an empirical grid search over contamination parameters on a verified credit card fraud dataset. We selected an optimal contamination threshold of **0.5917**, which yields an **ROC-AUC of 0.9469**, a recall of 60.81%, and restricts the False Positive Rate to a minimal **0.81%**. This ensures that genuine user transactions are not flagged unnecessarily, preventing user alert fatigue."*

### Slide 7: Spending Forecasting & The Empirical Baseline (4:35 – 5:15)
> *"Our third AI module is **Monthly Spending Forecasting**.*
>
> *Here, we made a crucial, honest scientific finding that sets our project apart from superficial AI claims. We built and evaluated multiple complex time-series models, including XGBoost Regressor and Autoregressive Lagged features, alongside a **Previous-Period Persistence Baseline**.*
>
> *When rigorously benchmarked on real consumer monthly spending series, **XGBoost suffered from severe variance instability**, yielding a Mean Absolute Error of **₹4,803.30** because retail users typically possess short history windows (6 to 24 months).*
>
> *In contrast, our **Previous-Period Baseline Model achieved a superior MAE of ₹2,393.55**—reducing prediction error by **50.2%**.*
>
> *Guided by empirical evidence rather than buzzword bias, we deployed the persistence baseline into production, augmented with category-level budget variance caps and minimum-data threshold guards. The system explicitly warns users if they possess fewer than 3 months of history."*

### Slide 8: Customer Segmentation & Security Engineering (5:15 – 7:00)
> *"Our fourth AI module is **Customer Financial Segmentation** using **K-Means Clustering** ($k=5$) on RFM metrics (Recency, Frequency, Monetary volume, plus Savings Ratio and Digital Velocity).*
>
> *To guarantee scientific validity, our clustering model achieves a **Silhouette Score of 0.6556** and a **Davies-Bouldin Index of 0.5014**, cleanly segregating users into actionable personas like *High-Volume Transactors*, *Conservative Savers*, and *Occasional Users*.*
>
> *Finally, regarding **Security Engineering**:*
> - *Passwords are hashed using **Bcrypt with 12 salt rounds**.*
> - *Sensitive fields are marked with `select: false` at the Mongoose schema level.*
> - *Every query strictly enforces `{ userId: req.user._id }`, preventing Insecure Direct Object References (IDOR).*
> - *Statement files are parsed **strictly in memory via Multer memoryStorage**; temporary files are never written to disk, and passwords for protected PDFs are never logged or stored.*
>
> *I will now transition to the live system demonstration."*

---

## 4. Segment 3: Live Application Demonstration (10 Minutes)

*(The presenter navigates to `http://localhost:80` in the browser. The browser is opened cleanly, DevTools console is docked at the bottom or hidden).*

---

### Step 1: Health Check & System Verification (Minute 7:00 – 7:45)
**Screen**: Terminal / Browser URL  
**Action**:
1. Show terminal output: `docker compose ps`. Show all three containers (`frontend`, `backend`, `ai-service`) marked `Up (healthy)`.
2. In browser, navigate to `http://localhost/api/health`.

**Spoken Script**:
> *"Before interacting with the UI, let us verify system operational health. Here in the terminal, you can see all three Docker services running with active Docker health probes: the Nginx SPA on port 80, Node.js backend on internal port 5000, and FastAPI microservice on internal port 8000.*
>
> *Opening `/api/health` in the browser returns HTTP 200 OK: the backend confirms its uptime, MongoDB Atlas connection state is 1 (Connected), and the internal bridge probe to `http://ai-service:8000/health` confirms sub-5ms latency with all 4 model artifacts loaded into memory."*

---

### Step 2: Authentication & Multi-Tenant Security (Minute 7:45 – 8:45)
**Screen**: `http://localhost/login` & `http://localhost/register`  
**Action**:
1. Navigate to `/login`.
2. Demonstrate input validation (submit empty fields, show validation messages).
3. Log in with registered demo credentials: `kushwahram989@gmail.com`.
4. Inspect browser Application tab: Show the `token` cookie marked **HttpOnly**, **SameSite=Strict**, with no token accessible to `document.cookie` in JavaScript console.

**Spoken Script**:
> *"We now log into FinovaX. Notice that our authentication implements enterprise defense-in-depth:*
> - *Credentials undergo strict client-side and server-side Joi validation.*
> - *Upon successful authentication, the server generates a cryptographically signed JWT stored strictly within an **HttpOnly, SameSite=Strict cookie**.*
> - *Notice here in the JavaScript console: typing `document.cookie` returns an empty string. This guarantees total immunity against Cross-Site Scripting (XSS) token theft.*
> - *All downstream API requests automatically include this cookie via `credentials: 'include'` CORS policies."*

---

### Step 3: Executive Dashboard & Overview (Minute 8:45 – 9:45)
**Screen**: `http://localhost/dashboard`  
**Action**:
1. Point out Total Balance, Monthly Inflow, Monthly Expenses, and Savings Rate KPI cards.
2. Highlight the Category Breakdown Doughnut Chart and Monthly Spending Trend Area Chart.
3. Show Recent Transactions feed with color-coded category badges.

**Spoken Script**:
> *"Upon authentication, we land on the Executive Financial Dashboard. The dashboard aggregates real-time metrics dynamically calculated across the user's ledger:*
> - *Top summary cards display Total Liquid Balance, Total Inflow, Monthly Outflow, and Calculated Savings Ratio.*
> - *Charts render using Chart.js/Recharts, highlighting monthly cash flow trends and category distribution.*
> - *Notice the clean, responsive interface engineered using modern Tailwind design tokens and full dark/light glassmorphic styling.*
> - *Every transaction visible here belongs strictly to the authenticated user. Even if another user adds a transaction concurrently, tenant boundary enforcement prevents any data crossover."*

---

### Step 4: Adding a Transaction with Real-Time AI Inference (Minute 9:45 – 11:00)
**Screen**: `http://localhost/transactions` -> "Add Transaction" Modal  
**Action**:
1. Click "Add Transaction".
2. Enter Description: `"Swiggy delivery food order bangalore"`.
3. Notice: The category field automatically suggests or defaults to **Food & Dining** with high confidence.
4. Enter Amount: `₹450`. Select Type: `Expense`.
5. Submit transaction. Show immediate ledger update without page reload.
6. Now add an anomalous transaction:
   - Description: `"Midnight Crypto Withdrawal International POS"`.
   - Amount: `₹185,000`.
   - Time: 03:30 AM (or select off-hours).
7. Submit transaction.
8. Show the immediate **High Risk / Anomaly Alert** badge appearing on the transaction row!

**Spoken Script**:
> *"Now let us observe our AI microservices operating in real time.*
>
> *First, I enter a natural language merchant narration: 'Swiggy delivery food order bangalore'. As the user types or leaves the field, our LinearSVC NLP classifier analyzes the character n-grams and categorizes it as **Food & Dining**.*
>
> *Next, let us test our **Isolation Forest Fraud Engine**. I will input an irregular transaction: ₹1,85,000 for 'Midnight Crypto Withdrawal' at 3:30 AM. For this account, the typical average transaction is ₹1,500.*
>
> *Watch what happens upon clicking Submit: the Node.js backend synchronously pipes the transaction payload to FastAPI's `/predict/fraud` endpoint. The model evaluates amount z-score, velocity, and off-hours flags, computing an anomaly score beyond our contamination cutoff.*
>
> *Instantly, the transaction is flagged in the UI with a distinct red **High Fraud Risk** indicator, and an audit alert record is dispatched to the Security Center."*

---

### Step 5: Multi-Bank Statement Import & De-duplication (Minute 11:00 – 12:45)
**Screen**: `http://localhost/statement-import`  
**Action**:
1. Navigate to Statement Import screen.
2. Select Bank format (or leave as Auto-Detect).
3. Choose a sample PDF or CSV statement (e.g., SBI or HDFC statement).
4. If protected PDF, enter the sample statement password (e.g., DOB or PAN).
5. Click **"Parse & Preview Statement"**.
6. Show the **Staged Review Grid**:
   - Total rows detected (e.g., 25 transactions).
   - Valid records ready for import.
   - Show how the parser stripped bank headers, running balance columns, and extracted clean Date, Description, Debit, Credit, and Reference numbers.
   - Point out duplicate detection: highlight any row marked as *"Duplicate Detected (Skipped)"* matching existing ledger reference numbers or hash!
7. Click **"Confirm & Commit Transactions"**. Show batch insertion into MongoDB.

**Spoken Script**:
> *"This is one of FinovaX's core engineering highlights: the **Multi-Bank Statement Ingestion Engine**.*
>
> *In traditional apps, users must type transactions manually. Here, the user simply drops their bank PDF or CSV statement. If the statement is password-protected—as is standard for HDFC, SBI, and ICICI—they supply the password.*
>
> *Crucial Security Detail: The uploaded file is processed **entirely in volatile RAM using Multer memory storage**. It is never written to disk, preventing orphaned sensitive financial documents in `/tmp`.*
>
> *The parser executes our proprietary normalization pipeline:*
> 1. *Auto-detects bank layout heuristics.*
> 2. *Normalizes date formats (whether DD/MM/YYYY or MM/DD/YYYY).*
> 3. *Calculates a SHA-256 fingerprint for each transaction.*
> 4. *Cross-checks the user's database to identify duplicates before committing.*
>
> *As you can see in this Staged Preview, all 25 rows are cleanly extracted with suggested categories. I click 'Commit', and all records are ingested into the user's active financial ledger in a single atomic batch operation."*

---

### Step 6: Active Learning & Human-in-the-Loop Feedback (Minute 12:45 – 13:45)
**Screen**: `http://localhost/transactions`  
**Action**:
1. Locate a transaction whose automated category could be customized (e.g., an Amazon purchase categorized as "Shopping", which the user wants as "Education" for text books).
2. Click the Edit / Categorize icon.
3. Change category to "Education" and save.
4. Show notification: *"Category corrected & feedback saved for AI model."*
5. Open terminal or explain the backend log showing: `POST /predict/category/correct` returning 200 OK and updating `category_corrections.json` in the persistent volume.

**Spoken Script**:
> *"What happens when an AI makes a mistake? In most systems, the user is stuck correcting the same merchant repeatedly.*
>
> *In FinovaX, we built an **Active Learning Correction Pipeline**. Notice this Amazon transaction for ₹1,200. The NLP model classified it as 'Shopping'. However, this was a purchase of academic textbooks, so I reclassify it as 'Education'.*
>
> *When I save this correction, FinovaX does not just update the MongoDB document. The backend forwards an active learning payload to FastAPI's `/predict/category/correct` endpoint. The microservice updates an active correction lookup stored in our persistent Docker volume (`finovax-ai-corrections`).*
>
> *Future transactions with this narration token will immediately be categorized as 'Education' with 100% confidence, closing the loop between user feedback and inference."*

---

### Step 7: Fraud Intelligence & Security Center (Minute 13:45 – 14:45)
**Screen**: `http://localhost/fraud-alerts` or Security Center  
**Action**:
1. Navigate to the Fraud Intelligence section.
2. Display the list of detected anomalies, including the anomalous transaction created in Step 4.
3. Show the detailed breakdown: Anomaly Score, Risk Level (High/Medium/Low), Trigger Reasons (e.g., *Amount > 4.5x 30-day mean, Velocity spike in 1-hour window, Off-hours execution*).
4. Click on an alert to resolve it: "Mark as Verified / False Positive" or "Confirm Suspicious".

**Spoken Script**:
> *"Moving to the Fraud Intelligence Center. Here, users and administrators have complete visibility into flagged risks.*
>
> *Rather than just presenting a binary 'Fraud' label, FinovaX provides **Explainable AI (XAI)** metrics:*
> - *We display the raw anomaly score.*
> - *The contextual deviation metrics—for example: 'Amount is 5.2 standard deviations above historical 30-day mean' and 'Transaction occurred at 03:30 AM'.*
> - *The user can review the alert and mark it as 'Verified by User' or 'Flagged for Bank Dispute'. This dual-control workflow mirrors modern banking fraud operations."*

---

### Step 8: Spending Forecasting & Budget Analytics (Minute 14:45 – 15:45)
**Screen**: `http://localhost/forecast`  
**Action**:
1. Navigate to Forecast & Analytics.
2. Show the projected next month's total spending figure (e.g., Projected Next Month: ₹32,450 vs Current Month: ₹30,800).
3. Point out the category-wise expenditure projection bars and budget variance indicators.
4. Show the Minimum History Guard: explain how the UI gracefully handles accounts with limited history.

**Spoken Script**:
> *"Now let us examine our Predictive Budgeting module.*
>
> *Here, the platform projects the user's anticipated expenses for the forthcoming calendar month, broken down by category.*
>
> *As explained during our technical slides, this utilizes our verified **Previous-Period Persistence Model**, which achieved an MAE of ₹2,393 on real consumer series, beating XGBoost. The engine computes weighted moving baselines, adjusts for seasonal category trends, and applies budget variance caps.*
>
> *This empowers users with actionable foresight: if their dining out spending is tracking 25% above baseline by the 15th of the month, the forecast warns them before their budget is breached."*

---

### Step 9: Customer Financial Segmentation & Insights (Minute 15:45 – 17:00)
**Screen**: `http://localhost/analytics` or Profile Segmentation  
**Action**:
1. Navigate to Behavioral Segmentation view.
2. Display the user's assigned cluster persona: e.g., **"Cluster 2: Balanced Disciplined Saver"** or **"Cluster 0: High-Velocity Digital Transactor"**.
3. Point out the radar/feature comparison: Recency, Frequency, Monetary volume, Savings Ratio.
4. Highlight the tailored financial recommendation generated based on cluster membership.

**Spoken Script**:
> *"Finally, we view our **Behavioral Financial Segmentation Engine**.*
>
> *FinovaX runs an unsupervised K-Means model ($k=5$) trained on normalized behavioral RFM metrics. The authenticated user is dynamically mapped to a cluster:*
> - *For our demo account, the user is classified into **Cluster 2: Disciplined Saver**, reflecting an above-average savings ratio (>35%) and consistent, low-variance transaction frequency.*
> - *The platform uses this cluster identity to offer targeted recommendations—such as auto-sweep fixed deposit allocations or tax-saving ELSS funds—rather than generic tips.*
>
> *This concludes our live functional demonstration. Let us now summarize our engineering contributions."*

---

## 5. Segment 4: Conclusion & Transition to Viva Defense (1 Minute)

### Slide 9: Summary & Future Scope (Minute 17:00 – 18:00)
**Screen**: Final Slide  
**Spoken Script**:
> *"To conclude, FinovaX demonstrates that academic computer science projects can meet production-grade engineering standards:*
> 1. *We developed a **complete, three-tier microservices architecture** running under Docker Compose orchestration with automated health probing.*
> 2. *We deployed **four distinct, validated machine learning models**, with empirical proofs justifying every architectural selection—from calibrating our SVM classifier to deploying the baseline forecaster over overfitted gradient boosting.*
> 3. *We instituted **rigorous security controls**: HttpOnly cookie-based JWT sessions, Bcrypt-12 hashing, zero-leak in-memory file processing, and complete database tenant isolation.*
> 4. *Our entire implementation is covered by **198 automated unit and integration tests** passing across backend, AI microservice, and frontend layers.*
>
> *Future enhancements will incorporate Open Banking Account Aggregator (AA) API integration and on-device federated learning for privacy-preserving fraud intelligence across multiple banking networks.*
>
> *Thank you very much for your time and attention. I am now ready and eager to answer your questions during the viva voce examination."*

---

## 6. Speaker Checklist & Visual Cue Guide

### Pre-Viva Setup (15 Minutes Before Examination)
- [ ] Ensure Docker Desktop is running and WSL 2 backend is active.
- [ ] Run terminal command: `docker compose ps` to verify all 3 containers are `Up (healthy)`.
- [ ] Verify test user credentials: `kushwahram989@gmail.com`.
- [ ] Pre-open browser tabs:
  - Tab 1: Presentation Slides.
  - Tab 2: `http://localhost:80/login` (clean cache).
  - Tab 3: `http://localhost:80/api/health` (pre-verified).
- [ ] Keep sample statement file (`sample_statement.pdf` or `.csv`) on Desktop for quick drag-and-drop.
- [ ] Keep terminal window minimized with `docker compose logs -f` ready if examiners request live log inspection.

### Physical Delivery Guidelines
- **Pacing**: Speak at a steady, measured pace (~130 words per minute).
- **Tone**: Professional, confident, and scientifically grounded. Avoid saying *"We think it works"*; say *"Our empirical benchmarks demonstrate..."*.
- **Transitions**: Clearly announce transitions between slides and live browser tabs.
- **Handling Questions During Demo**: If an examiner interrupts with a question, pause immediately, answer clearly with reference to the code or architecture, and smoothly resume the demonstration flow.

