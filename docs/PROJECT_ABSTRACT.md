# FinovaX — Project Abstract

**Project Title:** FinovaX: An AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Degree / Program:** Bachelor of Technology in Computer Science & Engineering (Final-Year Major Project)  
**Institution:** Faculty of Engineering and Technology  
**Academic Year:** 2026–2027  
**Technology Stack:** React 18, TypeScript, Tailwind CSS, Node.js 20, Express, MongoDB Atlas, Python 3.11, FastAPI, Scikit-learn, XGBoost, Docker & Docker Compose  

---

## 1. Project Overview

In the modern financial ecosystem, rapid digitization, the exponential growth of Unified Payments Interface (UPI) micro-transactions, and multi-bank account proliferation have created severe information asymmetry for retail consumers. Traditional Personal Finance Management (PFM) applications remain passive digital ledgers requiring tedious manual data entry, relying on rigid static budgets, and lacking automated anomaly or fraud intelligence.

**FinovaX** is an end-to-end, production-grade, containerized personal finance and fraud intelligence web platform. It unifies multi-format financial statement ingestion (CSV, XLSX, PDF, Google Pay UPI), real-time machine learning transaction categorization, unsupervised transaction anomaly scoring, empirical time-series spending forecasting, and multi-dimensional behavioral customer persona clustering. Built on a modular microservices architecture consisting of a React Single-Page Application (SPA) served via Nginx, a Node.js Express API Gateway, a Python FastAPI Machine Learning microservice, and a cloud-hosted MongoDB Atlas database, FinovaX bridges the critical gap between passive expense tracking and proactive, automated financial security.

---

## 2. Problem Statement

1. **Tedious Manual Ingestion & Statement Heterogeneity:** Retail consumers transact across disparate institutions (e.g., HDFC, SBI, ICICI, Axis, DCB Bank) and payment gateways (Google Pay UPI). Statements arrive in incompatible formats with diverse column headers, multiline narrations, non-standard date formats, and accounting nuances (e.g., distinguishing refunds from income, or account transfers from expenses).
2. **Brittle Categorization:** Traditional rule-based keyword matchers fail on evolving merchant merchant identification (e.g., ambiguous UPI strings such as `UPI/432198765432/SWIGGY/PAY`).
3. **Absence of Real-Time Anomaly & Fraud Guardrails:** Retail users rarely identify unauthorized recurring deductions, unexpected spike transactions, or anomalous off-hour spending until monthly reviews.
4. **Unrealistic Forecasting & Segmentation:** Most commercial finance applications rely on complex black-box deep learning models that overfit small personal spending histories or generate fabricated accuracy claims without benchmarking against historical baselines.
5. **Data Privacy & Tenant Security:** Financial records require strict cryptographic session management, role-based tenant isolation, defense-in-depth sanitization against NoSQL injection, and secure containerized infrastructure.

---

## 3. Proposed Solution

FinovaX resolves these challenges through an integrated, privacy-first software and machine learning engineering architecture:
- **Smart Multi-Format Ingestion Engine:** A modular, streaming parsing pipeline supporting bank statements (CSV, Excel, native PDFs with OCR detection fallback, and Google Pay UPI activity statements with 12-digit UTR extraction) and multi-tier duplicate detection (exact hash, semantic fuzzy matching, and temporal windowing).
- **Hybrid Machine Learning Categorization:** A TF-IDF vectorization and classifier pipeline (comparing Logistic Regression, Calibrated LinearSVC, Multinomial Naive Bayes, and Random Forest) paired with an active learning correction loop that records user feedback to a persistent Docker volume.
- **Explainable Anomaly & Fraud Triage Engine:** An unsupervised Isolation Forest anomaly detection model that computes empirical contamination thresholds on non-fraud transaction streams, combined with statistical Z-score velocity checks to provide explainable risk indicators without misleading probability claims.
- **Empirical Baseline-First Forecasting:** Chronologically validated time-series expenditure forecasting where empirical validation selected the robust Previous-Period Persistence Baseline (MAE ₹2,393.55) over complex XGBoost regressors (MAE ₹4,803.30).
- **Behavioral Persona Clustering:** Standardized K-Means clustering ($k=5$, Silhouette Score 0.6556) segmenting consumers into actionable archetypes (e.g., *High Volume Discretionary*, *Low Spending High Savings*) to provide personalized financial wellness recommendations.
- **Enterprise-Grade Containerization:** Full Docker Compose orchestration with healthcheck-driven dependency ordering, non-root container users, same-origin Nginx reverse proxying, and encrypted TLS communication with MongoDB Atlas.

---

## 4. Objectives

1. **Architect a Multi-Tier System:** Design and implement a robust microservices architecture decoupling UI, business domain logic, and ML inference.
2. **Build an Automated Ingestion Pipeline:** Ingest bank statements across 4 major formats (CSV, XLSX, PDF, GPay) with 100% accounting accuracy (refund vs income; self-transfer vs expense).
3. **Develop & Empirically Validate 4 Independent ML Modules:**
   - Text-based Transaction Categorization ($F_1 \ge 0.76$).
   - Unsupervised Fraud & Outlier Anomaly Detection (Isolation Forest, ROC-AUC $\ge 0.94$).
   - Spending Forecast Model selected by empirical hold-out error minimization.
   - Behavioral Persona K-Means Segmenter ($k=5$).
4. **Implement Defense-in-Depth Security:** Enforce Bcrypt password hashing (work factor 12), HttpOnly cookie session management, Mongoose `select: false` on password hashes, strict parameter hex validation, and cross-user tenant isolation.
5. **Containerize & Orchestrate for Production:** Containerize using multi-stage Dockerfiles and Docker Compose with health checks, memory limits, and persistent data volumes.
6. **Achieve 100% Test Pass Rate:** Maintain comprehensive automated test coverage across unit, integration, statement parsing, security, and ML inference suites.

---

## 5. Scope of the Project

- **In Scope:**
  - Full-stack web application with 27 interactive pages (Dashboard, Transactions, Budgets, Goals, Bills, Reports, Fraud Intelligence, Statement Import, Persona Clustering, Assistant).
  - Ingestion of Indian bank formats (HDFC, SBI, ICICI, Axis, DCB Bank) and Google Pay UPI PDFs.
  - Active learning transaction feedback and model comparison API endpoints.
  - Complete Docker Compose deployment pipeline.
  - Comprehensive security regression verification (tenant isolation, input validation, upload limits).
- **Out of Scope (Future Work):**
  - Live Account Aggregator (RBI NBFC-AA) API integration requiring commercial banking licenses.
  - Direct SMS scraping on mobile devices.
  - Automatic debit card freezing / banking API write actions.
  - Multi-tenant enterprise SaaS billing tiers.

---

## 6. Expected Outcomes & Impact

FinovaX delivers a complete, verified, academic-standard software product for final-year engineering evaluation. It demonstrates:
- **Engineering Rigor:** Transparent, verifiable machine learning metrics without data fabrication or uncalibrated statistical claims.
- **Reliability:** 198 automated test assertions passing with 0 failures across 5 test suites.
- **Production Readiness:** One-command startup via `docker compose up -d`, healthy container statuses, and isolated internal networking.
- **Academic Value:** A model case study in software engineering best practices, microservice decoupling, and realistic AI adoption in personal fintech.

