from datetime import datetime, timezone
import os
import json
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.schemas.schemas import (
    RiskLevel,
    CategorizationRequest,
    CategorizationResponse,
    CategoryCorrectionRequest,
    CategoryCorrectionResponse,
    TransactionAnalysisRequest,
    TransactionAnalysisResponse,
    BatchAnalysisRequest,
    BatchAnalysisResponse,
    ForecastRequest,
    ForecastResponse,
    SegmentationRequest,
    SegmentationResponse,
    ModelsStatusResponse,
    ModelStatusItem,
    RetrainRequest,
    RetrainResponse
)
from app.services.categorization_service import categorization_service
from app.services.fraud_service import fraud_service
from app.services.forecast_service import forecast_service
from app.services.segmentation_service import segmentation_service

load_dotenv()

app = FastAPI(
    title="FinovaX AI Financial Intelligence Microservice",
    description="Production-grade AI microservice for transaction categorization, fraud/anomaly detection, time-series spending forecasting, and customer segmentation.",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "finovax_ai_admin_secret_key_2026")

@app.get("/")
def read_root():
    return {
        "service": "FinovaX AI Financial Intelligence Microservice",
        "status": "active",
        "version": "2.0.0",
        "endpoints": [
            "/health",
            "/models/status",
            "/predict/category",
            "/predict/category/correct",
            "/predict/fraud",
            "/predict/spending",
            "/predict/forecast",
            "/predict/segment",
            "/models/retrain",
            "/reports/model-comparison"
        ]
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "finovax-ai-service",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models_active": {
            "categorization": categorization_service.model is not None,
            "fraud_detection": fraud_service.iso_model is not None,
            "forecasting": True,
            "segmentation": True
        }
    }

@app.get("/models/status", response_model=ModelsStatusResponse)
def get_models_status():
    """
    Returns empirical readiness and evaluation metrics for all 4 AI modules from verified reports.
    """
    fraud_metrics_path = os.path.join(REPORTS_DIR, "fraud_model_comparison.json")
    cat_metrics_path = os.path.join(REPORTS_DIR, "categorization_model_comparison.json")
    fc_metrics_path = os.path.join(REPORTS_DIR, "forecast_model_comparison.json")
    seg_metrics_path = os.path.join(REPORTS_DIR, "segmentation_model_comparison.json")

    fraud_metrics = {}
    if os.path.exists(fraud_metrics_path):
        with open(fraud_metrics_path, "r", encoding="utf-8") as f:
            fraud_metrics = json.load(f).get("models_compared", {})

    cat_metrics = {}
    if os.path.exists(cat_metrics_path):
        with open(cat_metrics_path, "r", encoding="utf-8") as f:
            cat_metrics = json.load(f).get("models_evaluated", {})

    fc_metrics = {}
    if os.path.exists(fc_metrics_path):
        with open(fc_metrics_path, "r", encoding="utf-8") as f:
            fc_metrics = json.load(f).get("models_evaluated", {})

    seg_metrics = {}
    if os.path.exists(seg_metrics_path):
        with open(seg_metrics_path, "r", encoding="utf-8") as f:
            seg_metrics = json.load(f).get("models_evaluated", {})

    return ModelsStatusResponse(
        service="FinovaX AI Microservice",
        timestamp=datetime.now(timezone.utc).isoformat(),
        models={
            "categorization": ModelStatusItem(
                name="Transaction Categorization Engine",
                model_type="RandomForestClassifier with TF-IDF Vectorizer (1-2 n-grams)",
                is_ready=categorization_service.model is not None,
                status="TRAINED_AND_DEPLOYED" if categorization_service.model is not None else "RULE_BASED_FALLBACK",
                evaluation_metrics=cat_metrics,
                last_trained="November 2026",
                dataset_source="FinovaX Benchmark Consumer Narration Corpus (16 Expense, Inflow and Transfer Classes)"
            ),
            "fraud_detection": ModelStatusItem(
                name="Fraud & Anomaly Intelligence Engine",
                model_type="IsolationForest (Unsupervised) + LOF + Random Forest & XGBoost Benchmarks",
                is_ready=fraud_service.iso_model is not None,
                status="TRAINED_AND_DEPLOYED" if fraud_service.iso_model is not None else "HEURISTIC_ACTIVE",
                evaluation_metrics=fraud_metrics,
                last_trained="November 2026",
                dataset_source="Kaggle Credit Card (284,807 rows) & PaySim (6,362,620 rows chunked stream)"
            ),
            "forecasting": ModelStatusItem(
                name="Spending Time-Series Regressor",
                model_type="Previous-Period Persistence Baseline (Empirical Winner over XGBoost & RF)",
                is_ready=True,
                status="TRAINED_AND_DEPLOYED",
                evaluation_metrics=fc_metrics,
                last_trained="November 2026",
                dataset_source="Chronological Historical User Aggregates (Strict time-series split)"
            ),
            "segmentation": ModelStatusItem(
                name="Customer Spending Behavioral Segmenter",
                model_type="KMeans (k=5) with Standardized Scaler (Validated against Elbow & Silhouette)",
                is_ready=True,
                status="TRAINED_AND_DEPLOYED",
                evaluation_metrics=seg_metrics,
                last_trained="November 2026",
                dataset_source="Standardized Multi-attribute Consumer Spending Archetypes"
            )
        }
    )

# --- 1. Transaction Categorization ---
@app.post("/predict/category", response_model=CategorizationResponse)
def predict_category(req: CategorizationRequest):
    return categorization_service.predict(req)

@app.post("/predict/category/correct", response_model=CategoryCorrectionResponse)
def record_category_correction(req: CategoryCorrectionRequest):
    """
    Saves a user-verified category correction for future active retraining.
    """
    try:
        total = categorization_service.record_correction(req)
        return CategoryCorrectionResponse(
            status="SUCCESS",
            message=f"Category correction recorded for '{req.title}' -> '{req.category}'.",
            totalCorrections=total
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record category correction: {str(e)}"
        )

# --- 2. Fraud & Anomaly Risk Assessment ---
@app.post("/predict/fraud", response_model=TransactionAnalysisResponse)
@app.post("/api/analyze-transaction", response_model=TransactionAnalysisResponse)
def analyze_transaction_risk(req: TransactionAnalysisRequest):
    return fraud_service.analyze_transaction(req)

@app.post("/api/batch-analyze", response_model=BatchAnalysisResponse)
def batch_analyze(request: BatchAnalysisRequest):
    results = [fraud_service.analyze_transaction(tx) for tx in request.transactions]
    anomalies = sum(1 for r in results if r.is_anomaly)
    return BatchAnalysisResponse(
        total_evaluated=len(results),
        anomalies_detected=anomalies,
        results=results
    )

# --- 3. Spending Forecasting ---
@app.post("/predict/spending", response_model=ForecastResponse)
@app.post("/predict/forecast", response_model=ForecastResponse)
def predict_spending_forecast(req: ForecastRequest):
    return forecast_service.predict(req)

# --- 4. Customer Spending Segmentation ---
@app.post("/predict/segment", response_model=SegmentationResponse)
def predict_customer_segment(req: SegmentationRequest):
    return segmentation_service.segment_user(req)

# --- 5. Model Retraining Endpoint (Protected) ---
@app.post("/models/retrain", response_model=RetrainResponse)
def retrain_models(
    req: RetrainRequest,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")
):
    """
    Triggers model retraining with active learning corrections.
    Protected by administrative API key.
    """
    if not x_admin_key or x_admin_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Admin-Key required to trigger model retraining."
        )

    targets = req.models or ["categorization", "forecasting", "segmentation"]
    retrained = []

    try:
        if "categorization" in targets:
            from training.train_categorization_models import train_and_evaluate_categorization
            train_and_evaluate_categorization()
            categorization_service.load_model()
            retrained.append("categorization")

        if "forecasting" in targets:
            from training.train_forecast_models import train_and_evaluate_forecasting
            train_and_evaluate_forecasting()
            retrained.append("forecasting")

        if "segmentation" in targets:
            from training.train_segmentation_models import train_and_evaluate_segmentation
            train_and_evaluate_segmentation()
            retrained.append("segmentation")

        return RetrainResponse(
            status="SUCCESS",
            message=f"Successfully retrained and reloaded models: {', '.join(retrained)}.",
            retrained=retrained,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model retraining error: {str(e)}"
        )

# --- 6. Model Comparison Reports ---
@app.get("/reports/model-comparison")
def get_all_model_reports():
    reports = {}
    if os.path.exists(REPORTS_DIR):
        for filename in os.listdir(REPORTS_DIR):
            if filename.endswith(".json"):
                filepath = os.path.join(REPORTS_DIR, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        reports[filename.replace(".json", "")] = json.load(f)
                except Exception:
                    pass
    return {
        "status": "success",
        "reports": reports
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting FinovaX AI Service on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
