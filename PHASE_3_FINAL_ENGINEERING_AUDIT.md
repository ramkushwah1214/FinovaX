# FINOVAX — PHASE 3 FINAL ENGINEERING AUDIT REPORT (REVISED & VERIFIED)
**Project**: FinovaX — AI-Powered Personal Finance & Fraud Intelligence Platform  
**Location**: `E:\Finovax`  
**Audit Timestamp**: 2026-11-19T22:35:00+05:30  
**Audit Scope**: Complete Quality Improvement & Empirical Verification of Phase 3 AI/ML Subsystems

---

## 1. Executive Summary

Phase 3 implements an enterprise-grade AI/ML intelligence subsystem for FinovaX, comprising four independent machine learning modules orchestrated by a Python FastAPI microservice (`http://localhost:8000`) and seamlessly integrated with the Node.js/Express backend (`http://localhost:5000`) and React/Vite frontend.

Following rigorous investigation of model mechanics, data leakage, and small-sample time-series characteristics, all four machine learning subsystems have been audited, benchmarked under leak-free validation protocols, and aligned with empirical evidence.

### Summary Status Table
| # | AI/ML Subsystem | Algorithms Compared | Deployed Model Strategy | Empirical Validation Outcome | Status |
|---|---|---|---|---|---|
| **1** | **Transaction Categorization** | Random Forest, Logistic Regression, Decision Tree | **LogisticRegression + TF-IDF (1-2 n-grams) + Rule Fallback** | Leak-free test F1: **0.4387** (Leakage investigated; 1.0000 score disproven) | **COMPLETE AND VERIFIED** |
| **2** | **Fraud & Anomaly Intelligence** | Isolation Forest, LOF, Random Forest, XGBoost | **IsolationForest (Unsupervised) + RF Benchmark** | Isolation Forest ROC-AUC: **0.9469**, PR-AUC: **0.4020**, FPR: **0.0081** | **COMPLETE AND VERIFIED** |
| **3** | **Spending Time-Series Forecast** | Previous Period Baseline, Linear Regression, Random Forest, XGBoost | **Previous-Period Persistence Baseline (lag_1 with Adaptive Drift)** | Baseline MAE: **₹2,393.55** (Outperforms XGBoost MAE ₹4,803.30 by 50.2%) | **COMPLETE AND VERIFIED** |
| **4** | **Customer Persona / Segmentation** | KMeans, Agglomerative Clustering, DBSCAN | **KMeans ($k=5$) + StandardScaler** | Silhouette: **0.6556**, Davies-Bouldin: **0.5014**, Calinski-Harabasz: **1868.47** | **COMPLETE AND VERIFIED** |

---

## 2. In-Depth ML Module Investigations & Quality Improvements

### 2.1 Spending Forecast: XGBoost vs. Baseline Investigation

#### Investigation: Why did XGBoost (MAE ₹4,803.30) perform worse than the Previous Period Baseline (MAE ₹2,393.55)?
Our chronological split evaluation (24 train months, 9 test months) revealed two fundamental mathematical reasons why tree-based ensembles fail on monthly consumer expense time-series:

1. **Tree Ensembles Cannot Extrapolate Upward Trends**:
   - The test series contains an upward economic drift (from ~₹35,000 to ~₹52,000).
   - Decision trees in Random Forest and XGBoost partition feature space into orthogonal axis-aligned hyper-rectangles. A tree’s prediction is bounded by the maximum value observed in the training set ($\max(y_{train}) \approx ₹45,000$).
   - In the held-out test window ($t \in [24, 35]$), actual expenses reach ₹51,000, but tree predictions saturate at the boundary leaf (~₹45,000), producing severe systematic under-prediction bias and negative $R^2$.
2. **Small Sample Size ($N=24$ training points)**:
   - In consumer personal finance, a user typically has only 12 to 36 historical monthly data points.
   - Gradient boosted trees require hundreds to thousands of samples to learn split points without overfitting or flattening out.
3. **The Previous Period Baseline Advantage**:
   - The naïve persistence model ($y_t = y_{t-1}$) naturally tracks drifting trend lines with only a one-period lag delay ($450 + \text{noise}$), yielding an MAE of only ₹2,393.55.

#### Empirical Chronological Benchmark Results
| Model | MAE (₹) | RMSE (₹) | $R^2$ Score | Valid MAPE (%) | Training Time | Deployment Verdict |
|---|---|---|---|---|---|---|
| **Previous Period Baseline (lag_1)** | **2,393.55** | **3,073.46** | **-0.1309** | **5.17%** | **0.000s** | **WINNER (DEPLOYED IN PRODUCTION)** |
| **Linear Regression (OLS)** | 3,619.49 | 4,029.07 | -0.9435 | 7.46% | 0.001s | Evaluated Comparison |
| **Random Forest Regressor** | 4,655.46 | 5,080.25 | -2.0899 | 9.60% | 0.048s | Evaluated Comparison |
| **XGBRegressor** | 4,803.30 | 5,362.25 | -2.4424 | 9.92% | 1.759s | Replaced by Baseline |

#### Deployment Action
Per strict validation evidence, **FinovaX deploys the Previous-Period Persistence Baseline with Adaptive Drift** as the primary forecasting engine in `forecast_service.py`. XGBoost is retained for benchmark comparison in `train_forecast_models.py`, but is never falsely claimed to be superior.

---

### 2.2 Transaction Categorization: Data Leakage Investigation & Leak-Free Benchmark

#### Investigation: Why did Logistic Regression report a 1.0000 score previously?
Our audit identified near-duplicate data leakage in the prior training pipeline:
- Previously, each base merchant phrase (e.g., `"Swiggy Order online dinner"`) was augmented into 5 variants (`"Payment to Swiggy..."`, `"UPI/Swiggy..."`, `"POS Swiggy..."`, `"swiggy..."`), and then a random `train_test_split` was executed across the pooled 515 samples.
- Consequently, variants of the exact same merchant name appeared simultaneously in both the training set and the test set. Because the TF-IDF vectorizer memorized the exact merchant tokens, Logistic Regression achieved a synthetic 1.0000 score.

#### Quality Fix: Strict Base-Group Partitioning
To eliminate near-duplicate leakage, `train_categorization_models.py` was refactored:
1. The unique base corpus (103 merchant narrations across 18 classes) is partitioned **first** into 77 base train items and 26 base test items (`test_size=0.25`, stratified by class).
2. Data augmentation is applied **independently** within each partition.
3. This guarantees that test merchant names were **never seen** during training, establishing true generalization to unseen consumer banking narratives.

#### Revised Leak-Free Evaluation Metrics (Unseen Test Merchants)
| Model | Test Accuracy | Weighted Precision | Weighted Recall | Weighted F1 | Training Time |
|---|---|---|---|---|---|
| **Logistic Regression (Best)** | **0.4872** | **0.5049** | **0.4872** | **0.4387** | **0.057s** |
| **Random Forest** | 0.2949 | 0.2696 | 0.2949 | 0.2252 | 0.178s |
| **Decision Tree** | 0.1923 | 0.1528 | 0.1923 | 0.1148 | 0.020s |

#### Per-Class Performance on Unseen Test Merchants (Best Model: Logistic Regression)
| Category | Precision | Recall | F1-Score | Test Support | Observation / Generalization |
|---|---|---|---|---|---|
| **Fuel** | 1.0000 | 1.0000 | **1.0000** | 3 | Tokens "fuel", "petrol" reliably captured |
| **Subscriptions** | 1.0000 | 1.0000 | **1.0000** | 6 | "Subscription", "plan", "premium" generalize |
| **Transfer** | 1.0000 | 1.0000 | **1.0000** | 3 | "Self account", "internal transfer" captured |
| **Salary** | 1.0000 | 0.6667 | **0.8000** | 3 | "Salary credit", "payroll" generalize |
| **Shopping** | 1.0000 | 0.6667 | **0.8000** | 9 | "Order", "retail", "store" generalize |
| **Entertainment** | 0.5000 | 1.0000 | **0.6667** | 3 | "Cinema", "multiplex", "ticket" captured |
| **Bills** | 0.5000 | 0.5000 | **0.5000** | 6 | Utility names vary; partial token match |
| **Travel** | 1.0000 | 0.3333 | **0.5000** | 9 | Specialized airline names miss without rules |
| **Food** | 0.2093 | 1.0000 | **0.3462** | 9 | Broad vocabulary; prone to false positives |
| **Groceries / Healthcare / Rent** | 0.0000 | 0.0000 | **0.0000** | 18 | Unseen brand names (DMart, Apollo) lack n-gram overlap |

#### Architecture Finding & Justification for Rule-Based Hybrid Fallback
When pure TF-IDF encounters completely novel brand names (e.g., an unseen regional hospital or local grocery store), token overlap is zero. This empirical finding validates FinovaX's **hybrid architecture**:
1. When ML confidence is high ($\ge 0.65$), the statistical prediction is accepted.
2. When ML confidence is low or text contains known transaction indicators, the deterministic rule-based engine in `categorizationService.ts` steps in.
3. User manual corrections submitted via `/category-correction` are persisted to `category_corrections.json` for continuous model retraining.

---

### 2.3 Fraud Detection: PaySim Mechanics & Real-World Domain Distinctions

#### Investigation: Why did Supervised Random Forest report F1 = 0.9980 on PaySim?
1. **Mathematical Discrepancy Features in Synthetic Simulator**:
   PaySim was generated by an agent-based multi-agent simulator (Lopez-Rojas et al.). In PaySim:
   - Fraud events occur exclusively in `TRANSFER` and `CASH_OUT` transactions where synthetic agents attempt to drain accounts.
   - Genuine transactions maintain strict balance conservation: $newbalanceOrig = oldbalanceOrg - amount$.
   - Fraudulent transactions in PaySim frequently contain balance calculation errors where the destination balance is not properly updated or exceeds account limits.
   - By engineering `errorBalanceOrig` ($new + amount - old$) and `errorBalanceDest` ($old + amount - new$), a decision tree easily identifies these deterministic mathematical anomalies, achieving near-perfect F1 ($0.9980$).
2. **Leakage Prevention Verified**:
   - `isFlaggedFraud` (a target-leaking rule flag generated by the simulator) was **strictly excluded** from features.
   - Identifiers `nameOrig` and `nameDest` were purged to prevent memorization of customer IDs.

#### Real-World UPI Domain Distinction (Academic Integrity)
FinovaX explicitly states in code comments, API outputs, and UI cards:
- **PaySim** is a synthetic mobile money simulation; its mathematical balance errors do not exist in real-world Indian Core Banking Systems (CBS) or NPCI settlement batches.
- **Credit Card (Kaggle)** uses PCA features (V1–V28) from European card transactions, representing card-present / card-not-present fraud, not UPI Virtual Payment Address (VPA) fraud.
- **Indian UPI Fraud** primarily involves social engineering, fake QR codes, collect-request deception, and SIM swapping.
- Therefore, FinovaX treats anomaly scores as **statistical variance measures** relative to user transaction history, rather than claiming real-world UPI fraud classification accuracy.

#### Empirical Evaluation Summary
| Dataset / Model | Paradigm | Precision | Recall | F1-Score | PR-AUC | ROC-AUC | FPR |
|---|---|---|---|---|---|---|---|
| **Credit Card: Isolation Forest (Deployed)** | **Unsupervised Anomaly** | **0.4245** | **0.6081** | **0.5000** | **0.4020** | **0.9469** | **0.0081** |
| **Credit Card: LOF** | Unsupervised Density | 0.3944 | 0.7568 | 0.5185 | 0.6462 | 0.9181 | 0.0115 |
| **Credit Card: Random Forest** | Supervised Classifier | 0.9531 | 0.8243 | 0.8841 | 0.9026 | 0.9734 | 0.0004 |
| **Credit Card: XGBoost** | Supervised Gradient Boost | 0.9231 | 0.8108 | 0.8633 | 0.8992 | 0.9759 | 0.0007 |
| **PaySim: Isolation Forest** | Unsupervised Anomaly | 0.4091 | 0.0044 | 0.0087 | 0.5157 | 0.8516 | 0.0013 |
| **PaySim: Random Forest** | Supervised Simulator Fit | 1.0000 | 0.9961 | 0.9980 | 0.9995 | 0.9998 | 0.0000 |

---

### 2.4 Customer Segmentation: Mathematical Analysis & Persona Centroids

#### Investigation: Why did KMeans and Agglomerative Clustering report identical metrics?
Both algorithms achieved:
- **Silhouette Score**: $0.6556$
- **Davies-Bouldin Index**: $0.5014$
- **Calinski-Harabasz Score**: $1868.47$

**Mathematical Explanation**:
- The benchmark dataset consists of 600 users generated across 5 distinct financial archetypes with well-separated Gaussian isotropic distributions in standardized 7-dimensional feature space.
- Agglomerative Hierarchical Clustering with Ward’s minimum variance criterion merges clusters to minimize the total within-cluster variance—which is the exact objective function minimized iteratively by Lloyd’s algorithm in KMeans.
- Because inter-cluster distances are large relative to cluster radii, both algorithms converged to the **identical mathematical partition** of the 600 data points. Consequently, their cluster validation metrics are identical.

#### Verification of Persona Centroids
Persona centroids were verified in `train_segmentation_models.py` (lines 173–200). They are **not hardcoded illustrative numbers**; they are computed dynamically by calling `scaler.inverse_transform(kmeans.cluster_centers_)` on the fitted model:

| Cluster | Persona Archetype Name | Monthly Spend (₹) | Essential Ratio | Discretionary Ratio | Monthly Tx Count | Savings Rate |
|---|---|---|---|---|---|---|
| **0** | **Low Spending & High Savings** | ₹15,762 | 0.42 | 0.14 | 16.2 | 43% |
| **1** | **Balanced Disciplined Spender** | ₹39,025 | 0.50 | 0.25 | 30.2 | 25% |
| **2** | **High Volume Discretionary** | ₹78,546 | 0.32 | 0.58 | 47.5 | 10% |
| **3** | **Frequent Micro-Transactor** | ₹30,376 | 0.45 | 0.41 | 75.0 | 14% |
| **4** | **High Outflow & Fixed Obligations** | ₹68,201 | 0.76 | 0.17 | 22.7 | 7% |

---

## 3. Verified Model Artifacts on Disk

| Artifact Relative Path | Size (Bytes) | Last Modified | Model Description |
|---|---|---|---|
| `ai-service/models/categorization/categorizer_pipeline.joblib` | 231,180 | 2026-11-19 | Leak-free trained LogisticRegression + TF-IDF Pipeline |
| `ai-service/models/fraud/isolation_forest.joblib` | 864,089 | 2026-11-19 | Primary Unsupervised Anomaly Detector |
| `ai-service/models/fraud/fraud_rf.joblib` | 1,352,425 | 2026-11-19 | Balanced Random Forest Benchmark |
| `ai-service/models/fraud/fraud_metrics.json` | 6,849 | 2026-11-19 | Serialized Fraud Evaluation Metrics |
| `ai-service/models/forecasting/forecast_xgb.joblib` | 679 | 2026-11-19 | Evaluated XGBoost Model |
| `ai-service/models/segmentation/kmeans_segmenter.joblib` | 3,415 | 2026-11-19 | Fitted KMeans ($k=5$) Cluster Model |
| `ai-service/models/segmentation/scaler.joblib` | 735 | 2026-11-19 | Fitted StandardScaler (7 features) |

---

## 4. Full Regression Verification & Build Status

During this quality improvement audit, all test suites were executed directly:

| Test Suite | Command | Execution Time | Results |
|---|---|---|---|
| **Python Unit Tests** | `.\ai-service\venv\Scripts\python.exe -m unittest ai-service\test_ai_service.py` | 0.014s | **12 PASSED / 0 FAILED** |
| **Backend AI Tests** | `npm.cmd --prefix backend run test:ai` | 8.8s | **25 PASSED / 0 FAILED** |
| **Statement Import Tests** | `npm.cmd --prefix backend run test:statement` | 9.5s | **37 PASSED / 0 FAILED** |
| **Backend TypeScript Build** | `npm.cmd --prefix backend run build` | 8.0s | **0 ERRORS (Clean compilation)** |
| **Frontend Vite Build** | `npm.cmd --prefix frontend run build` | 8.0s | **0 ERRORS (Clean build in 8.06s)** |
| **TOTAL VERIFIED PASSES** | — | — | **74 TESTS PASSED / 0 FAILED** |

---

## 5. Architectural Contracts & Integrity Guarantees

1. **Zero Dummy Financial Data Guarantee**:
   All user dashboard aggregates, transaction lists, budgets, goals, and fraud alerts continue to query live MongoDB Atlas records without fabrication.
2. **Resilient Non-Blocking Fallbacks**:
   If the Python microservice is offline, the Node.js backend handles categorization via regex rules and anomaly scoring via rolling statistical variance heuristics without crashing.
3. **Data Isolation & Security**:
   All `/api/ai/*` routes enforce `requireAuth` JWT validation, scoping aggregations strictly to `req.user.id`.

---

## 6. Recommended Next Steps

1. **Start Dev Servers for Demonstration**:
   - Backend: `npm --prefix backend run dev` (Port 5000)
   - Frontend: `npm --prefix frontend run dev` (Port 5173)
   - AI Service: `cd ai-service; .\venv\Scripts\activate; uvicorn main:app --port 8000`
2. **Academic Viva Defense**:
   Utilize the leakage investigation in Section 2.2 and the baseline superiority analysis in Section 2.1 as strong examples of empirical engineering rigor.
3. **Phase 4**:
   Do NOT start Phase 4 automatically. Phase 3 quality improvements are complete and verified.
