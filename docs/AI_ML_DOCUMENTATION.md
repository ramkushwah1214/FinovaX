# FinovaX — Machine Learning & AI Intelligence Specification

**Microservice Framework:** Python 3.11, FastAPI, Uvicorn, Scikit-learn, XGBoost, Pandas, NumPy, Joblib  
**Architecture:** Decoupled ML Microservice (`ai-service`) with REST inference endpoints, empirical benchmark reports, and persistent active learning feedback.  

---

## 1. Machine Learning Philosophy & Academic Standards

In consumer fintech, many systems fabricate accuracy claims or deploy deep neural networks that overfit sparse personal financial records. **FinovaX adheres to empirical, metric-driven engineering principles:**
1. **Zero Data Fabrication:** All models are evaluated on actual held-out test splits and verified benchmark corpora.
2. **Naive Baseline Superiority Acknowledgment:** Where a simple statistical baseline minimizes Out-of-Sample error over a complex ensemble, the baseline is deployed.
3. **No Uncalibrated Probabilities:** Anomaly scores are presented as explainable risk tiers (LOW, MEDIUM, HIGH) rather than misleading "exact fraud probabilities."
4. **Active Learning Feedback Loop:** When predictions are corrected by users, corrections are persisted to disk to improve subsequent training cycles.

---

## 2. Module 1: Transaction Categorization Engine

### 2.1 Problem Formulation & Feature Engineering
- **Task:** Multi-class text classification mapping raw transaction narrations (e.g. `Swiggy Bangalore Order`, `IRCTC Ticket Booking`, `SALARY CREDIT OCT 2026`) to 16 standardized consumer categories.
- **Preprocessing Pipeline:**
  - Tokenization and lowercase conversion.
  - Regex stripping of transaction reference numbers, dates, and currency symbols (`₹`, `Rs`, `INR`).
  - Sublinear Term Frequency Vectorization ($1 + \log(\text{tf})$) with 1-2 word n-grams and minimum document frequency thresholding.
  - Stratified Group K-Fold splitting by merchant base token to prevent data leakage between training and evaluation splits.

### 2.2 Empirical Benchmark Evaluation Results

| Algorithm | 5-Fold Cross-Val $F_1$ | Held-Out Accuracy | Test Precision | Test Recall | Test Weighted $F_1$ | Test Macro $F_1$ | Training Duration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LinearSVC (Calibrated)** | **1.0000** | **0.7778** | **0.8126** | **0.7778** | **0.7755** | **0.7759** | 0.35 s |
| **Logistic Regression** | **1.0000** | **0.7778** | **0.7906** | **0.7778** | **0.7666** | **0.7675** | 0.20 s |
| **Multinomial Naive Bayes**| 1.0000 | 0.7333 | 0.7580 | 0.7333 | 0.7148 | 0.7087 | 0.02 s |
| **Random Forest** | 0.9525 | 0.6756 | 0.7996 | 0.6756 | 0.6707 | 0.6656 | 0.19 s |
| **Decision Tree** | 0.5690 | 0.3733 | 0.6332 | 0.3733 | 0.4076 | 0.4173 | 0.04 s |

### 2.3 Operational Architecture: Hybrid Model with Active Learning
- **Primary:** Serialized TF-IDF + Classifier pipeline (`categorizer_pipeline.joblib`, 2.54 MB).
- **Rule-Based Fallback:** Instant deterministic keyword matcher (`categorization_service.py`) for unambiguous inflows (e.g. `salary`, `dividend`) and high-frequency merchants (e.g. `swiggy`, `uber`, `netflix`).
- **Active Learning Storage:** User category corrections submitted via `POST /predict/category/correct` are appended to `category_corrections.json` in the persistent Docker volume `finovax-ai-corrections`.

---

## 3. Module 2: Fraud & Anomaly Intelligence Engine

### 3.1 Problem Formulation & Imbalance Challenge
Fraudulent transactions in retail banking typically represent less than 0.1% of all operations. Training a purely supervised model directly on personal user data is impossible because individual consumers have zero labeled fraud records.

FinovaX implements a **two-tiered anomaly triage strategy:**
1. **Unsupervised Isolation Forest:** Measures how easily an incoming transaction can be isolated across feature space (amount, hour of day, day of week, deviation from user baseline).
2. **Contextual Historical Velocity Analysis:** Computes rolling historical category expenditure $Z$-scores and 24-hour transaction frequency.

### 3.2 Empirical Benchmark Evaluation Results
Benchmarked against standard financial anomaly datasets (Kaggle Credit Card 284,807 rows and PaySim 6.36M simulated mobile transactions):

| Model | Approach | Threshold | Precision | Recall | $F_1$ Score | ROC-AUC | PR-AUC | False Positive Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Isolation Forest (Deployed)**| **Unsupervised** | **0.5917** | **0.4245** | **0.6081** | **0.5000** | **0.9469** | **0.4020** | **0.0081 (0.81%)** |
| **Local Outlier Factor (LOF)** | Unsupervised | 0.6120 | 0.3944 | 0.7568 | 0.5185 | 0.9181 | 0.6462 | 0.0115 (1.15%) |
| **Random Forest (Benchmark)** | Supervised | 0.5000 | 0.9531 | 0.8243 | 0.8841 | 0.9734 | 0.9026 | 0.0004 (0.04%) |
| **XGBoost (Comparison)** | Supervised | 0.5000 | 0.9231 | 0.8108 | 0.8633 | 0.9759 | 0.8992 | 0.0007 (0.07%) |

### 3.3 Explainable Risk Scoring & Triage
The raw Isolation Forest decision score is normalized into a continuous scale (0 to 100). Transactions are triaged into actionable bands with explainable justifications:
- **LOW Risk (0–40):** Standard transaction consistent with normal historical habits.
- **MEDIUM Risk (41–69):** Moderate anomaly (e.g., amount is $> 2\sigma$ above category mean or executed during off-peak hours).
- **HIGH Risk (70–100):** Severe anomaly (e.g., amount is $> 3.5\sigma$ above historical mean, rapid consecutive velocity, or extreme isolation score). Triggers a pending `FraudAlert` in the database.

---

## 4. Module 3: Spending Time-Series Forecasting

### 4.1 Empirical Model Selection & Baseline Superiority
A critical finding during Phase 3 was that non-linear gradient boosted decision trees (XGBoost) severely overfit short consumer spending series. When evaluated across identical chronological hold-out validation windows, the **Previous-Period Persistence Baseline** ($y_t = y_{t-1}$) dramatically outperformed XGBoost:

| Model / Algorithm | Out-of-Sample MAE | Out-of-Sample RMSE | $R^2$ Score | Out-of-Sample MAPE |
| :--- | :--- | :--- | :--- | :--- |
| **Previous-Period Persistence Baseline** | **₹2,393.55** | **3,073.46** | **-0.1309** | **5.17%** |
| **Linear Regression** | ₹3,619.49 | 4,029.07 | -0.9435 | 7.46% |
| **Random Forest Regressor** | ₹4,655.46 | 5,080.25 | -2.0899 | 9.60% |
| **XGBoost Regressor** | ₹4,803.30 | 5,362.25 | -2.4424 | 9.92% |

### 4.2 Production Deployment Strategy
In adherence to metric-driven software engineering, **the Previous-Period Baseline was deployed in `forecast_service.py`**. When a user has at least 3 months of historical records, the service generates a 3-month forward projection with statistical confidence intervals based on rolling variance:
$$\text{Lower Bound} = \hat{y} - 1.96 \cdot \frac{\sigma}{\sqrt{n}}, \quad \text{Upper Bound} = \hat{y} + 1.96 \cdot \frac{\sigma}{\sqrt{n}}$$

If fewer than 3 months of history exist, the endpoint returns status `INSUFFICIENT_DATA`, preventing ungrounded speculation.

---

## 5. Module 4: Customer Spending Behavioral Segmentation

### 5.1 Multi-Dimensional Feature Space
Consumers are represented as standardized vectors across four behavioral dimensions:
1. `monthlyAvgSpend`: Total average monthly outflow.
2. `essentialRatio`: Ratio of spending in Groceries, Utilities, Healthcare, and Housing.
3. `discretionaryRatio`: Ratio of spending in Dining, Entertainment, Travel, and Shopping.
4. `transactionFrequency`: Average transaction count per calendar month.

### 5.2 Clustering Evaluation & Model Comparison

| Algorithm | Clusters ($k$) | Silhouette Score | Davies-Bouldin Index | Calinski-Harabasz Score |
| :--- | :--- | :--- | :--- | :--- |
| **K-Means (Standardized)** | **5** | **0.6556** | **0.5014** | **1,868.47** |
| **Agglomerative Clustering** | 5 | 0.6556 | 0.5014 | 1,868.47 |
| **DBSCAN** | 4 (outliers isolated) | 0.6398 | 0.5286 | 1,210.58 |

### 5.3 Identified Personas & Personalized Recommendations
- **Cluster 0: Low Spending & High Savings:** Frugal, low frequency. *Recommendation: Explore tax-saving investment instruments (ELSS / PPF).*
- **Cluster 1: Moderate Balanced Spender:** Predictable 50/30/20 budget adherence. *Recommendation: Establish automated savings milestones for emergency fund building.*
- **Cluster 2: High Volume Discretionary:** High frequency, high online food and entertainment ratio. *Recommendation: Establish strict weekly discretionary category sub-limits.*
- **Cluster 3: Fixed-Obligation Heavy:** High ratio of recurring subscriptions and utility bills. *Recommendation: Audit recurring subscriptions to eliminate unused services.*
- **Cluster 4: Volatile Irregular Transactor:** Highly fluctuating monthly outflow. *Recommendation: Buffer 3 months of living expenses in a liquid savings account.*

---

## 6. Pre-Trained Artifact Inventory

All pre-trained models are verified present in `ai-service/models/`:

```
ai-service/models/
├── categorization/
│   └── categorizer_pipeline.joblib (2.54 MB)
├── forecasting/
│   └── forecast_xgb.joblib (679 B)
├── fraud/
│   ├── isolation_forest.joblib (864 KB)
│   ├── fraud_rf.joblib (1.35 MB)
│   └── fraud_metrics.json (6.85 KB)
└── segmentation/
    ├── kmeans_segmenter.joblib (3.75 KB)
    └── scaler.joblib (735 B)
```

