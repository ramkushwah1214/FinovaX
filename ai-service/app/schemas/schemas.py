from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
import math

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

# --- Categorization ---
class CategorizationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    amount: float = Field(default=0.0, ge=0.0)
    direction: Optional[str] = Field(default="debit", pattern="^(debit|credit)$")

class CategorizationResponse(BaseModel):
    category: str
    subcategory: str
    confidence: float
    source: str = Field(..., description="'ml' or 'rule_based'")
    status: str = Field(..., description="'MODEL_READY' or 'RULE_BASED_FALLBACK'")
    model_metadata: Dict[str, Any]

class CategoryCorrectionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    category: str = Field(..., min_length=1, max_length=100)
    previousCategory: Optional[str] = None
    userId: Optional[str] = None

class CategoryCorrectionResponse(BaseModel):
    status: str
    message: str
    totalCorrections: int

# --- Fraud & Anomaly Detection ---
class TransactionAnalysisRequest(BaseModel):
    amount: float = Field(..., gt=0, le=100_000_000, description="Transaction amount")
    type: str = Field(default="expense", pattern="^(income|expense)$")
    category: str = Field(default="Other", min_length=1, max_length=100)
    title: str = Field(default="Transaction", min_length=1, max_length=200)
    paymentMethod: Optional[str] = Field(default="UPI", max_length=50)
    user_avg_amount: Optional[float] = Field(default=None, ge=0)
    user_std_amount: Optional[float] = Field(default=None, ge=0)
    user_tx_count: Optional[int] = Field(default=0, ge=0)
    recent_category_count: Optional[int] = Field(default=0, ge=0)
    velocity_24h_count: Optional[int] = Field(default=0, ge=0)
    is_new_category: Optional[bool] = False
    is_new_merchant: Optional[bool] = False
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    timestamp: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_finite_amount(cls, v: float) -> float:
        if not math.isfinite(v) or math.isnan(v):
            raise ValueError("Amount must be a finite numeric value")
        return v

class TransactionAnalysisResponse(BaseModel):
    is_anomaly: bool
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    reasons: List[str]
    confidence: float = Field(..., ge=0.0, le=1.0)
    baseline_status: str = Field(default="ESTABLISHED", description="'ESTABLISHED' or 'INSUFFICIENT_HISTORY'")
    disclaimer: str
    model_metadata: Dict[str, Any]

class BatchAnalysisRequest(BaseModel):
    transactions: List[TransactionAnalysisRequest] = Field(..., max_length=100)

class BatchAnalysisResponse(BaseModel):
    total_evaluated: int
    anomalies_detected: int
    results: List[TransactionAnalysisResponse]

# --- Spending Forecasting ---
class MonthlySpendPoint(BaseModel):
    month: str # e.g. "2026-08"
    amount: float

class ForecastRequest(BaseModel):
    history: List[MonthlySpendPoint] = Field(default=[], description="Chronological monthly expense points")
    horizon_months: int = Field(default=3, ge=1, le=12)

class ForecastPoint(BaseModel):
    month: str
    predictedAmount: float
    lowerBound: float
    upperBound: float

class ForecastResponse(BaseModel):
    status: str # "SUCCESS" or "INSUFFICIENT_DATA"
    modelUsed: str
    horizonMonths: int
    historicalAverage: float
    forecasts: List[ForecastPoint]
    metrics: Optional[Dict[str, Any]] = None
    disclaimer: str

# --- Customer Segmentation ---
class SegmentationRequest(BaseModel):
    monthlyAvgSpend: float = Field(..., ge=0)
    essentialRatio: float = Field(..., ge=0.0, le=1.0)
    discretionaryRatio: float = Field(..., ge=0.0, le=1.0)
    transactionFrequency: int = Field(..., ge=0)
    savingsRate: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
    avgTxAmount: Optional[float] = Field(default=None, ge=0)
    recurringRatio: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)

class SegmentationResponse(BaseModel):
    status: str # "SUCCESS" or "INSUFFICIENT_DATA"
    persona: str
    clusterId: int
    features: Dict[str, Any]
    clusterMetrics: Optional[Dict[str, Any]] = None
    recommendations: List[str]

# --- Model Status & Retraining ---
class ModelStatusItem(BaseModel):
    name: str
    model_type: str
    is_ready: bool
    status: str
    evaluation_metrics: Dict[str, Any]
    last_trained: Optional[str] = None
    dataset_source: Optional[str] = None

class ModelsStatusResponse(BaseModel):
    service: str
    timestamp: str
    models: Dict[str, ModelStatusItem]

class RetrainRequest(BaseModel):
    models: Optional[List[str]] = Field(default=None, description="Optional list of models: 'categorization', 'forecasting', 'segmentation'")

class RetrainResponse(BaseModel):
    status: str
    message: str
    retrained: List[str]
    timestamp: str
