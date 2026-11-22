# FinovaX — System Architecture Diagrams & Workflow Models

This document compiles the complete architectural, deployment, entity-relationship, and dataflow specifications for the FinovaX platform using GitHub-flavored Mermaid syntax.

---

## 1. System Architecture Diagram

High-level decomposition of FinovaX across presentation, API gateway, ML inference, and persistent data tiers.

```mermaid
flowchart TD
    subgraph ClientTier["Presentation Tier (Client Browser)"]
        UI["React 18 SPA (Vite + Tailwind CSS)"]
        State["Context State (Auth, Finance, Theme)"]
        Recharts["Interactive Analytics (Recharts)"]
        UI --> State
        UI --> Recharts
    end

    subgraph IngressTier["Ingress & Web Server Tier"]
        Nginx["Nginx Alpine Web Server (Port 80)"]
    end

    subgraph GatewayTier["API Gateway & Domain Tier"]
        Express["Node.js Express API Gateway (Port 5000)"]
        AuthMiddleware["JWT & HttpOnly Cookie Auth Guard"]
        ParserEngine["Multi-Format Statement Parsing Engine"]
        CentralErrorHandler["Centralized Exception Handler"]
        
        Express --> AuthMiddleware
        Express --> ParserEngine
        Express --> CentralErrorHandler
    end

    subgraph MLTier["Machine Learning Microservice Tier"]
        FastAPI["Python 3.11 FastAPI / Uvicorn (Port 8000)"]
        Categorizer["Module 1: TF-IDF Categorizer"]
        AnomalyEngine["Module 2: Isolation Forest Anomaly Engine"]
        Forecaster["Module 3: Persistence Baseline Forecaster"]
        Segmenter["Module 4: K-Means Persona Segmenter"]
        
        FastAPI --> Categorizer
        FastAPI --> AnomalyEngine
        FastAPI --> Forecaster
        FastAPI --> Segmenter
    end

    subgraph DataTier["Data Persistence Tier"]
        MongoAtlas[("MongoDB Atlas Cloud Replica Set (TLS Port 27017)")]
        Volume[("Named Docker Volume: finovax-ai-corrections")]
    end

    UI -- "HTTP Requests (Port 80)" --> Nginx
    Nginx -- "Static Assets" --> UI
    Nginx -- "Proxy /api/*" --> Express
    Express -- "Internal HTTP Mesh" --> FastAPI
    Express -- "Mongoose ODM (TLS 1.2+)" --> MongoAtlas
    FastAPI -- "Read/Write Active Learning Corrections" --> Volume
```

---

## 2. Docker Deployment Architecture

Docker container boundaries, isolated bridge network, and persistent storage mapping.

```mermaid
flowchart LR
    subgraph Host["Host Machine (Windows WSL 2 / Linux VM)"]
        Port80["Host Port 80"]
        
        subgraph BridgeNetwork["Docker Bridge Network: finovax-network"]
            subgraph FrontendContainer["Container: finovax-frontend"]
                NginxSvc["Nginx Alpine\n(Port 80)"]
                HTML["/usr/share/nginx/html\n(React Static Dist)"]
            end

            subgraph BackendContainer["Container: finovax-backend"]
                NodeSvc["Node 20 Express\n(Port 5000 - Internal)"]
                UserNode["User: node (UID 1000)"]
            end

            subgraph AIContainer["Container: finovax-ai-service"]
                FastAPISvc["Python 3.11 FastAPI\n(Port 8000 - Internal)"]
                UserApp["User: appuser (UID 1000)"]
            end
        end

        subgraph Storage["Docker Storage"]
            DockerVolume[("Volume:\nfinovax-ai-corrections")]
        end

        Port80 --> NginxSvc
        NginxSvc -- "proxy_pass http://backend:5000" --> NodeSvc
        NodeSvc -- "http://ai-service:8000" --> FastAPISvc
        FastAPISvc --> DockerVolume
    end

    subgraph ExternalCloud["Cloud Infrastructure"]
        AtlasDB[("MongoDB Atlas\nCloud Replica Set\n(Port 27017 TLS)")]
    end

    NodeSvc -- "Outbound TLS Connection" --> AtlasDB
```

---

## 3. Frontend / Backend / AI Inter-Service Communication Flow

Step-by-step transaction analysis request pipeline.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Nginx as Frontend (Nginx :80)
    participant Backend as Backend Gateway (:5000)
    participant Mongo as MongoDB Atlas
    participant AI as AI Microservice (:8000)

    User->>Nginx: POST /api/transactions (New Expense Payload)
    Nginx->>Backend: proxy_pass /api/transactions
    Backend->>Backend: Verify JWT Cookie & Validate Amounts
    Backend->>Mongo: Transaction.create({ ... })
    Mongo-->>Backend: Transaction Document Saved
    
    Backend->>Mongo: Transaction.aggregate (Fetch User Historical Category Stats)
    Mongo-->>Backend: Historical Mean & StdDev
    
    Backend->>AI: POST /predict/fraud ({ amount, stats, time })
    AI->>AI: Compute Isolation Forest Contamination & Z-Score
    AI-->>Backend: { risk_score: 82, risk_level: "HIGH", reasons: [...] }
    
    opt Risk Level is HIGH
        Backend->>Mongo: FraudAlert.create({ status: "pending_review", ... })
        Mongo-->>Backend: Alert Recorded
    end
    
    Backend-->>Nginx: 201 Created { transaction, fraudAlert }
    Nginx-->>User: 201 Created JSON Response
```

---

## 4. Database Entity-Relationship Diagram (ERD)

Mongoose schema relationships and tenant scoping across all collections.

```mermaid
erDiagram
    User ||--o{ Transaction : "owns (1:N)"
    User ||--o{ Budget : "configures (1:N)"
    User ||--o{ FinancialGoal : "tracks (1:N)"
    User ||--o{ RecurringPayment : "schedules (1:N)"
    User ||--o{ FraudAlert : "resolves (1:N)"
    User ||--o{ StatementImport : "uploads (1:N)"
    User ||--o{ BankConnection : "links (1:N)"
    Transaction ||--o| FraudAlert : "triggers (1:1)"
    StatementImport ||--o{ Transaction : "generates (1:N)"

    User {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string currency
        number monthlyIncome
        object notifications
        date createdAt
    }

    Transaction {
        ObjectId _id PK
        ObjectId userId FK
        string title
        number amount
        string type
        string category
        date date
        string paymentMethod
        string transactionType
        string referenceId
        number balanceAfter
    }

    Budget {
        ObjectId _id PK
        ObjectId userId FK
        string category
        number limitAmount
        number month
        number year
    }

    FinancialGoal {
        ObjectId _id PK
        ObjectId userId FK
        string title
        number targetAmount
        number currentAmount
        date deadline
        string status
    }

    RecurringPayment {
        ObjectId _id PK
        ObjectId userId FK
        string name
        number amount
        string category
        string frequency
        date nextDueDate
        string status
    }

    FraudAlert {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId transactionId FK
        number amount
        string merchant
        number riskScore
        string riskLevel
        string status
    }

    StatementImport {
        ObjectId _id PK
        ObjectId userId FK
        string originalFilename
        string fileHashSha256
        string fileType
        number totalRecords
        number duplicateCount
        string status
    }
```

---

## 5. User Registration and Authentication Flow

Bcrypt salting, JWT token issuance, and HttpOnly cookie establishment.

```mermaid
sequenceDiagram
    autonumber
    actor Client as User
    participant Auth as Auth Controller
    participant Bcrypt as Bcrypt Engine
    participant DB as MongoDB Atlas
    participant JWT as JWT Signer

    Client->>Auth: POST /api/auth/register (name, email, password)
    Auth->>Auth: Validate Email Format & Password Strength
    Auth->>DB: User.findOne({ email })
    alt User Already Exists
        DB-->>Auth: Existing User Found
        Auth-->>Client: 409 Conflict (USER_EXISTS)
    else New User
        DB-->>Auth: null
        Auth->>Bcrypt: genSalt(12) + hash(password)
        Bcrypt-->>Auth: passwordHash ($2a$12$...)
        Auth->>DB: User.create({ name, email, passwordHash, ... })
        DB-->>Auth: User Document Saved
        Auth->>JWT: sign({ id, email, name }, JWT_SECRET, 7d)
        JWT-->>Auth: Signed JWT Token
        Auth-->>Client: 201 Created + Set-Cookie: finovax_token (HttpOnly)
    end
```

---

## 6. Transaction Processing Flow

Data ingestion, sanitization, MongoDB insertion, and real-time AI scoring.

```mermaid
flowchart TD
    Start([User Submits Transaction Form]) --> ValidateInputs{Validate Inputs<br/>Amount > 0, Valid Category}
    ValidateInputs -- No --> Error400[Return HTTP 400 Validation Error]
    ValidateInputs -- Yes --> DerivesUserId[Extract userId from Verified JWT]
    
    DerivesUserId --> SaveDB[(Insert into transactions collection)]
    SaveDB --> QueryHistory[(Fetch User Category History)]
    
    QueryHistory --> CallAI[POST /predict/fraud to AI Microservice]
    CallAI --> IsoForest[Compute Isolation Forest Contamination Score]
    IsoForest --> ZScore[Calculate Amount Z-Score vs Historical Mean]
    ZScore --> RiskScore[Generate Risk Score: 0 - 100]
    
    RiskScore --> ThresholdCheck{Risk Score >= 70?}
    ThresholdCheck -- Yes --> FlagAlert[(Create FraudAlert Record)]
    ThresholdCheck -- No --> ReturnSuccess[Return HTTP 201 Success]
    FlagAlert --> ReturnSuccess
```

---

## 7. Statement Import Lifecycle

Multi-format ingestion, magic-byte inspection, multi-tier duplicate review, and bulk staging.

```mermaid
stateDiagram-v2
    [*] --> Upload: User uploads CSV / Excel / PDF / GPay
    
    state Upload {
        [*] --> CheckSize: Enforce <= 10MB Limit
        CheckSize --> CheckMagicBytes: Inspect Magic Bytes (%PDF, PKZip)
        CheckMagicBytes --> SanitizeFilename: Strip Path Traversal
    }

    Upload --> StrategyRouting: Select Ingestion Strategy
    
    state StrategyRouting {
        [*] --> CSVParser: Parse CSV via RFC 4180
        [*] --> ExcelParser: Parse XLSX & Convert Serial Dates
        [*] --> BankPDFParser: HDFC / SBI / ICICI / Axis / DCB Strategy
        [*] --> GPayParser: Extract 12-Digit UPI UTRs
    }

    StrategyRouting --> DuplicateDetection: Multi-Tier Duplicate Check
    
    state DuplicateDetection {
        [*] --> Tier1: SHA-256 Exact File Hash
        Tier1 --> Tier2: Unique Reference / UTR Matching
        Tier2 --> Tier3: Fuzzy Temporal Window (±2 Days)
    }

    DuplicateDetection --> Staged: Save in statementimports (status: 'staged')
    
    Staged --> UserReview: UI Preview (Duplicate & Category Review)
    
    UserReview --> Confirmed: User Clicks Confirm
    UserReview --> Cancelled: User Clicks Cancel
    
    Confirmed --> LedgerCommitted: Bulk Commit to transactions collection
    Cancelled --> Purged: Clean Up Staged Sub-documents
    
    LedgerCommitted --> [*]
    Purged --> [*]
```

---

## 8. AI Transaction Categorization Flow

Hybrid text categorization pipeline with active learning feedback storage.

```mermaid
flowchart TD
    Narration[Incoming Transaction Narration] --> CleanText[Strip PII, Dates, Reference Codes & Lowercase]
    CleanText --> RuleMatch{Matches Deterministic Rule?}
    
    RuleMatch -- Yes (e.g. Swiggy, Salary) --> HighConfidence[Assign Rule-Based Category<br/>Confidence: 0.95]
    
    RuleMatch -- No --> TFIDF[TF-IDF Vectorization<br/>1-2 N-Grams, Sublinear TF]
    TFIDF --> Classifier[Random Forest / Calibrated Classifier]
    Classifier --> MLConfidence[Predict Category + ML Confidence]
    
    HighConfidence --> ReturnResult[Return Categorization Response]
    MLConfidence --> ReturnResult
    
    ReturnResult --> UserReview{User Corrects Category in UI?}
    UserReview -- Yes --> CorrectAPI[POST /predict/category/correct]
    CorrectAPI --> AppendVolume[(Append to persistent volume:<br/>category_corrections.json)]
    UserReview -- No --> Done([End])
    AppendVolume --> Done
```

---

## 9. Fraud Intelligence Detection Flow

Isolation Forest anomaly detection combined with historical velocity analysis.

```mermaid
flowchart TD
    Tx[Incoming Transaction: Amount, Time, Category] --> ExtractContext[Fetch User 30-Day Category History & 24h Count]
    
    ExtractContext --> IsoTree[Evaluate Isolation Forest Anomaly Score]
    ExtractContext --> CalcZScore[Compute Z-Score = Amount - Mean / StdDev]
    ExtractContext --> CheckVelocity[Check Velocity = Transactions in last 24h]
    
    IsoTree --> Combine[Synthesize Weighted Risk Score 0 - 100]
    CalcZScore --> Combine
    CheckVelocity --> Combine
    
    Combine --> LevelCheck{Score Threshold}
    LevelCheck -- "0 - 40" --> LowRisk[LOW Risk: Routine Normal Transaction]
    LevelCheck -- "41 - 69" --> MedRisk[MEDIUM Risk: Unusual Amount or Hour]
    LevelCheck -- "70 - 100" --> HighRisk[HIGH Risk: Severe Outlier / Velocity Surge]
    
    HighRisk --> GenerateReasons[Generate Explainable Contributing Factors]
    GenerateReasons --> CreateFraudAlert[(Create FraudAlert Record in MongoDB)]
    MedRisk --> Done([Return Triage Report])
    LowRisk --> Done
    CreateFraudAlert --> Done
```

---

## 10. Spending Forecast Flow

Chronologically validated time-series expenditure prediction.

```mermaid
flowchart TD
    Req[User Requests 3-Month Spending Forecast] --> FetchHistory[(Query User Monthly Outflows from MongoDB)]
    
    FetchHistory --> CheckLength{Historical Months >= 3?}
    CheckLength -- No --> ReturnInsufficient[Return Status: INSUFFICIENT_DATA<br/>Avoid Ungrounded Guesswork]
    
    CheckLength -- Yes --> ApplyBaseline[Execute Deployed Persistence Baseline<br/>y_t = y_t-1]
    ApplyBaseline --> CalcVariance[Compute Rolling Variance & Standard Error]
    CalcVariance --> Bounds[Calculate 95% Confidence Bounds<br/>Lower & Upper Bounds]
    
    Bounds --> ReturnForecast[Return 3-Month Horizon Forecast Payload]
    ReturnForecast --> RenderUI[Render Interactive Forecast Graph in React UI]
```

---

## 11. Customer Behavioral Segmentation Flow

Multi-attribute feature normalization and K-Means persona clustering.

```mermaid
flowchart TD
    Start([User Visits Spending Segmentation Page]) --> QueryAggregate[(Aggregate User 6-Month Expenditure Vectors)]
    
    QueryAggregate --> Features[Extract 4 Behavioral Features:<br/>1. Monthly Average Spend<br/>2. Essential Outflow Ratio<br/>3. Discretionary Outflow Ratio<br/>4. Monthly Transaction Frequency]
    
    Features --> StandardScale[Apply StandardScaler Transformation]
    StandardScale --> KMeans[K-Means Cluster Assignment k = 5]
    
    KMeans --> MapPersona{Assigned Cluster ID}
    MapPersona -- 0 --> P0[Low Spending & High Savings]
    MapPersona -- 1 --> P1[Moderate Balanced Spender]
    MapPersona -- 2 --> P2[High Volume Discretionary]
    MapPersona -- 3 --> P3[Fixed-Obligation Heavy]
    MapPersona -- 4 --> P4[Volatile Irregular Transactor]
    
    P0 --> Recs[Attach Targeted Financial Wellness Recommendations]
    P1 --> Recs
    P2 --> Recs
    P3 --> Recs
    P4 --> Recs
    
    Recs --> RenderPersona[Display Persona Badge & Action Plan in UI]
```

