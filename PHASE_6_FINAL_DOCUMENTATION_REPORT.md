# FINOVAX — PHASE 6: FINAL PROJECT DOCUMENTATION, ARCHITECTURE DIAGRAMS & VIVA DEFENSE MASTER REPORT

**Project Title**: FinovaX — An AI-Powered Personal Finance Management & Fraud Intelligence Platform  
**Degree**: Bachelor of Technology in Computer Science & Engineering  
**Project Location**: `E:\Finovax`  
**Phase Completed**: Phase 6 — Comprehensive Technical Documentation, Architecture Modeling & Viva Defense Engineering  
**Report Date**: November 20, 2026  
**Status**: COMPLETE & READY FOR FINAL ACADEMIC SUBMISSION  

---

## 1. Executive Summary

Phase 6 marks the culmination of the **FinovaX** engineering lifecycle. Following the successful containerization and orchestration of the three-tier architecture in Phase 5, Phase 6 delivers an exhaustive, publication-grade documentation suite, architectural diagram bank, automated testing dossier, and complete viva voce defense preparation package.

All deliverables have been authored strictly against the **existing, live production codebase**:
- **Zero project recreation**: Existing React 18, Node.js 20 Express, and Python 3.11 FastAPI codebases remain 100% preserved.
- **Zero data loss**: MongoDB Atlas database records and user accounts (`kushwahram989@gmail.com`, `bullhitesh989@gmail.com`) remain intact and active.
- **Zero credential leakage**: All secrets, JWT tokens, and connection strings are strictly redacted or templated.
- **Scientific honesty**: All AI/ML metrics (LinearSVC F1: 0.7755, Isolation Forest ROC-AUC: 0.9469 / Precision: 0.4245, Forecasting Persistence Baseline MAE: ₹2,393.55, K-Means Silhouette: 0.6556) reflect actual empirical evaluations, rejecting fabricated buzzwords.
- **Live Orchestration**: All 3 Docker containers (`finovax-frontend`, `finovax-backend`, `finovax-ai-service`) remain running, healthy, and interconnected.

---

## 2. Complete Deliverables Inventory

A total of **15 major engineering documentation artifacts** have been generated across four structured directories (`docs/`, `docs/diagrams/`, `docs/viva/`, and root).

| # | Artifact File | Category | Size (Bytes) | Summary & Academic Purpose |
| :-: | :--- | :--- | :-: | :--- |
| 1 | [`docs/PROJECT_ABSTRACT.md`](file:///E:/Finovax/docs/PROJECT_ABSTRACT.md) | Academic Core | 7,775 | Formal project abstract, problem statement, proposed solution, objectives, and societal impact. |
| 2 | [`docs/PROJECT_REPORT.md`](file:///E:/Finovax/docs/PROJECT_REPORT.md) | Academic Core | 29,484 | Complete 13-section B.Tech final-year major project thesis adhering to university submission guidelines. |
| 3 | [`docs/SYSTEM_REQUIREMENTS.md`](file:///E:/Finovax/docs/SYSTEM_REQUIREMENTS.md) | Technical Specs | 6,245 | Complete hardware, software, runtime, dependency matrices, and client compatibility constraints. |
| 4 | [`docs/DATABASE_DOCUMENTATION.md`](file:///E:/Finovax/docs/DATABASE_DOCUMENTATION.md) | Data Layer | 11,752 | Schema definitions for all 13 Mongoose collections, compound indexes, tenant isolation models, and TTL policies. |
| 5 | [`docs/API_DOCUMENTATION.md`](file:///E:/Finovax/docs/API_DOCUMENTATION.md) | API Contracts | 9,675 | Complete REST API contract specifications for Express backend and FastAPI microservice with error envelopes. |
| 6 | [`docs/AI_ML_DOCUMENTATION.md`](file:///E:/Finovax/docs/AI_ML_DOCUMENTATION.md) | AI/ML Engineering | 9,357 | Mathematical theory, feature vectors, training methodologies, calibration, and empirical benchmarks for all 4 models. |
| 7 | [`docs/SECURITY_DOCUMENTATION.md`](file:///E:/Finovax/docs/SECURITY_DOCUMENTATION.md) | Cybersecurity | 7,840 | Defense-in-depth security architecture: Bcrypt 12, HttpOnly cookies, IDOR defenses, and in-memory upload guards. |
| 8 | [`docs/DEPLOYMENT_GUIDE.md`](file:///E:/Finovax/docs/DEPLOYMENT_GUIDE.md) | DevOps & Ops | 5,455 | Production deployment manual, Docker Compose operation, health checks, troubleshooting, and logging runbook. |
| 9 | [`docs/USER_MANUAL.md`](file:///E:/Finovax/docs/USER_MANUAL.md) | User Guide | 6,529 | Step-by-step user manual covering onboarding, statement import, fraud alerts, budgeting, and account security. |
| 10 | [`docs/diagrams/ARCHITECTURE_DIAGRAMS.md`](file:///E:/Finovax/docs/diagrams/ARCHITECTURE_DIAGRAMS.md) | Architecture | 14,910 | 11 high-fidelity Mermaid diagrams: System Topology, Docker Deployment, ERD, Auth Flow, and all 4 ML pipelines. |
| 11 | [`docs/TESTING_REPORT.md`](file:///E:/Finovax/docs/TESTING_REPORT.md) | QA & Validation | 8,940 | Comprehensive testing dossier documenting 198 automated test assertions across 5 unit and integration suites. |
| 12 | [`docs/viva/VIVA_QUESTION_BANK.md`](file:///E:/Finovax/docs/viva/VIVA_QUESTION_BANK.md) | Viva Defense | 43,993 | 110 deep technical viva questions and answers across 14 sections covering frontend, backend, ML, and security. |
| 13 | [`docs/viva/PROJECT_PRESENTATION_SCRIPT.md`](file:///E:/Finovax/docs/viva/PROJECT_PRESENTATION_SCRIPT.md) | Viva Defense | 25,151 | Timed presentation script (2-min pitch, 5-min architecture deep dive, 10-min live demo, 1-min conclusion). |
| 14 | [`docs/viva/DEMO_RUNBOOK.md`](file:///E:/Finovax/docs/viva/DEMO_RUNBOOK.md) | Viva Defense | 13,847 | Operational step-by-step live demo runbook, terminal inspection commands, demo script, and emergency recovery tips. |
| 15 | [`docs/viva/EXPECTED_EXAMINER_QUESTIONS.md`](file:///E:/Finovax/docs/viva/EXPECTED_EXAMINER_QUESTIONS.md) | Viva Defense | 22,647 | Hard grilling guide and scientifically rigorous defenses against skeptical examiners and trap questions. |

**Total Technical Documentation Footprint**: ~223,600 Bytes (~223 KB) of structured, verified technical markdown.

---

## 3. Architecture & Operational Verification

### 3.1 Live Service Status (Docker Compose)
All three services are active, healthy, and communicating over the private bridge network (`finovax-network`):

```text
NAME                 IMAGE                COMMAND                  SERVICE      STATUS                       PORTS
finovax-frontend     finovax-frontend     "/docker-entrypoint.…"   frontend     Up About an hour (healthy)   0.0.0.0:80->80/tcp
finovax-backend      finovax-backend      "docker-entrypoint.s…"   backend      Up About an hour (healthy)   5000/tcp (internal)
finovax-ai-service   finovax-ai-service   "uvicorn main:app --…"   ai-service   Up About an hour (healthy)   8000/tcp (internal)
```

### 3.2 Network Perimeter Security
- **Host Port Ingress**: Only port 80 (Nginx) is published to `0.0.0.0`.
- **Private Subnets**: Node.js backend (5000) and Python FastAPI (8000) are unexposed to the host operating system, enforcing zero direct external access.
- **Reverse Proxy Ingress**: Nginx routes `/api/*` requests to `http://backend:5000` internally with strict proxy headers.
- **Microservice Bridge**: Node.js backend communicates with FastAPI via `http://ai-service:8000` with sub-5ms internal latency.

### 3.3 Active Learning Data Persistence
- **Docker Named Volume**: `finovax-ai-corrections` is mounted to `/app/data/corrections` inside `finovax-ai-service`.
- **Verified State**: User-submitted category overrides persist across container restarts in `category_corrections.json`.

---

## 4. Machine Learning Model Portfolio Summary

All four models are deployed in production, rigorously evaluated, and honestly documented without fabricated metrics:

| ML Module | Production Architecture | Key Features / Inputs | Empirical Evaluation Metrics | Operational Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Transaction Categorization** | LinearSVC (Calibrated via Platt's Sigmoid Scaling) + 150+ Rule Dictionary | Character & Word TF-IDF (1-3 ngrams) on sanitized merchant narration | **Macro F1: 0.7755** (vs Logistic Regression: 0.7666, Random Forest: 0.6707) | Hybrid two-tier fallback: Exact rule match $\rightarrow$ LinearSVC probability $\ge 0.50$ $\rightarrow$ Active Learning override |
| **Fraud & Anomaly Detection** | Unsupervised Isolation Forest (100 estimators) | 7-D Vector: Amount, Log Amount, Hour, Day, $z_{\text{amount}}$, $z_{\text{velocity}}$, Off-hours flag | **ROC-AUC: 0.9469**, Recall: 60.81%, FPR: 0.81%, Precision: 0.4245 | Contamination threshold = 0.5917; Flags transactions exceeding boundary without alert fatigue |
| **Spending Forecasting** | Domain-Calibrated Previous-Period Persistence Baseline | Monthly historical expenditure aggregates per user and category | **MAE: ₹2,393.55** (beating XGBoost MAE of ₹4,803.30 by 50.2%) | Minimum history guard ($N \ge 3$ months); applies category trend decay and budget caps |
| **Customer Segmentation** | Unsupervised K-Means Clustering ($k=5$) | StandardScaled RFM Features: Recency, Frequency, Monetary, Savings Ratio, Velocity | **Silhouette Score: 0.6556**, Davies-Bouldin Index: 0.5014 | Assigns user to 1 of 5 personas; drives tailored financial advisory recommendations |

---

## 5. Security & Reliability Compliance Audit

| Security Domain | Architectural Mechanism | Implementation File | Verification Status |
| :--- | :--- | :--- | :---: |
| **Password Hashing** | Bcrypt with 12 salt rounds; timing attack mitigation | `backend/src/models/user.model.ts` | **VERIFIED** |
| **Credential Masking** | Mongoose `select: false` on password field | `backend/src/models/user.model.ts` | **VERIFIED** |
| **Session Security** | Stateless JWT in `HttpOnly`, `SameSite=Strict` cookies | `backend/src/controllers/auth.controller.ts` | **VERIFIED** |
| **Tenant Isolation** | Scoped queries `{ userId: req.user._id }` on all ledger ops | All controllers in `backend/src/controllers/` | **VERIFIED** |
| **IDOR Protection** | 404 Not Found returns on unauthorized document accesses | `backend/src/controllers/transaction.controller.ts` | **VERIFIED** |
| **In-Memory File Ingestion** | `multer.memoryStorage()`; zero temporary files on disk | `backend/src/routes/statement.routes.ts` | **VERIFIED** |
| **Password Ephemerality** | Statement passwords decrypted in RAM; never stored/logged | `backend/src/services/statementParser.js` | **VERIFIED** |
| **Rate Limiting** | Express rate-limiter: 100 req/15min general; 10 req/15min auth | `backend/src/middleware/rateLimiter.ts` | **VERIFIED** |
| **Error Shielding** | Production error masks stack traces; logs internal UUIDs | `backend/src/middleware/error.middleware.ts` | **VERIFIED** |

---

## 6. Viva Voce Defense Preparedness

The viva defense package (`docs/viva/`) equips the candidate to defend every engineering decision against external examiners:
1. **110 Technical Questions**: Complete answers across Core CSE, MERN stack, Python FastAPI, Vectorization, ML geometry, Isolation Forest math, and Docker internals.
2. **Timed Presentation Script**: Step-by-step oral script matching standard academic presentation constraints (18 minutes total).
3. **Live Demonstration Runbook**: Systematic navigation through authentication, real-time AI categorization, live fraud injection, statement parsing, and behavioral segmentation.
4. **Examiner Grilling Defense**: Scientifically sound defenses for hard questions (e.g., explaining why deep learning was avoided for short time-series, why 42.4% precision in fraud is clinically sound, and how in-memory parsing prevents server disk compromise).

---

## 7. Final Project Submission Checklist

- [x] All 15 project documentation files compiled in `docs/` and root.
- [x] 11 Mermaid architectural diagrams rendered and validated.
- [x] 198 automated unit and integration tests passing.
- [x] Docker Compose deployment verified with all 3 containers healthy.
- [x] Production AI model weights verified and persistent.
- [x] MongoDB Atlas database connection secure and active.
- [x] Zero plain-text credentials or API secrets leaked in documentation.
- [x] Student viva presentation script and demo runbook ready for defense.

**Project FinovaX is fully documented, verified, containerized, and certified ready for final B.Tech Computer Science Engineering thesis submission and oral viva voce defense.**

