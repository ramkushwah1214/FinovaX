# FinovaX — Known Technical Limitations & Future Scope
**Degree**: Bachelor of Technology in Computer Science & Engineering  
**Project**: FinovaX — AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Purpose**: Scientific Disclosure of Architectural, Algorithmic, and Operational Boundaries  

---

## 1. Overview & Academic Honesty Statement

In engineering and computer science, no system is omnipotent or devoid of trade-offs. Recognizing, formally documenting, and defending architectural boundaries is a fundamental hallmark of mature software engineering.

This document details the **verified known technical limitations** of the FinovaX platform across its data ingestion, machine learning, security, and infrastructure layers, alongside corresponding future work directions.

---

## 2. Data Ingestion & Statement Parsing Limitations

### 2.1 Absence of Optical Character Recognition (OCR) for Scanned Passbooks
- **Limitation**: The financial statement parser (`backend/src/services/statementParser.js`) relies on digital text-stream extraction via `pdf-parse` and `pdfjs-dist`. It extracts vector fonts and layout tables digitally embedded by Indian banks (HDFC, SBI, ICICI, Axis). If a user uploads a physical camera photograph, scanned passbook copy, or rasterized screenshot, the extractor yields zero characters.
- **Architectural Defense**: FinovaX traps this edge case: when character count is below threshold, it throws `ERR_SCANNED_PDF_UNSUPPORTED` with a user-friendly prompt.
- **Future Scope**: Integrate an asynchronous OCR pipeline using Tesseract or Google Cloud Vision API with worker threads for OCR preprocessing.

### 2.2 Bank Layout Drift & Heuristic Brittleness
- **Limitation**: Indian retail banks occasionally alter the structural layout, column headers, or date formats in their monthly PDF e-statements without prior notification (e.g., changing from `Value Date` to `Txn Date`, or altering table padding). While FinovaX supports 4 major bank parsing strategies with heuristic line scanners, an un-curated layout change can cause parsing errors on specific statements.
- **Future Scope**: Implement an LLM-assisted layout parser (e.g., Gemini Vision API or LayoutLMv3) that uses few-shot structured JSON extraction to adapt dynamically to novel statement designs.

### 2.3 Single-Request In-Memory Heap Boundaries
- **Limitation**: To guarantee zero server-side disk leakage, file parsing executes in volatile RAM via Multer's `memoryStorage()`. To prevent memory exhaustion attacks (DoS), an upload ceiling of **10 MB** is strictly enforced. Statements exceeding 10 MB or containing thousands of pages cannot be uploaded in a single synchronous HTTP request.
- **Future Scope**: Implement chunked streaming multipart uploads with background queue workers (Redis + BullMQ) for enterprise multi-year statement archives.

---

## 3. Transaction Categorization & NLP Limitations

### 3.1 Regional Language & Script Limitations
- **Limitation**: The TF-IDF vectorizer and rule dictionary are optimized for English alphanumeric bank narrations and transliterated UPI merchant strings (e.g., `UPI-SWIGGY-BANGALORE`, `POS DMART MUMBAI`). Narrations in non-Latin scripts (Devanagari, Tamil, Bengali) or non-standard regional merchant abbreviations may receive lower confidence scores and fall back to the `Other` category.
- **Future Scope**: Expand tokenization using multilingual sentence embeddings (e.g., Multilingual BERT or IndicBERT) trained on Indian multilingual UPI narrations.

### 3.2 High-Cardinality Cold-Start Merchants
- **Limitation**: Highly localized merchants (e.g., a local neighborhood kirana store named `RAMESH GENERAL STORE VARANASI`) without prior representation in the training corpus or regex rules cannot be categorized with high certainty until the user manually corrects the category via the Active Learning interface.
- **Architectural Defense**: The system gracefully assigns low confidence and invites user confirmation rather than asserting a fabricated high-confidence guess.

---

## 4. Fraud & Anomaly Detection Limitations

### 4.1 Statistical Anomaly vs. Conclusive Fraud Distinction
- **Limitation**: FinovaX deploys an **Unsupervised Isolation Forest** algorithm. As an unsupervised statistical anomaly detector, it identifies transactions that deviate significantly from typical amounts, velocity, or hours. **An anomaly is NOT definitive proof of criminal fraud.** Legitimate events—such as purchasing an expensive airline ticket, paying a hospital bill, or making a one-time wedding expenditure—will be flagged as anomalies.
- **Architectural Defense**: The UI and API explicitly display standard disclaimers: *"Risk predictions are statistical anomaly estimates and do not constitute conclusive proof of fraud."* All alerts require human verification.

### 4.2 Cold-Start Profiles ($N < 5$ Transactions)
- **Limitation**: On newly registered accounts with fewer than 5 transactions, the system lacks sufficient historical distribution to compute reliable statistical mean and standard deviation ($z_{\text{amount}}$ and $z_{\text{velocity}}$).
- **Architectural Defense**: When $N < 5$, the system sets `baseline_status: "INSUFFICIENT_HISTORY"` and suppresses high-risk alerts below ₹50,000 to prevent alert fatigue.

### 4.3 Trade-Off Between Precision and Recall
- **Limitation**: The deployed Isolation Forest model operates at a contamination threshold of 0.5917, achieving an ROC-AUC of 0.9469 and Recall of 60.81%, but with a Precision of **42.45%**. Approximately 6 out of 10 flagged transactions are false positives (unusual but legitimate user activity).
- **Architectural Defense**: In retail fraud, False Negatives (missed fraud) are drastically more costly than False Positives (user confirmation prompts). A 42.4% precision is aligned with commercial fraud operations (Visa, Mastercard).

---

## 5. Spending Forecasting Limitations

### 5.1 Short Time-Series History
- **Limitation**: Retail personal finance data typically spans only 6 to 24 months per user. In our Phase 3 empirical benchmark, complex autoregressive models like XGBoost Regressor suffered from severe variance instability (MAE of ₹4,803.30). The simpler **Previous-Period Persistence Baseline** demonstrated superior empirical accuracy (MAE of ₹2,393.55).
- **Inherent Constraint**: Persistence forecasting assumes month-over-month continuity. It cannot foresee unanticipated external shocks (medical emergencies, major vehicle repairs, sudden job loss).
- **Architectural Defense**: The forecaster provides upper and lower uncertainty bounds and requires a minimum of 3 consecutive months before generating projections.

---

## 6. Customer Financial Segmentation Limitations

### 6.1 Spherical Centroid Assumption (K-Means)
- **Limitation**: K-Means clustering assumes spherical, convex cluster geometry with uniform feature scaling. In real-world consumer behavior, high-net-worth users may form non-convex, elongated distributions.
- **Future Scope**: Experiment with Gaussian Mixture Models (GMM) with expectation-maximization or HDBSCAN for density-based hierarchical clustering as user volume scales.

### 6.2 Static Monthly Clustering Cadence
- **Limitation**: User segmentation is computed on monthly aggregated RFM metrics. If a user's financial habits shift radically mid-month, their cluster persona does not update until the next billing cycle.

---

## 7. Distributed Infrastructure & Regulatory Boundaries

### 7.1 Single-Node Docker Compose Deployment
- **Limitation**: FinovaX is orchestrated via Docker Compose on a single workstation or virtual machine. While optimal for academic demonstration and single-server production, it does not provide planetary-scale horizontal pod autoscaling, multi-datacenter replication, or automated failover across geographic regions.
- **Future Scope**: Migrate container definitions to Kubernetes Helm charts with Istio service mesh and Horizontal Pod Autoscalers (HPA).

### 7.2 Open Banking & Account Aggregator (AA) Licensing
- **Limitation**: Production integration with the RBI-regulated Account Aggregator (AA) ecosystem (Setu, OneMoney, Anumati) requires Non-Banking Financial Company (NBFC-AA) licenses and institutional cryptographic keys. FinovaX incorporates an AA consent workflow and mock integration, but live production API access is subject to Indian banking regulatory approval.

---

## 8. Summary Matrix

| Domain | Verified Limitation | Mitigation Implemented | Future Scope |
| :--- | :--- | :--- | :--- |
| **Parsing** | Scanned passbooks/photos unreadable | Traps error; requires digital e-statement | Tesseract OCR / Google Vision pipeline |
| **Parsing** | 10 MB in-memory upload limit | Enforced at Multer middleware | Background worker queues (BullMQ + Redis) |
| **NLP** | Regional language merchant strings | Fallback to 'Other'; confidence scoring | Multilingual IndicBERT embeddings |
| **Fraud** | Precision is 42.4% (False positives exist) | Asymmetric risk design; user verification | Graph Neural Networks (GNN) on merchant networks |
| **Forecast** | Cannot foresee black-swan shocks | Uncertainty bounds + minimum history guard | Macroeconomic index ingestion |
| **Deploy** | Single-node Docker Compose | Resource limits + health checks | Kubernetes + AWS EKS deployment |

