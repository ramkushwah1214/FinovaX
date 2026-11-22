# FinovaX — Comprehensive B.Tech CSE Viva Voce Question Bank
## 110 Rigorous Technical Examination Questions & Answers

---

### Section 1: Project Introduction & High-Level Objectives (Q1–Q8)

#### Q1: What is FinovaX, and what is its core engineering purpose?
**Answer:** FinovaX is an end-to-end, containerized personal finance management (PFM) and fraud intelligence web platform. It automates financial statement ingestion across diverse formats (CSV, XLSX, PDF, Google Pay UPI), performs real-time machine learning categorization, computes unsupervised transaction anomaly scores via Isolation Forest, provides chronologically validated time-series spending forecasts, and groups consumer spending patterns into behavioral clusters using K-Means.

#### Q2: What major limitations of existing PFM applications motivated this project?
**Answer:** Existing commercial applications suffer from: (1) brittle keyword-based categorization that fails on modern UPI narrations; (2) severe accounting distortions by counting refunds as new income and intra-account transfers as expenses; (3) reliance on client-side SMS scraping, which modern mobile operating systems increasingly restrict; (4) lack of real-time explainable anomaly detection; and (5) fabricated predictive AI claims that overfit sparse personal data instead of benchmarking against statistical baselines.

#### Q3: Why is FinovaX designed as a microservices architecture rather than a monolith?
**Answer:** Decoupling the frontend (React/Nginx), business gateway (Node.js/Express), and machine learning service (Python/FastAPI) allows each layer to leverage its optimal language ecosystem. Python is standard for data science and ML inference (Scikit-learn, XGBoost, Pandas), while Node.js provides asynchronous I/O ideal for streaming file uploads and REST gateway routing. Furthermore, decoupling ensures that heavy ML computation cannot block the Node.js event loop or degrade UI responsiveness.

#### Q4: How does FinovaX handle Google Pay statements differently from traditional bank statements?
**Answer:** Bank statements include running account balances and clear debit/credit columns. Google Pay activity statements contain isolated UPI transactions without running balances and mask account numbers. FinovaX deploys a dedicated Google Pay parser that extracts 12-digit UPI UTR reference numbers, normalizes counterparty titles, and explicitly notifies the user regarding balance limitations.

#### Q5: What is the significance of the 3-step staged import workflow?
**Answer:** Ingesting financial data directly into a permanent ledger without user inspection is dangerous due to potential parsing errors or duplicates. FinovaX parses files into a temporary `staged` state in the `statementimports` collection. The user reviews parsed rows, inspects multi-tier duplicate warnings, corrects categories, and explicitly clicks "Confirm" to bulk-commit transactions or "Cancel" to purge them with zero database impact.

#### Q6: How does FinovaX prevent accounting distortion during statement parsing?
**Answer:** The transaction normalizer assigns an explicit `transactionType` attribute (`income`, `expense`, `refund`, or `transfer`). Reversals and refunds are marked as `refund`, ensuring they offset expense totals rather than inflating gross income. Transfers between a user's own accounts are marked as `transfer`, ensuring they are excluded from monthly spending calculations.

#### Q7: What are the primary deliverables of FinovaX?
**Answer:** A containerized full-stack platform consisting of: (1) a React 18 SPA; (2) a Node.js Express REST API; (3) a Python FastAPI AI microservice; (4) a cloud MongoDB Atlas database; (5) multi-tier statement parsers; (6) 4 pre-trained ML models; (7) Docker Compose orchestration; and (8) 198 passing automated regression tests.

#### Q8: What role does active learning play in FinovaX?
**Answer:** When the ML categorization engine misclassifies a transaction narration, the user can correct the category in the UI. This correction is transmitted to the AI microservice via `POST /predict/category/correct` and persisted to a Docker named volume (`finovax-ai-corrections`), creating a feedback dataset for scheduled model retraining.

---

### Section 2: Frontend Engineering & React 18 (Q9–Q16)

#### Q9: Why was Vite chosen over Create React App (CRA)?
**Answer:** Vite utilizes native ES modules (ESM) during development and leverages esbuild (written in Go) for pre-bundling dependencies. This provides instant server start (under 300 ms) and lightning-fast Hot Module Replacement (HMR) compared to CRA's Webpack, which bundles the entire AST into memory before serving. In production, Vite uses Rollup for tree-shaking and optimized chunking.

#### Q10: How does client-side routing work in the single-page application?
**Answer:** FinovaX uses `react-router-dom` (v7). The browser loads a single `index.html`. When navigation links are clicked, the router intercepts the browser's History API (`pushState`) and dynamically renders the matching component view without triggering a full page reload.

#### Q11: How is the Single Page Application fallback handled in Nginx?
**Answer:** In an SPA, direct visits to deep URLs (e.g. `http://localhost/fraud-intelligence`) would cause Nginx to look for a physical file `/usr/share/nginx/html/fraud-intelligence` and return a 404. In `frontend/nginx.conf`, the directive `try_files $uri $uri/ /index.html;` intercepts unmatched paths and serves `index.html`, allowing client-side React Router to resolve the route.

#### Q12: How is state managed across the frontend?
**Answer:** FinovaX utilizes the React Context API with custom providers:
- `AuthContext`: Tracks JWT token in memory, authenticated user profile, and login/logout state.
- `FinanceContext`: Caches active transactions, monthly summary metrics, category budgets, and recurring bills.
- `ThemeContext`: Toggles dark and light UI modes using Tailwind CSS class switching.

#### Q13: Why does the frontend API client use relative URLs (`/api`)?
**Answer:** `frontend/src/api/client.ts` initializes `const BASE_URL = import.meta.env.VITE_API_URL || '/api';`. Using relative paths ensures that API requests are made to the same origin (`http://localhost/api/*`), allowing Nginx in production or Vite in development to proxy requests to the backend without hardcoding hostnames, ports, or risking CORS rejections.

#### Q14: How does FinovaX handle data visualization?
**Answer:** Recharts (built on D3.js and React SVG components) renders responsive `AreaChart` components for 6-month cashflow progression, `PieChart` components for category expense distributions, and custom progress meters for budget thresholds.

#### Q15: How does the frontend handle token persistence across page refreshes?
**Answer:** The primary authentication credential is an `HttpOnly` cookie (`finovax_token`) sent automatically by the browser with every request (`credentials: 'include'`). On page load, `AuthContext` calls `GET /api/auth/me`. If the cookie is valid, the server returns the user profile, re-hydrating the frontend state.

#### Q16: How does the frontend prevent UI crashes when database numbers are zero?
**Answer:** Division-by-zero guards are implemented in calculations like savings rates: if `monthlyIncome === 0`, the savings rate defaults to `0%` rather than `NaN` or `Infinity`. Additionally, optional chaining (`?.`) and fallback default values (`|| 0`, `|| []`) safeguard against rendering uninitialized states.

---

### Section 3: Backend Gateway & Express (Q17–Q24)

#### Q17: What is the role of Node.js in the FinovaX architecture?
**Answer:** Node.js serves as the API Gateway and business domain controller. Its non-blocking, event-driven I/O model is uniquely suited for handling concurrent HTTP requests, streaming file uploads, orchestrating multi-format parsing, querying MongoDB Atlas, and dispatching requests to the AI microservice.

#### Q18: What is Express middleware, and how is it used in FinovaX?
**Answer:** Middleware functions in Express have access to the request object (`req`), response object (`res`), and the `next` function in the application's request-response cycle. FinovaX uses middleware for:
- `helmet`: Injects security headers.
- `cors`: Validates permitted client origins.
- `cookieParser`: Parses cookie headers into `req.cookies`.
- `authenticate`: Verifies JWT signatures and binds `req.user`.
- `checkDbReady`: Checks database connection readiness before executing queries.
- `validateObjectId`: Ensures parameter IDs are valid MongoDB hex strings.
- `errorHandler`: Centralized error catching and response formatting.

#### Q19: How does FinovaX handle unhandled exceptions in Express?
**Answer:** Express routes forward errors via `next(error)` to `backend/src/middleware/errorHandler.ts`. The centralized handler inspects error prototypes and formats standardized JSON responses (`{ status: 'error', code, message }`), mapping Mongoose `CastError` to 400, `ValidationError` to 422, duplicate key 11000 to 409, and `MulterError` to 400.

#### Q20: What was the cause of BUG-01 in Phase 4 and how was it fixed?
**Answer:** In `backend/src/routes/statements.ts`, Multer's `fileFilter` rejected invalid file extensions by calling `cb(new Error(...))`. Because it passed a generic unclassified JavaScript `Error`, Express's error handler defaulted to an HTTP 500 Internal Server Error. The fix imported `AppError` and passed `new AppError('Invalid file type...', 400, 'UNSUPPORTED_FILE_TYPE')`, and added explicit `MulterError` (`LIMIT_FILE_SIZE` $\to$ 400 `FILE_TOO_LARGE`) handling in `errorHandler.ts`.

#### Q21: What was BUG-02 and how was it resolved?
**Answer:** Transaction updating was only registered on `router.patch('/:id')`. REST clients sending `PUT /api/transactions/:id` received HTTP 404 NOT_FOUND. In `backend/src/routes/transactions.ts`, adding `router.put('/:id', validateObjectId('id'), updateTransaction)` alongside `router.patch` provided complete HTTP method compatibility with zero duplication of business logic.

#### Q22: What was BUG-03 and how was it resolved?
**Answer:** The category breakdown endpoint returned `{ status: 'success', data: { categories: formatted } }`. However, newer client methods and test suites asserted the property name `data.expensesByCategory`. In `dashboardController.ts`, returning both keys `{ categories: formatted, expensesByCategory: formatted }` guaranteed 100% contract compatibility across all consumers.

#### Q23: Why does Express bind to `0.0.0.0` rather than `localhost` in production?
**Answer:** Binding to `localhost` (`127.0.0.1`) restricts the socket to the container's local loopback interface, making it unreachable to other containers on the Docker network. Binding to `0.0.0.0` instructs the server to listen on all available network interfaces, allowing the Nginx container to communicate with Express over the bridge network.

#### Q24: How does the backend communicate with the AI microservice?
**Answer:** The backend uses the native Fetch API in `backend/src/services/aiService.ts` to make HTTP POST and GET requests to `ENV.AI_SERVICE_URL` (`http://ai-service:8000`). Requests incorporate `AbortController` timeouts (e.g. 2000 ms for health checks) so AI service latency never hangs Node.js worker threads.

---

### Section 4: MongoDB Atlas & Mongoose ODM (Q25–Q32)

#### Q25: Why was MongoDB chosen over a relational SQL database like PostgreSQL?
**Answer:** Financial statement imports from diverse institutions produce heterogeneous, semi-structured records with fluctuating metadata (running balance, reference/UTR IDs, check numbers, payment channels). MongoDB's flexible BSON document model allows dynamic fields on transactions without requiring complex table migrations, while Mongoose provides strict schema enforcement where needed.

#### Q26: What is a MongoDB replica set, and why is it used in MongoDB Atlas?
**Answer:** A replica set is a cluster of MongoDB database instances that maintain identical data across nodes via primary-secondary replication. If the primary node experiences an outage, an election automatically promotes a secondary node, providing high availability, fault tolerance, and zero data loss.

#### Q27: How does FinovaX handle password encoding in MongoDB connection strings?
**Answer:** Passwords containing special characters (such as `@`) can corrupt the standard URI format (`mongodb+srv://user:pass@host/`). `backend/src/config/db.ts` implements `sanitizeMongoUri()`, which uses regex pattern matching to automatically URL-encode raw `@` symbols into `%40`, preventing connection parser crashes.

#### Q28: How does Mongoose prevent password hash leakage?
**Answer:** In `backend/src/models/User.ts`, `passwordHash` is configured with `select: false`. In Mongoose, this explicitly excludes the attribute from the default projection of queries like `User.find()` and `User.findById()`, preventing accidental transmission in API responses.

#### Q29: What indexes are implemented in FinovaX and why?
**Answer:**
- `User`: `{ email: 1 }` (unique compound index enforcing unique registration).
- `Transaction`: `{ userId: 1, date: -1 }` (compound index for fast chronological sorting per user).
- `Budget`: `{ userId: 1, category: 1, month: 1, year: 1 }` (unique compound index preventing duplicate category budgets).
- `Transaction`: `{ userId: 1, referenceId: 1 }` (accelerates duplicate statement detection).

#### Q30: How does FinovaX calculate the monthly dashboard summary in MongoDB?
**Answer:** It uses the MongoDB Aggregation Pipeline (`Transaction.aggregate`). It matches documents by `userId`, `date` within the current month window, and `transactionType: { $ne: 'transfer' }`, and groups them by `type` (`$group: { _id: '$type', total: { $sum: '$amount' } }`) to compute exact income and expense totals directly inside the database engine.

#### Q31: What happens if MongoDB Atlas becomes temporarily unreachable?
**Answer:** `backend/src/config/db.ts` sets `serverSelectionTimeoutMS: 8000`. If connection fails, `isDbConnected()` returns `false`. The `checkDbReady` middleware intercepts incoming requests to protected routes and immediately responds with HTTP 503 `DATABASE_UNAVAILABLE` and diagnostic details, rather than hanging or returning mock data.

#### Q32: What is the relationship between `StatementImport` and `Transaction` documents?
**Answer:** It is a 1-to-many relationship. A single `StatementImport` document contains an array of `stagedTransactions`. Upon user confirmation, each staged item is converted into an independent `Transaction` document containing a foreign key `statementImportId` referencing the import batch.

---

### Section 5: Authentication & Security Engineering (Q33–Q42)

#### Q33: How are passwords stored securely in FinovaX?
**Answer:** Passwords are never stored in plain text. They are hashed using Bcrypt with 12 salt rounds (`bcrypt.genSalt(12)`). Bcrypt incorporates a computational work factor that dynamically scales processing time, making rainbow-table and GPU brute-force attacks infeasible.

#### Q34: What is a JWT and how does FinovaX structure its tokens?
**Answer:** A JSON Web Token (JWT) is a cryptographically signed, URL-safe string composed of Header, Payload, and Signature (`header.payload.signature`). FinovaX encodes user claims `{ id, email, name }` signed with HMAC-SHA256 using `ENV.JWT_SECRET` and sets a strict 7-day expiration ceiling (`expiresIn: '7d'`).

#### Q35: Why does FinovaX prioritize HttpOnly cookies over LocalStorage for JWT storage?
**Answer:** Tokens stored in browser `LocalStorage` are accessible to any JavaScript running in the page context. If a third-party script or Cross-Site Scripting (XSS) vulnerability exists, tokens can be stolen. `HttpOnly` cookies cannot be accessed or manipulated via client-side JavaScript (`document.cookie`), completely mitigating XSS token exfiltration.

#### Q36: How does FinovaX mitigate Cross-Site Request Forgery (CSRF)?
**Answer:** In production mode, the authentication cookie is configured with `sameSite: 'strict'`, instructing the browser never to send the cookie on cross-site requests (e.g. following links from external websites).

#### Q37: How is multi-tenant isolation enforced in database queries?
**Answer:** The user identity is extracted strictly from the server-verified JWT (`req.user.id`). Every data query mandates this scope: `Transaction.findOne({ _id: req.params.id, userId: req.user.id })`. Probing another user's ID yields HTTP 404 NOT_FOUND.

#### Q38: What is NoSQL injection and how is it prevented in FinovaX?
**Answer:** NoSQL injection occurs when an attacker passes MongoDB query operators (such as `{"$gt": ""}`) in place of string parameters to bypass authentication or extract data. FinovaX mitigates this by: (1) using Mongoose schemas that strictly cast and validate types; and (2) enforcing `validateObjectId` middleware that rejects any parameter that is not a strict 24-character hexadecimal string.

#### Q39: What is Mass Assignment and how does FinovaX prevent it?
**Answer:** Mass assignment occurs when client payloads bind directly to internal database attributes (e.g. injecting `userId: "admin_id"` or `is_admin: true`). FinovaX controllers explicitly extract only allowed white-listed fields from `req.body` (`title`, `amount`, `category`, `date`) and override `userId` with `req.user.id`.

#### Q40: How is file upload security handled for statement files?
**Answer:**
1. Files are kept in memory (`multer.memoryStorage()`) and never touch disk.
2. Hard 10 MB file size limit.
3. Extension whitelisting (`.csv`, `.xlsx`, `.xls`, `.pdf`).
4. Magic byte inspection verifying authentic headers (`%PDF` for PDFs, `PK\x03\x04` for Excel, null-byte rejection for CSVs).
5. Filename sanitization stripping directory traversal sequences (`../../`).

#### Q41: What security headers does Nginx inject?
**Answer:**
- `X-Content-Type-Options: "nosniff"` (prevents MIME-type sniffing).
- `X-Frame-Options: "SAMEORIGIN"` (prevents clickjacking attacks).
- `X-XSS-Protection: "1; mode=block"` (enables browser XSS filtering).
- `Referrer-Policy: "strict-origin-when-cross-origin"` (protects referrer privacy).

#### Q42: What rate limiting is enforced on the API?
**Answer:** `express-rate-limit` enforces rate limits: 100 requests per 15 minutes on `/api/auth/*` endpoints (mitigating credential stuffing) and 300 requests per 15 minutes on general domain routes.

---

### Section 6: REST API Design & Contracts (Q43–Q50)

#### Q43: What makes an API "RESTful"?
**Answer:** Representational State Transfer (REST) is an architectural style based on: (1) client-server decoupling; (2) stateless interactions where every request carries complete context; (3) uniform interface using standard HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`); (4) resource-oriented URIs (`/api/transactions/:id`); and (5) standardized HTTP status codes.

#### Q44: What is the difference between `PUT` and `PATCH` in FinovaX?
**Answer:** In REST theory, `PUT` replaces an entire resource while `PATCH` applies partial modifications. In FinovaX, both verbs route to `updateTransaction` in `transactionController.ts`, providing complete client compatibility while updating only the validated fields provided in the body.

#### Q45: What HTTP status codes are used across the FinovaX API?
**Answer:**
- `200 OK`: Successful read or update.
- `201 Created`: Resource successfully instantiated (user registered, transaction created).
- `400 Bad Request`: Malformed ObjectId, invalid file type, negative amount.
- `401 Unauthorized`: Missing, expired, or tampered JWT.
- `404 Not Found`: Target resource does not exist or belongs to another user.
- `409 Conflict`: Unique constraint violation (duplicate email).
- `422 Unprocessable Entity`: Mongoose schema validation failure.
- `503 Service Unavailable`: MongoDB Atlas offline or unreachable.

#### Q46: How does the statement upload API handle multipart form data?
**Answer:** It uses Multer middleware. The client sends a `multipart/form-data` POST request. Multer parses the boundary-separated stream, places the file buffer in `req.file.buffer`, and passes non-file form fields (`source`, `bankName`) into `req.body`.

#### Q47: What payload does the `/api/health` endpoint return?
**Answer:** It returns service status (`ok`), uptime in seconds, database connection state (`connected: true`, `readyState: 1`), AI microservice connection status (`connected: true`, `latencyMs: 5`), and a diagnostic message.

#### Q48: How are pagination and query filtering implemented in `GET /api/transactions`?
**Answer:** The controller reads `page`, `limit`, `type`, `category`, `startDate`, `endDate`, and `search` query parameters. It computes `skip = (page - 1) * limit` and executes `Transaction.find(query).skip(skip).limit(limit)` alongside `Transaction.countDocuments(query)` to return items and pagination metadata (`totalPages`, `total`).

#### Q49: Why does `GET /api/dashboard/categories` return both `categories` and `expensesByCategory`?
**Answer:** To maintain 100% backward compatibility. Some legacy frontend components and tests consumed `data.categories`, while modern API contracts specify `data.expensesByCategory`. Providing both keys with identical formatted arrays eliminates contract breakage.

#### Q50: How does the AI microservice structure its Pydantic schemas?
**Answer:** Pydantic models in `ai-service/app/schemas/schemas.py` enforce strict type checking and validation (e.g. `Field(..., min_length=1)`). Invalid JSON inputs immediately trigger HTTP 422 Unprocessable Entity responses with detailed location errors.

---

### Section 7: Machine Learning Fundamentals in FinovaX (Q51–Q58)

#### Q51: What machine learning paradigms are used in FinovaX?
**Answer:**
1. **Supervised Learning (Text Classification):** LinearSVC, Logistic Regression, Random Forest for transaction categorization.
2. **Unsupervised Learning (Anomaly Detection):** Isolation Forest and Local Outlier Factor for fraud intelligence.
3. **Time-Series Regression:** Previous-Period Persistence Baseline and XGBoost for spending forecasts.
4. **Unsupervised Learning (Clustering):** K-Means, Agglomerative Clustering, and DBSCAN for consumer behavioral segmentation.

#### Q52: What is TF-IDF and why is it effective for transaction categorization?
**Answer:** Term Frequency-Inverse Document Frequency (TF-IDF) reflects how important a word is to a document in a collection. It increases proportionally to the count of a word in a string (TF) but is offset by the frequency of the word across the corpus (IDF). It effectively down-weights common non-informative tokens (e.g., `PAY`, `UPI`, `LTD`) while amplifying discriminative merchant tokens (e.g., `SWIGGY`, `UBER`, `APOLLO`).

#### Q53: What is data leakage and how was it prevented during model training?
**Answer:** Data leakage occurs when information from outside the training dataset is used to create the model. In transaction categorization, multiple transactions from the same merchant (e.g. 50 transactions containing `Swiggy`) must not appear in both train and test splits. FinovaX enforces **Group K-Fold splitting** on the merchant root token, ensuring unseen merchants in the test split are evaluated purely on generalization capability.

#### Q54: What is the difference between Precision and Recall in fraud detection?
**Answer:**
- **Precision:** $\frac{TP}{TP + FP}$ — Out of all transactions flagged as fraud, how many were actually fraudulent.
- **Recall:** $\frac{TP}{TP + FN}$ — Out of all actual fraudulent transactions, how many did the model successfully detect.
In fraud detection, high Recall ensures suspicious attacks are intercepted, while acceptable Precision minimizes user friction from false alarms.

#### Q55: What is PR-AUC and why is it preferred over ROC-AUC for imbalanced datasets?
**Answer:** The Area Under the Precision-Recall Curve (PR-AUC) evaluates the trade-off between Precision and Recall. Unlike ROC-AUC (which uses False Positive Rate $\frac{FP}{FP + TN}$), PR-AUC does not incorporate True Negatives in its denominator. In imbalanced datasets where True Negatives vastly outnumber Positives, ROC-AUC can be deceptively high (e.g. 0.95) even if the model produces dozens of false alarms, whereas PR-AUC accurately reflects true predictive quality on the minority class.

#### Q56: What is the Silhouette Score in clustering?
**Answer:** The Silhouette Score measures how similar an object is to its own cluster (cohesion) compared to other clusters (separation). It ranges from $-1$ to $+1$. A score near $+1$ indicates that points are well-matched to their own cluster and distant from neighboring clusters. FinovaX achieves a robust Silhouette Score of **0.6556** at $k=5$.

#### Q57: What is the Davies-Bouldin Index?
**Answer:** The Davies-Bouldin Index evaluates clustering algorithms by calculating the similarity between each cluster and its most similar counterpart. Lower values indicate better clustering (tighter clusters with greater separation). FinovaX achieves an optimal score of **0.5014**.

#### Q58: How are machine learning models serialized and served in FinovaX?
**Answer:** Models are serialized to binary `.joblib` files using Joblib (optimized for NumPy array serialization). The FastAPI microservice loads these artifacts into memory on startup via `joblib.load()`, enabling sub-10ms inference execution.

---

### Section 8: Transaction Categorization Engine (Q59–Q66)

#### Q59: Which algorithms were compared for transaction categorization?
**Answer:** LinearSVC (with CalibratedClassifierCV), Logistic Regression, Multinomial Naive Bayes, Random Forest, and Decision Tree.

#### Q60: What were the actual evaluation results across these models?
**Answer:**
- LinearSVC (Calibrated): Accuracy **0.7778**, Precision **0.8126**, Weighted $F_1$ **0.7755**.
- Logistic Regression: Accuracy **0.7778**, Precision **0.7906**, Weighted $F_1$ **0.7666**.
- MultinomialNB: Accuracy **0.7333**, Precision **0.7580**, Weighted $F_1$ **0.7148**.
- Random Forest: Accuracy **0.6756**, Precision **0.7996**, Weighted $F_1$ **0.6707**.
- Decision Tree: Accuracy **0.3733**, Precision **0.6332**, Weighted $F_1$ **0.4076**.

#### Q61: Why did LinearSVC and Logistic Regression outperform Random Forest?
**Answer:** High-dimensional sparse text representations (TF-IDF vector space with 1-2 n-grams) are known to be linearly separable. Linear classifiers find optimal separating hyperplanes efficiently in high dimensions without the risk of orthogonal axis splitting that degrades tree-based models on sparse feature vectors.

#### Q62: Why is CalibratedClassifierCV applied to LinearSVC?
**Answer:** Standard Support Vector Classifiers output geometric distance to the separating margin rather than calibrated probabilities. Wrapping LinearSVC in `CalibratedClassifierCV` uses Platt scaling / isotonic regression to transform margin distances into calibrated probability scores (`predict_proba`).

#### Q63: How does the hybrid categorization strategy function?
**Answer:** When a narration enters the system:
1. It is checked against the deterministic keyword matcher for unambiguous high-frequency merchants (e.g., `Swiggy` $\to$ Food, `Salary` $\to$ Income).
2. If no rule matches, the string is vectorized via TF-IDF and classified by the machine learning pipeline.
3. If TF-IDF features have zero overlap, it falls back to a general default category with a low confidence score.

#### Q64: What categories does the model predict?
**Answer:** 16 classes: Food, Groceries, Shopping, Travel, Fuel, Bills, Subscriptions, Entertainment, Healthcare, Education, Investments, Salary, Interest, Business Income, Transfers, and Other.

#### Q65: How is user feedback captured through active learning?
**Answer:** When a user updates a category in the UI, `POST /predict/category/correct` logs the correction to `category_corrections.json` in the persistent Docker volume `finovax-ai-corrections`.

#### Q66: Where are the categorization model artifacts stored?
**Answer:** In `ai-service/models/categorization/categorizer_pipeline.joblib` (file size: 2.54 MB).

---

### Section 9: Fraud & Anomaly Intelligence Engine (Q67–Q74)

#### Q67: How does the Isolation Forest algorithm detect anomalies?
**Answer:** Isolation Forest recursively isolates data points by randomly selecting a feature and randomly selecting a split value between the minimum and maximum values. Anomalies require fewer random partitions to isolate (shorter path lengths in isolation trees) compared to normal clustered instances.

#### Q68: What is the contamination parameter in Isolation Forest?
**Answer:** The contamination parameter represents the expected proportion of outliers in the dataset. In FinovaX, validation experiments determined an optimal threshold of **0.5917** on the decision function, yielding an empirical False Positive Rate of only **0.81%** on baseline transaction streams.

#### Q69: What are the evaluation metrics of the deployed Isolation Forest model?
**Answer:**
- ROC-AUC: **0.9469**
- Recall: **0.6081**
- Precision: **0.4245**
- $F_1$ Score: **0.5000**
- PR-AUC: **0.4020**
- False Positive Rate: **0.0081 (0.81%)**

#### Q70: Why is an unsupervised model deployed rather than the supervised Random Forest that achieved 0.88 F1?
**Answer:** The supervised Random Forest was trained on PaySim and Kaggle benchmark datasets with artificial fraud labels. In a real-world personal finance application, a new user has zero labeled fraud records. Training a supervised classifier on an individual user's data is impossible. The unsupervised Isolation Forest establishes the user's personal behavioral baseline without requiring labeled fraud history.

#### Q71: How does FinovaX calculate the transaction velocity Z-score?
**Answer:** It queries the user's historical transactions in that specific category over the preceding 30 days to compute the sample mean ($\mu$) and standard deviation ($\sigma$). The $Z$-score is:
$$Z = \frac{\text{Amount} - \mu}{\sigma}$$
An amount exceeding $Z \ge 3.5$ represents a severe statistical outlier.

#### Q72: How are explainable reasons generated for fraud alerts?
**Answer:** The system analyzes the contributing factors:
- If amount $Z \ge 3.5$: *"Transaction amount (₹X) is significantly higher than your typical average (₹Y) for Category."*
- If executed during off-peak hours (1:00 AM – 4:30 AM): *"Transaction occurred during unusual off-peak hours."*
- If velocity $> 4$ transactions in 24 hours: *"Unusual burst in transaction frequency detected."*

#### Q73: What are the three triage risk tiers?
**Answer:**
- **LOW (0–40):** Routine transaction consistent with user baseline.
- **MEDIUM (41–69):** Moderate anomaly; advisory flag.
- **HIGH (70–100):** Severe anomaly; triggers a formal `FraudAlert` record in MongoDB requiring user review.

#### Q74: What actions can a user take on a FraudAlert?
**Answer:** The user navigates to `/fraud-intelligence` and resolves the alert as either `resolved_fraud` (confirming an unauthorized charge) or `resolved_legitimate` (confirming a valid expense, which updates their personal baseline).

---

### Section 10: Spending Forecasting Engine (Q75–Q82)

#### Q75: What models were evaluated for spending time-series forecasting?
**Answer:** Previous-Period Persistence Baseline, Ordinary Least Squares Linear Regression, Random Forest Regressor, and XGBoost Regressor.

#### Q76: What were the actual evaluation metrics across these models?
**Answer:**
- **Previous-Period Persistence Baseline:** MAE **₹2,393.55**, RMSE **3,073.46**, MAPE **5.17%**.
- **Linear Regression:** MAE **₹3,619.49**, RMSE **4,029.07**, MAPE **7.46%**.
- **Random Forest Regressor:** MAE **₹4,655.46**, RMSE **5,080.25**, MAPE **9.60%**.
- **XGBoost Regressor:** MAE **₹4,803.30**, RMSE **5,362.25**, MAPE **9.92%**.

#### Q77: Why did XGBoost perform worse than the simple baseline?
**Answer:** Consumer monthly expenditure series are short (typically 6 to 24 data points). XGBoost is an expressive non-linear tree ensemble that requires hundreds of observations to learn complex feature interactions. On short time-series, gradient boosting overfits high-variance noise, whereas the lag-1 persistence baseline ($y_t = y_{t-1}$) provides a strong, low-variance prior that minimizes Out-of-Sample error.

#### Q78: Which model was deployed in production?
**Answer:** The **Previous-Period Persistence Baseline** was deployed in `ai-service/app/services/forecast_service.py` because its empirical MAE (₹2,393.55) was 50.2% lower than XGBoost's MAE (₹4,803.30).

#### Q79: What is Mean Absolute Percentage Error (MAPE)?
**Answer:**
$$\text{MAPE} = \frac{100\%}{n} \sum_{t=1}^{n} \left| \frac{y_t - \hat{y}_t}{y_t} \right|$$
It measures forecasting error as a percentage of actual values. The deployed baseline achieved a MAPE of only **5.17%**.

#### Q80: How are confidence bounds calculated for future forecast horizons?
**Answer:** Using historical rolling standard error:
$$\text{Lower Bound} = \hat{y} - 1.96 \cdot \frac{\sigma}{\sqrt{n}}, \quad \text{Upper Bound} = \hat{y} + 1.96 \cdot \frac{\sigma}{\sqrt{n}}$$
providing 95% statistical confidence intervals around projected spending.

#### Q81: What happens if a user has fewer than 3 months of transaction history?
**Answer:** The forecasting endpoint returns status `INSUFFICIENT_DATA` with an empty forecast array and an advisory message, preventing ungrounded speculation on insufficient data.

#### Q82: What is the forecast horizon?
**Answer:** 3 calendar months forward projection.

---

### Section 11: Customer Behavioral Segmentation (Q83–Q90)

#### Q83: What is customer segmentation in personal finance?
**Answer:** Grouping users into clusters based on shared spending habits, expense distributions, and transaction velocities to deliver personalized financial advice and automated budget recommendations.

#### Q84: What algorithms were compared for customer segmentation?
**Answer:** K-Means, Agglomerative Hierarchical Clustering, and Density-Based Spatial Clustering of Applications with Noise (DBSCAN).

#### Q85: What were the evaluation metrics for K-Means?
**Answer:**
- Silhouette Score: **0.6556**
- Davies-Bouldin Index: **0.5014**
- Calinski-Harabasz Score: **1,868.47**
- Number of Clusters ($k$): **5**

#### Q86: What four behavioral features are used for clustering?
**Answer:**
1. `monthlyAvgSpend`: Total average monthly outflow.
2. `essentialRatio`: Ratio of spending in Groceries, Utilities, Healthcare, Housing.
3. `discretionaryRatio`: Ratio of spending in Dining, Entertainment, Travel, Shopping.
4. `transactionFrequency`: Average transaction count per calendar month.

#### Q87: Why is StandardScaler applied before K-Means clustering?
**Answer:** K-Means uses Euclidean distance ($d = \sqrt{\sum (x_i - y_i)^2}$). If features have different scales (e.g. `monthlyAvgSpend` in thousands of rupees vs `essentialRatio` between 0 and 1), the high-magnitude feature will dominate the distance metric. `StandardScaler` standardizes features to zero mean and unit variance ($Z = \frac{x - \mu}{\sigma}$).

#### Q88: What are the 5 financial personas identified by FinovaX?
**Answer:**
1. *Low Spending & High Savings* (Frugal savers).
2. *Moderate Balanced Spender* (Stable 50/30/20 budgeters).
3. *High Volume Discretionary* (Frequent lifestyle/entertainment spenders).
4. *Fixed-Obligation Heavy* (High debt/utility/rent commitments).
5. *Volatile Irregular Transactor* (Unpredictable cash flows).

#### Q89: How does the platform deliver actionable insights based on persona?
**Answer:** Each cluster is paired with algorithmic recommendations. For example, a *High Volume Discretionary* user receives alerts to configure strict weekly sub-limits, while a *Fixed-Obligation Heavy* user receives suggestions to audit recurring subscriptions.

#### Q90: Where are the segmentation model artifacts stored?
**Answer:** In `ai-service/models/segmentation/kmeans_segmenter.joblib` (3.75 KB) and `scaler.joblib` (735 B).

---

### Section 12: Docker & DevOps Orchestration (Q91–Q98)

#### Q91: What is containerization and how does Docker benefit FinovaX?
**Answer:** Containerization bundles application code, runtime, system libraries, and settings into an isolated, lightweight container image. Docker eliminates the "works on my machine" problem, guaranteeing identical execution across development workstations and production cloud servers.

#### Q92: What is a multi-stage Dockerfile?
**Answer:** A Dockerfile that uses multiple `FROM` instructions. Early stages compile code or install devDependencies (e.g. TypeScript compiler, Vite, npm packages). Later stages copy only the compiled artifacts (`dist/`) into a minimal runtime base image (e.g. `nginx:alpine` or `node:alpine`), resulting in tiny, secure production images.

#### Q93: What are the sizes of the FinovaX production Docker images?
**Answer:**
- `finovax-frontend:latest`: **74.9 MB disk usage** (21.2 MB content size).
- `finovax-backend:latest`: **355 MB disk usage** (84 MB content size).
- `finovax-ai-service:latest`: **1.91 GB disk usage** (646 MB content size).

#### Q94: Why was `.dockerignore` critical for the AI microservice?
**Answer:** `ai-service/data/raw/` contains 644 MB of historical benchmark CSVs (`creditcard.csv` and `PS_2017...log.csv`). Without `.dockerignore`, Docker would copy 644 MB into the build context, dramatically slowing image builds. Excluding it kept the build context at only **4.87 MB**.

#### Q95: What is Docker Compose?
**Answer:** A tool for defining and orchestrating multi-container Docker applications via a declarative YAML file (`docker-compose.yml`), managing container lifecycles, dependencies, environment variables, networks, and persistent storage volumes in a single command (`docker compose up -d`).

#### Q96: How do container health checks improve orchestration reliability?
**Answer:** Rather than assuming a container is operational as soon as its process spawns, Docker health checks probe internal HTTP endpoints (`wget` on `/api/health`, `curl` on `/health`). In `docker-compose.yml`, `depends_on: { condition: service_healthy }` ensures `backend` does not accept traffic until `ai-service` is fully initialized, and `frontend` does not route until `backend` is healthy.

#### Q97: What is the purpose of the `finovax-ai-corrections` named volume?
**Answer:** Containers have an ephemeral filesystem: any file written inside a container is lost when the container is destroyed. The named volume mounts a persistent host storage directory to `/app/data/corrections`, ensuring that user active learning corrections survive container restarts.

#### Q98: Why are ports 5000 and 8000 not published to the host machine?
**Answer:** For security. All client interactions enter through Nginx on Port 80. Nginx proxies `/api` calls internally. By not publishing ports 5000 and 8000 to the host, attackers cannot bypass Nginx to directly query Express or the AI microservice.

---

### Section 13: Testing, Verification & QA (Q99–Q104)

#### Q99: How many automated tests exist in FinovaX and what is the pass rate?
**Answer:** 198 automated test assertions across 5 suites:
1. `test:security` (53 assertions) — 100% Pass.
2. `test` (core API) (71 assertions) — 100% Pass.
3. `test:statement` (37 assertions) — 100% Pass.
4. `test:ai` (25 assertions) — 100% Pass.
5. `test_ai_service.py` (12 assertions) — 100% Pass.
**Total Pass Rate: 100% (198 Passed / 0 Failed).**

#### Q100: How was multi-tenant isolation tested?
**Answer:** In `backend/src/test/security.test.ts`, the test suite registers User Alpha and User Beta. User Alpha creates a transaction. User Beta attempts to read, modify via `PUT`, modify via `PATCH`, delete, and trigger AI analysis on User Alpha's transaction. The test asserts that User Beta receives HTTP 404 on every attempt, and queries the database directly to confirm the transaction was unmodified.

#### Q101: How was statement duplicate detection tested?
**Answer:** `backend/src/test/statement.test.ts` feeds identical files to test Tier 1 SHA-256 hash detection, identical UTR reference numbers to test Tier 2 reference detection, and records within $\pm 2$ days with identical amounts to test Tier 3 fuzzy temporal matching.

#### Q102: How was file upload security verified?
**Answer:** Tests attempt uploading `.exe` binaries, `.sh` shell scripts, `.bin` data, and files $> 10$ MB. The suite asserts that every invalid upload returns HTTP 400 with specific error codes (`UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`), verifying that Multer errors are caught before processing.

#### Q103: How is database connection failure tested?
**Answer:** In `api.test.ts`, when MongoDB is disconnected, requests to protected routes assert that the server returns HTTP 503 `DATABASE_UNAVAILABLE` rather than hanging or returning fabricated mock records.

#### Q104: How was TypeScript compile-time safety verified?
**Answer:** Running `npm run build` (`tsc`) in the backend compiles all TypeScript code with strict mode enabled, producing 0 errors. Running `npm run build` (`tsc && vite build`) in the frontend transforms 2,150 modules with 0 errors.

---

### Section 14: Limitations & Future Enhancements (Q105–Q110)

#### Q105: What is the main architectural limitation of statement processing in FinovaX?
**Answer:** Files are buffered in memory (`multer.memoryStorage()`) with a 10 MB limit. While this prevents orphaned disk files, simultaneous processing of hundreds of massive statements in an enterprise SaaS setting would require chunked streaming parsers and distributed worker queues (e.g. BullMQ / Redis).

#### Q106: How does FinovaX currently handle scanned or image-only bank statements?
**Answer:** `bankPdfParser.ts` inspects extracted text density. If a PDF contains image data but zero extractable text strings, it flags the document and raises an explicit `OCR_REQUIRED` advisory. In cloud production, delegating to an asynchronous OCR pipeline (e.g. AWS Textract / Tesseract) is recommended.

#### Q107: Why doesn't FinovaX directly connect to live bank accounts via APIs?
**Answer:** In India, open banking requires licensing as an Account Aggregator (RBI NBFC-AA) or commercial partnerships with banks. FinovaX implements simulated Account Aggregator models (`bankconnections`, `consentrecords`) and multi-format statement ingestion, providing identical functional capabilities without commercial banking licenses.

#### Q108: What are the primary future enhancements planned for FinovaX?
**Answer:**
1. Integration with production Account Aggregator SDKs (Setu / OneMoney).
2. Edge inference via WebAssembly / ONNX Runtime inside the React client.
3. Multi-modal receipt OCR using lightweight vision transformers.
4. Micro-investment automations linking forecasted budget surpluses to mutual fund SIP triggers.

#### Q109: What is the single most important software engineering lesson learned from this project?
**Answer:** Metric-driven empirical validation over speculative complexity. When forecasting spending, complex XGBoost gradient boosting overfit and produced a high MAE (₹4,803.30), while the naive persistence baseline cut the error in half (MAE ₹2,393.55). Rigorous engineering demands deploying what actually performs best rather than what sounds most impressive.

#### Q110: How is FinovaX prepared for final viva defense and demonstration?
**Answer:** The application is fully containerized and active in Docker Desktop. Demonstration endpoints (`http://localhost`, `http://localhost/api/health`, and model triage interfaces) are verified, 198 automated tests are passing, and complete documentation, architecture diagrams, and runbooks are available in `docs/`.

