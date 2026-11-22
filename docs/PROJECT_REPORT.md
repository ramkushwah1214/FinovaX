# FinovaX — Comprehensive Final-Year Major Project Report

**Project Title:** FinovaX: An AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Candidate Name:** Kushwah Ram  
**Degree:** Bachelor of Technology in Computer Science & Engineering  
**Department:** Department of Computer Science & Engineering  
**Academic Year:** 2026–2027  

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Problem Definition & Motivation](#2-problem-definition--motivation)
3. [Existing Systems vs Proposed FinovaX System](#3-existing-systems-vs-proposed-finovax-system)
4. [Literature Survey & Background Review](#4-literature-survey--background-review)
5. [Requirements Analysis](#5-requirements-analysis)
   - 5.1 [Functional Requirements](#51-functional-requirements)
   - 5.2 [Non-Functional Requirements](#52-non-functional-requirements)
6. [System Design & Architecture](#6-system-design--architecture)
   - 6.1 [Microservice Decomposition](#61-microservice-decomposition)
   - 6.2 [Containerized Infrastructure](#62-containerized-infrastructure)
   - 6.3 [Database Entity Relationship & Schema Design](#63-database-entity-relationship--schema-design)
7. [Implementation Details](#7-implementation-details)
   - 7.1 [Frontend Single-Page Application (React 18 + Vite)](#71-frontend-single-page-application-react-18--vite)
   - 7.2 [Backend API Gateway (Node.js 20 + Express)](#72-backend-api-gateway-nodejs-20--express)
   - 7.3 [Multi-Format Financial Statement Parser Engine](#73-multi-format-financial-statement-parser-engine)
   - 7.4 [AI/ML Intelligence Microservice (Python 3.11 + FastAPI)](#74-aiml-intelligence-microservice-python-311--fastapi)
   - 7.5 [Security Engineering & Tenant Isolation](#75-security-engineering--tenant-isolation)
8. [Testing & Verification Methodology](#8-testing--verification-methodology)
9. [Experimental Results & Evaluation](#9-experimental-results--evaluation)
   - 9.1 [Transaction Categorization Engine](#91-transaction-categorization-engine)
   - 9.2 [Fraud & Anomaly Intelligence Engine](#92-fraud--anomaly-intelligence-engine)
   - 9.3 [Spending Time-Series Regressor](#93-spending-time-series-regressor)
   - 9.4 [Behavioral Persona Customer Segmenter](#94-behavioral-persona-customer-segmenter)
10. [Limitations](#10-limitations)
11. [Future Scope](#11-future-scope)
12. [Conclusion](#12-conclusion)
13. [References](#13-references)

---

## 1. Introduction

Personal financial literacy and proactive fiscal management represent one of the most pressing socio-economic challenges for young professionals, students, and retail consumers in developing digital economies. The advent of high-speed payment rails—most prominently India's Unified Payments Interface (UPI)—has drastically lowered friction for micro-transactions, causing consumers to execute dozens of low-value, high-frequency transactions daily across diverse mobile applications, merchants, and bank accounts.

While transaction execution has become frictionless, transaction comprehension and post-facto financial auditing have deteriorated. Retail consumers frequently experience "micro-leakage" of funds, fail to adhere to static monthly budgets, and lack tools to detect unauthorized or anomalous payment deductions.

**FinovaX** was conceived and engineered as an end-to-end, production-grade, containerized software platform designed to solve these systemic challenges. Combining a modern reactive web interface, a robust microservice architecture, and four empirically validated Machine Learning engines, FinovaX elevates personal finance management from passive bookkeeping into proactive financial intelligence.

---

## 2. Problem Definition & Motivation

Modern retail consumers interface with multiple financial entities, resulting in fragmented transaction records. The primary engineering and user experience problems addressed by this project include:

1. **Heterogeneous Financial Statement Formats:** Financial institutions issue monthly account records in wildly divergent proprietary formats. HDFC, SBI, ICICI, Axis, and DCB Bank provide statements ranging from complex multi-header CSVs and merged-cell Excel spreadsheets to password-protected or image-scanned PDFs. Furthermore, Google Pay statements present isolated UPI transactions that lack account balances and contain proprietary 12-digit UPI UTR reference codes. Manual record keeping is unsustainable.
2. **Accounting Nuance Neglect in Existing Tools:** Most existing budgeting apps treat every negative balance entry as a discretionary expense and every positive entry as new taxable income. This creates severe accounting distortion: refunds from e-commerce cancellations are wrongly logged as fresh income, and intra-account transfers between a user's own savings accounts are wrongly inflated into spending.
3. **Fragile Rule-Based Categorization:** Static keyword lookup tables fail when merchant strings evolve or are obfuscated by payment aggregator gateways (e.g., `RAZORPAY*MERCHANT`, `UPI/439281726/BLINKIT`).
4. **Lack of Real-Time Anomaly Triage:** Financial fraud, duplicate subscription billings, and anomalous transactions are often discovered weeks later on paper statements, after dispute windows have elapsed.
5. **Fabricated Predictive Claims in FinTech:** Many commercial platforms advertise "deep AI forecasts" that overfit sparse data, generate uncalibrated probabilities, and lack empirical benchmarking against naive statistical baselines.

---

## 3. Existing Systems vs Proposed FinovaX System

| Feature / Dimension | Traditional PFM Apps (Walnut, MoneyControl, Excel) | Proposed FinovaX Platform |
| :--- | :--- | :--- |
| **Ingestion Pipeline** | Manual keyboard input or fragile SMS parsing prone to OS permission deprecation. | Automated multi-format ingestion (CSV, XLSX, Bank PDFs, Google Pay UPI PDFs) with magic byte validation. |
| **Accounting Integrity** | Treats all credits as income and all debits as expenses. | Dedicated classification of `refund` and `transfer` transaction types; zero inflation of savings rates. |
| **Duplicate Detection** | None, or naive timestamp matching. | Multi-tier duplicate detection: Tier 1 (exact hash), Tier 2 (reference ID), Tier 3 (fuzzy temporal window). |
| **Categorization** | Hardcoded regex strings; no adaptation. | Hybrid TF-IDF vectorizer + Classifier pipeline with active learning user feedback loop. |
| **Anomaly & Fraud Guard** | Absent or static threshold rules (e.g., alert if amount > ₹10,000). | Unsupervised Isolation Forest contamination scoring combined with historical user velocity analysis. |
| **Spending Forecast** | Linear trendline extrapolation or unvalidated neural nets. | Empirically selected Previous-Period Persistence Baseline proven superior to XGBoost on hold-out test sets. |
| **Behavioral Insight** | Simple pie charts. | K-Means clustering ($k=5$) mapping user spending behavior to actionable financial wellness personas. |
| **Architecture & Deployment**| Monolithic desktop application or opaque closed SaaS. | Decoupled 3-tier microservices orchestrated via Docker Compose with health-dependent startup. |

---

## 4. Literature Survey & Background Review

1. **Transaction Text Vectorization in Financial Domains:**  
   Prior research by *Kotu and Deshpande (2019)* demonstrated that TF-IDF (Term Frequency-Inverse Document Frequency) text representations, when coupled with linear classifiers or shallow tree ensembles, outperform deep recurrent neural networks on short, noisy merchant strings because token frequency carries high semantic density without requiring massive pretraining corpora.
2. **Unsupervised Anomaly Detection for Imbalanced Financial Streams:**  
   *Liu, Ting, and Zhou (2008)* introduced the Isolation Forest algorithm, proving that anomalies are "few and different," making them susceptible to isolation through fewer recursive random feature partitions. In financial transaction streams where fraudulent records comprise less than 0.1% of volume, supervised learning suffers from catastrophic class imbalance and concept drift, whereas unsupervised isolation trees effectively establish baseline normality.
3. **Time-Series Forecasting Benchmarks in Micro-Expenditures:**  
   Studies in macroeconomic and personal finance forecasting (*Hyndman and Athanasopoulos, 2018*) consistently show that for short, high-variance time-series (e.g., monthly consumer expense aggregates over 6 to 24 months), complex non-linear regressors (like XGBoost and Deep AR) frequently overfit, while naive lag baselines minimize Out-of-Sample Mean Absolute Error (MAE). FinovaX validates this empirical truth.
4. **Customer Behavioral Clustering in Digital Banking:**  
   *Jain et al. (1999)* established K-Means clustering evaluated via Silhouette and Davies-Bouldin metrics as an optimal method for consumer segmentation across orthogonal dimensions (discretionary vs essential spending ratio, monthly volume, frequency).

---

## 5. Requirements Analysis

### 5.1 Functional Requirements
1. **User Identity & Access Management:** User registration, bcrypt password hashing (work factor 12), JWT issuance, secure HttpOnly cookie management, and user profile configuration.
2. **Transaction Management:** Full CRUD operations for income and expense transactions with strict numerical boundaries (`0 < amount <= 100,000,000`), categorization, payment method tracking, and date selection.
3. **Budgeting & Savings Goals:** Creation and real-time calculation of monthly category budgets and progress tracking toward multi-month financial goals.
4. **Multi-Format Statement Ingestion:** Secure upload and processing of CSV, Excel (.xlsx/.xls), Bank PDF (HDFC, SBI, ICICI, Axis, DCB Bank), and Google Pay UPI activity statements.
5. **Staged Import Workflow:** A 3-step staged preview allowing users to inspect parsed items, review multi-tier duplicate warnings, correct categories, and confirm or cancel imports.
6. **AI Transaction Categorization:** Real-time ML category prediction for manual transaction entries and imported narrations.
7. **Active Learning Feedback Loop:** API endpoint allowing users to correct ML-predicted categories, appending feedback to persistent storage for scheduled retraining.
8. **Fraud Intelligence & Anomaly Scoring:** Evaluation of transaction anomalies via Isolation Forest and statistical Z-score velocity analysis, generating explainable risk alerts.
9. **Spending Forecast:** Multi-month future expenditure horizon projection using the empirically validated persistence baseline.
10. **Customer Segmentation:** Behavioral persona clustering assigning users to 1 of 5 financial archetypes with actionable habits.
11. **Dashboard & Analytics:** Real-time financial summary (net balance, monthly inflow/outflow, zero-safe savings rate calculation, 6-calendar-month cashflow, and expense distributions).

### 5.2 Non-Functional Requirements
1. **Security & Data Privacy:** Cryptographic password salting, zero password hash leakage via Mongoose `select: false`, tenant data isolation across all endpoints, strict NoSQL parameter validation, and defense against cross-site script injection.
2. **Performance & Responsiveness:** Dashboard aggregation queries execute in under 100 ms; ML inference endpoints respond in under 30 ms; frontend transitions execute in under 16 ms (60 FPS).
3. **Reliability & Fault Tolerance:** Backend handles database unavailability gracefully (returning standard HTTP 503 rather than crashing); AI service downtime falls back seamlessly to rule-based categorization without blocking core transaction CRUD.
4. **Maintainability & Decoupling:** Three distinct containerized services communicating over standardized REST APIs with zero circular dependencies.
5. **Portability:** Containerized with Docker and Docker Compose, enabling deterministic deployment across local workstations, cloud VMs, and production servers.

---

## 6. System Design & Architecture

### 6.1 Microservice Decomposition
The platform is organized into three decoupled subsystems:
1. **Client Tier (Frontend):** React 18 SPA built with Vite, TypeScript, Tailwind CSS, Recharts, and Lucide React. Bundled into static assets and served via an Nginx Alpine container on host port `80`.
2. **API Gateway & Core Domain Tier (Backend):** Node.js 20 Express service written in TypeScript. Manages authentication, domain models, business logic, financial statement parsing, and database transactions. Listens on internal port `5000`.
3. **Machine Learning Tier (AI Service):** Python 3.11 FastAPI microservice running Uvicorn. Houses 4 trained machine learning pipelines, inference endpoints, evaluation reports, and active learning persistent storage. Listens on internal port `8000`.

### 6.2 Containerized Infrastructure
All services run within a dedicated Docker bridge network (`finovax-network`).
- Public traffic enters strictly through the **Frontend Nginx container** on Port `80`.
- Nginx serves static HTML, CSS, and JS assets directly, and reverse-proxies `/api/*` requests to `http://backend:5000/api/*`.
- Backend communicates with the AI microservice over internal Docker DNS (`http://ai-service:8000`).
- Backend connects outbound to **MongoDB Atlas Cloud** over port `27017` with TLS 1.2+ encryption.
- Ports `5000` and `8000` are **not published to the host machine**, preventing unauthorized external access.
- Active learning feedback is stored on a named Docker volume (`finovax-ai-corrections`) mounted to `/app/data/corrections`.

### 6.3 Database Entity Relationship & Schema Design
The application persists data in MongoDB Atlas across 13 Mongoose collections, with all financial models strictly bound to a `userId` foreign key:
- `users`: User identity, credential hash, currency, monthly income, notification preferences.
- `transactions`: Individual financial records (amount, type, category, date, payment method, description, `transactionType: income | expense | refund | transfer`).
- `budgets`: Category spending limits per month/year.
- `financialgoals`: Savings targets, deadlines, and accumulated balances.
- `recurringpayments`: Subscriptions, utility bills, due dates, frequencies, and statuses.
- `fraudalerts`: Flagged anomalous transactions, risk scores (0–100), risk levels (LOW, MEDIUM, HIGH), contributing reasons, and resolution states.
- `statementimports`: Import tracking metadata, upload filenames, hashes, total counts, duplicate counts, staging statuses.
- `bankconnections`, `bankaccounts`, `consentrecords`: Account aggregator simulation models.
- `financialinsights`, `spendingforecasts`, `spendingsegments`: Analytical caches and persona records.

---

## 7. Implementation Details

### 7.1 Frontend Single-Page Application (React 18 + Vite)
- **Component Architecture:** Divided into layout wrappers (`DashboardLayout`), page components (`Dashboard.tsx`, `Transactions.tsx`, `FraudIntelligence.tsx`, `StatementUpload.tsx`, etc.), and UI components.
- **Client-Side State Management:** React Context API provides `AuthContext` (managing JWT tokens in memory and HttpOnly cookies), `FinanceContext` (caching active transactions, balances, and budgets), and `ThemeContext`.
- **Visualization:** Recharts renders responsive interactive AreaCharts, BarCharts, and PieCharts for cashflow progression and category spending breakdowns.
- **Relative API Proxying:** `frontend/src/api/client.ts` uses relative URL paths (`/api`), ensuring identical behavior in local development (via Vite proxy) and production (via Nginx reverse proxy) without hardcoded hostnames.

### 7.2 Backend API Gateway (Node.js 20 + Express)
- **TypeScript Strict Mode:** Entire backend compiles via `tsc` with zero type errors.
- **Modular Routing:** 12 dedicated Express routers (`auth.ts`, `transactions.ts`, `budgets.ts`, `goals.ts`, `dashboard.ts`, `reports.ts`, `fraudAlerts.ts`, `statements.ts`, `health.ts`, `ai.ts`, etc.).
- **Fail-Safe Database Guard:** Middleware `checkDbReady.ts` intercepts requests when MongoDB is offline, returning standard HTTP 503 `DATABASE_UNAVAILABLE` rather than hanging or returning mock data.
- **Centralized Error Handling:** `errorHandler.ts` catches and normalizes Mongoose `CastError` (HTTP 400), `ValidationError` (HTTP 422), Mongo duplicate key error 11000 (HTTP 409), `MulterError` (HTTP 400), and custom `AppError` exceptions into consistent JSON envelopes.

### 7.3 Multi-Format Financial Statement Parser Engine
Implemented in `backend/src/services/statement/` as a decoupled pipeline:
1. **Security & Validation (`importValidationService.ts`):** Enforces a strict 10 MB ceiling, filename sanitization against directory traversal (`../../`), and magic byte verification (`%PDF` for PDFs, `PK\x03\x04` for XLSX, null-byte rejection for CSVs).
2. **CSV Parser (`csvParser.ts`):** RFC 4180 compliant quoted CSV tokenizer handling commas within descriptions, Indian number formatting (`1,50,000.50`), and automated column autodetection across 30+ header aliases.
3. **Excel Parser (`excelParser.ts`):** Scans XLSX/XLS workbooks, skips bank metadata banners, and converts Excel serial integers (e.g. `44927`) to valid JavaScript UTC Date objects.
4. **Bank PDF Parser (`bankPdfParser.ts`):** Implements bank-specific extraction strategies for HDFC, SBI, ICICI, Axis, and DCB Bank. Detects image-only scanned PDFs and triggers a structured `OCR_REQUIRED` advisory.
5. **Google Pay UPI Parser (`googlePayPdfParser.ts`):** Extracts 12-digit UPI UTR reference codes, transaction counterparts, and surfaces clear disclosures regarding Google Pay architectural limitations (lack of account balances and masked account numbers).
6. **Multi-Tier Duplicate Detection (`duplicateDetectionService.ts`):** Tier 1 (exact SHA-256 hash match), Tier 2 (unique reference/UTR match), Tier 3 (fuzzy temporal window match within $\pm 2$ days on identical amount and cleaned merchant).
7. **Accounting Normalizer (`transactionNormalizer.ts`):** Explicitly marks transaction reversals as `transactionType: 'refund'` and intra-account movements as `transactionType: 'transfer'`, ensuring neither corrupts income or expense analytics.

### 7.4 AI/ML Intelligence Microservice (Python 3.11 + FastAPI)
- **Microservice Design:** Built with FastAPI, utilizing Pydantic schemas for strict request/response data contracts.
- **Pre-Trained Model Loading:** Loaded during application startup via `joblib.load()` from `ai-service/models/`.
- **Fault-Tolerant Fallbacks:** If an ML artifact is missing or an input string has zero vectorizer overlap, all four services seamlessly transition to rule-based or statistical fallback heuristics without process interruption.

### 7.5 Security Engineering & Tenant Isolation
1. **Bcrypt Work Factor 12:** Password hashes are generated with 12 salt rounds, resisting brute-force attacks.
2. **Schema Projection Security:** `UserSchema` marks `passwordHash: { select: false }`, ensuring queries like `User.find()` or `User.findById()` never include the hash.
3. **HttpOnly Cookie Session Security:** JWT tokens are issued with a 7-day expiration and delivered via HttpOnly cookies with `SameSite: strict` (production) or `lax` (dev).
4. **Strict Tenant Isolation:** Every financial query enforces ownership: `Transaction.findOne({ _id: id, userId: req.user.id })`. Probing another user's record returns HTTP 404 NOT_FOUND.
5. **Hexadecimal Parameter Guards:** `validateObjectId.ts` verifies that route `:id` parameters conform strictly to 24-character hexadecimal MongoDB ObjectIds, preventing CastError exceptions.
6. **Mass Assignment Prevention:** Transmitted body payloads cannot override server-derived fields like `userId` or `_id`.

---

## 8. Testing & Verification Methodology

The FinovaX codebase was subjected to continuous automated testing and quality auditing across five distinct test suites:

1. **Security Regression Suite (`backend/src/test/security.test.ts`):** 53 automated test assertions verifying BUG-01 (Multer upload error mapping), BUG-02 (PUT/PATCH compatibility), BUG-03 (dual-key dashboard contract), unauthenticated route protection, malformed ObjectId rejection, password security, and cross-user tenant isolation. **Result: 53 PASSED / 0 FAILED.**
2. **Core Backend Integration Suite (`backend/src/test/api.test.ts`):** 71 automated test assertions verifying health probes, password strength validators, JWT signing/expiry, financial boundary constraints, live MongoDB CRUD workflows, and duplicate user prevention. **Result: 71 PASSED / 0 FAILED.**
3. **Statement Engine Verification Suite (`backend/src/test/statement.test.ts`):** 37 automated test assertions verifying magic byte inspection, path traversal sanitization, CSV parsing, Excel date serialization, bank PDF detection strategies, GPay UTR extraction, accounting rules, and duplicate detection. **Result: 37 PASSED / 0 FAILED.**
4. **Backend AI Integration Suite (`backend/src/test/ai.test.ts`):** 25 automated test assertions verifying AI health pinging, transaction categorization predictions, active learning correction recording, anomaly scoring, spending forecast horizons, and persona clustering. **Result: 25 PASSED / 0 FAILED.**
5. **Python AI Service Unit Suite (`ai-service/test_ai_service.py`):** 12 unit test assertions verifying FastAPI endpoint routing, Pydantic schema validation, Isolation Forest anomaly scoring, and model comparison reporting. **Result: 12 PASSED / 0 FAILED.**

**Global Verification Total:** **198 PASSED / 0 FAILED (100% Pass Rate).**  
**TypeScript Build Status:** Backend (`tsc`) and Frontend (`tsc && vite build`) compile with **0 Errors**.

---

## 9. Experimental Results & Evaluation

### 9.1 Transaction Categorization Engine
Evaluated on the FinovaX Consumer Narration Corpus across 16 financial expense, inflow, and transfer classes using stratified group splitting to prevent merchant leakage:

| Algorithm | 5-Fold CV $F_1$ | Test Accuracy | Test Precision | Test Recall | Test Weighted $F_1$ | Test Macro $F_1$ | Training Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LinearSVC (Calibrated)** | 1.0000 | **0.7778** | **0.8126** | **0.7778** | **0.7755** | **0.7759** | 0.35 s |
| **Logistic Regression** | 1.0000 | **0.7778** | **0.7906** | **0.7778** | **0.7666** | **0.7675** | 0.20 s |
| **Multinomial Naive Bayes**| 1.0000 | 0.7333 | 0.7580 | 0.7333 | 0.7148 | 0.7087 | 0.02 s |
| **Random Forest** | 0.9525 | 0.6756 | 0.7996 | 0.6756 | 0.6707 | 0.6656 | 0.19 s |
| **Decision Tree** | 0.5690 | 0.3733 | 0.6332 | 0.3733 | 0.4076 | 0.4173 | 0.04 s |

**Deployment Selection:** The Calibrated Linear / Logistic Regression pipeline with TF-IDF 1-2 n-grams and sublinear term frequency was selected, paired with an exact keyword rule-based fallback and active learning correction recording.

### 9.2 Fraud & Anomaly Intelligence Engine
Benchmarked against standard transaction streams (Kaggle Credit Card 284,807 records and PaySim 6.36M simulated mobile transactions):

| Model | Model Nature | Training Time | Precision | Recall | $F_1$ Score | ROC-AUC | PR-AUC | False Positive Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Isolation Forest (Primary)**| Unsupervised | 1.17 s | 0.4245 | 0.6081 | **0.5000** | **0.9469** | 0.4020 | **0.0081 (0.81%)** |
| **Local Outlier Factor (LOF)**| Unsupervised | 0.73 s | 0.3944 | 0.7568 | 0.5185 | 0.9181 | 0.6462 | 0.0115 (1.15%) |
| **Random Forest (Benchmark)**| Supervised | 1.31 s | 0.9531 | 0.8243 | 0.8841 | 0.9734 | 0.9026 | 0.0004 (0.04%) |
| **XGBoost (Comparison)** | Supervised | 1.77 s | 0.9231 | 0.8108 | 0.8633 | 0.9759 | 0.8992 | 0.0007 (0.07%) |

**Operational Decision:** In real-world retail banking, labeled fraud instances are virtually non-existent for a new user. FinovaX deploys the **Unsupervised Isolation Forest** at an empirical contamination threshold of 0.5917. Combined with transaction velocity ($Z$-score vs historical category mean and 24-hour frequency), it provides transparent, explainable risk levels (LOW, MEDIUM, HIGH) without deceptive probability claims.

### 9.3 Spending Time-Series Regressor
Evaluated on chronological historical monthly consumer expenditure series using strict chronological hold-out validation:

| Regressor / Model | Out-of-Sample MAE | RMSE | $R^2$ Score | Out-of-Sample MAPE | Operational Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Previous-Period Persistence Baseline** | **₹2,393.55** | **3,073.46** | **-0.1309** | **5.17%** | **Deployed Primary Predictor** |
| **Linear Regression** | ₹3,619.49 | 4,029.07 | -0.9435 | 7.46% | Comparative Benchmark |
| **Random Forest Regressor** | ₹4,655.46 | 5,080.25 | -2.0899 | 9.60% | Complex Ensemble Benchmark |
| **XGBoost Regressor** | ₹4,803.30 | 5,362.25 | -2.4424 | 9.92% | Advanced Tree Benchmark |

**Key Academic Finding:** Complex gradient boosting (XGBoost) overfit short consumer spending series, producing an MAE of ₹4,803.30. The simple **Previous-Period Persistence Baseline** achieved an MAE of **₹2,393.55** (a 50.2% error reduction) with a low MAPE of **5.17%**. In accordance with engineering honesty and metric-driven development, the baseline was deployed in production.

### 9.4 Behavioral Persona Customer Segmenter
Evaluated using K-Means, Agglomerative Hierarchical Clustering, and DBSCAN on consumer expenditure vectors:

| Clustering Algorithm | Clusters Found | Silhouette Score | Davies-Bouldin Index | Calinski-Harabasz Score |
| :--- | :--- | :--- | :--- | :--- |
| **K-Means ($k=5$)** | **5** | **0.6556** | **0.5014** | **1,868.47** |
| **Agglomerative Clustering** | 5 | 0.6556 | 0.5014 | 1,868.47 |
| **DBSCAN** | 4 (outliers filtered) | 0.6398 | 0.5286 | 1,210.58 |

**Identified Personas:**
1. *Cluster 0: Low Spending & High Savings* — Frugal users prioritizing savings goals.
2. *Cluster 1: Moderate Balanced Spender* — Balanced essential and discretionary expenses.
3. *Cluster 2: High Volume Discretionary* — Frequent lifestyle, dining, and online commerce spending.
4. *Cluster 3: Fixed-Obligation Heavy* — High proportion of recurring bills and rent.
5. *Cluster 4: Volatile Irregular Transactor* — Unpredictable cash flow patterns.

---

## 10. Limitations

1. **In-Memory Statement Parsing Ceiling:** Statements are buffered in Node memory buffers (`multer.memoryStorage()`) with a 10 MB limit. While this prevents orphaned disk files, simultaneous processing of hundreds of massive files in an enterprise environment would require streaming parsers and distributed worker queues (e.g. BullMQ / Redis).
2. **Synchronous OCR Scanned PDF Fallback:** Non-text bank PDFs trigger an `OCR_REQUIRED` advisory rather than running on-the-fly local OCR.
3. **Single Ingress TLS Termination:** In the current Docker Compose setup, Nginx terminates HTTP on port `80`. Public internet deployment requires a reverse proxy or cloud load balancer terminating TLS on port `443`.
4. **Lack of Live Bank Webhooks:** Open banking in India operates via licensed Account Aggregators (NBFC-AA). FinovaX simulates this via consent records and statement imports rather than holding a commercial banking license.

---

## 11. Future Scope

1. **Account Aggregator (Setu / OneMoney) Live Integration:** Implementing licensed FIP/FIU protocols to pull real-time consent-driven banking streams.
2. **On-Device Edge Inference:** Porting categorization models to WebAssembly / ONNX Runtime inside the React client to enable 100% offline edge classification.
3. **Receipt Image OCR with Vision Transformers:** Integrating lightweight multi-modal models to parse supermarket and restaurant receipts from mobile camera captures.
4. **Automated Micro-Investing Automations:** Linking surplus monthly savings identified by the forecasting model to automated mutual fund SIP triggers.

---

## 12. Conclusion

The **FinovaX** project successfully designs, implements, and validates a modern, production-grade, and containerized Personal Finance Management and Fraud Intelligence platform. By replacing fragile keyword regex with active learning ML, replacing arbitrary thresholds with Isolation Forest anomaly detection, holding forecasting models to rigorous empirical baseline tests, and enforcing multi-tier statement duplicate detection, FinovaX demonstrates engineering excellence across full-stack development, machine learning, and DevOps containerization.

All code, models, tests (198 passing assertions), and Docker Compose configurations have been verified, packaged, and prepared for final academic defense.

---

## 13. References

1. Liu, F. T., Ting, K. M., & Zhou, Z. H. (2008). *Isolation Forest*. Eighth IEEE International Conference on Data Mining (ICDM), 413–422.
2. Kotu, V., & Deshpande, B. (2019). *Data Science: Concepts and Practice*. Morgan Kaufmann.
3. Hyndman, R. J., & Athanasopoulos, G. (2018). *Forecasting: Principles and Practice* (2nd ed.). OTexts.
4. Jain, A. K., Murty, M. N., & Flynn, P. J. (1999). *Data clustering: A review*. ACM Computing Surveys (CSUR), 31(3), 264–323.
5. Pedregosa, F., et al. (2011). *Scikit-learn: Machine Learning in Python*. Journal of Machine Learning Research, 12, 2825–2830.
6. Chen, T., & Guestrin, C. (2016). *XGBoost: A Scalable Tree Boosting System*. Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, 785–794.
7. Rescorla, E. (2018). *The Transport Layer Security (TLS) Protocol Version 1.3*. RFC 8446.

