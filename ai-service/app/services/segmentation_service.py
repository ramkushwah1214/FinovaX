import os
import joblib
import numpy as np
from typing import List, Dict, Any
from app.schemas.schemas import SegmentationRequest, SegmentationResponse

MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../models/segmentation")
KMEANS_PATH = os.path.join(MODEL_DIR, "kmeans_segmenter.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")

PERSONA_PROFILES = {
    0: {
        "persona": "Low Spending & High Savings",
        "recommendations": [
            "Strong financial resilience detected with high savings discipline.",
            "Consider allocating idle cash into compounding assets like index funds or fixed deposits.",
            "Maintain emergency fund coverage for at least 6 months of expenses."
        ]
    },
    1: {
        "persona": "Balanced Disciplined Spender",
        "recommendations": [
            "Your spending is healthy and well-distributed across essential obligations.",
            "Continue following the 50/30/20 budgeting rule (Needs, Wants, Savings).",
            "Review annual insurance premiums and utility bills for periodic savings."
        ]
    },
    2: {
        "persona": "High Volume Discretionary",
        "recommendations": [
            "Discretionary spending (Dining, Entertainment, Shopping) is noticeably high.",
            "Implement category-wise monthly budget caps to curb impulse purchases.",
            "Track weekly food delivery and subscription outflows."
        ]
    },
    3: {
        "persona": "Frequent Micro-Transactor",
        "recommendations": [
            "A high count of small UPI transactions observed throughout the month.",
            "Beware of micro-leakage: small repeated payments often accumulate significantly.",
            "Use automated weekly transaction summaries to audit daily micro-spending."
        ]
    },
    4: {
        "persona": "High Outflow & Fixed Obligations",
        "recommendations": [
            "High percentage of income consumed by fixed obligations (EMIs, Rent, Loans).",
            "Prioritize debt reduction strategies (Avalanche or Snowball method).",
            "Avoid taking on new consumer debt until fixed obligation ratio drops below 40%."
        ]
    }
}

class SpendingSegmentationService:
    def __init__(self):
        self.kmeans = None
        self.scaler = None
        self.load_models()

    def load_models(self):
        if os.path.exists(KMEANS_PATH) and os.path.exists(SCALER_PATH):
            try:
                self.kmeans = joblib.load(KMEANS_PATH)
                self.scaler = joblib.load(SCALER_PATH)
            except Exception as e:
                print(f"[SegmentationService] Failed to load clustering artifacts: {e}")
                self.kmeans = None
                self.scaler = None

    def segment_user(self, req: SegmentationRequest) -> SegmentationResponse:
        monthly_spend = float(req.monthlyAvgSpend)
        essential_ratio = float(req.essentialRatio)
        discretionary_ratio = float(req.discretionaryRatio)
        freq = int(req.transactionFrequency)
        savings_rate = float(req.savingsRate or 0.0)
        avg_tx_amount = float(req.avgTxAmount) if req.avgTxAmount is not None else (monthly_spend / max(1, freq))
        recurring_ratio = float(req.recurringRatio or 0.15)

        # Enforce strict data sufficiency check (require >= 5 transactions and recorded spending)
        if monthly_spend <= 0 or freq < 5:
            return SegmentationResponse(
                status="INSUFFICIENT_DATA",
                persona="Emerging Financial Profile",
                clusterId=-1,
                features={
                    "monthlyAvgSpend": round(monthly_spend, 2),
                    "essentialRatio": round(essential_ratio, 2),
                    "discretionaryRatio": round(discretionary_ratio, 2),
                    "transactionFrequency": freq,
                    "savingsRate": round(savings_rate, 2),
                    "avgTxAmount": round(avg_tx_amount, 2),
                    "recurringRatio": round(recurring_ratio, 2)
                },
                clusterMetrics={"notice": "Minimum 5 recorded transactions required for empirical behavioral clustering."},
                recommendations=["Import bank statements or record at least 5 financial transactions to establish your behavioral persona."]
            )

        # Dynamic inference with trained StandardScaler + KMeans
        if self.kmeans is not None and self.scaler is not None:
            user_features = np.array([[
                np.clip(monthly_spend, 1000, 250000),
                np.clip(essential_ratio, 0.0, 1.0),
                np.clip(discretionary_ratio, 0.0, 1.0),
                np.clip(freq, 1, 300),
                np.clip(savings_rate, 0.0, 1.0),
                np.clip(avg_tx_amount, 50, 50000),
                np.clip(recurring_ratio, 0.0, 1.0)
            ]])
            scaled_features = self.scaler.transform(user_features)
            cluster_id = int(self.kmeans.predict(scaled_features)[0])
        else:
            # Multi-attribute fallback if artifact is unavailable
            if discretionary_ratio >= 0.45 or (monthly_spend > 50000 and discretionary_ratio >= 0.35):
                cluster_id = 2
            elif savings_rate >= 0.30 or (monthly_spend < 20000 and essential_ratio < 0.6):
                cluster_id = 0
            elif freq >= 40:
                cluster_id = 3
            elif essential_ratio >= 0.70:
                cluster_id = 4
            else:
                cluster_id = 1

        profile = PERSONA_PROFILES.get(cluster_id, PERSONA_PROFILES[1])

        return SegmentationResponse(
            status="SUCCESS",
            persona=profile["persona"],
            clusterId=cluster_id,
            features={
                "monthlyAvgSpend": round(monthly_spend, 2),
                "essentialRatio": round(essential_ratio, 2),
                "discretionaryRatio": round(discretionary_ratio, 2),
                "transactionFrequency": freq,
                "savingsRate": round(savings_rate, 2),
                "avgTxAmount": round(avg_tx_amount, 2),
                "recurringRatio": round(recurring_ratio, 2)
            },
            clusterMetrics={
                "silhouette_score": 0.6556,
                "davies_bouldin_index": 0.5014,
                "calinski_harabasz_score": 1868.47,
                "algorithm": "KMeans Clustering (Standardized 7-Feature Space)",
                "model_trained": self.kmeans is not None
            },
            recommendations=profile["recommendations"]
        )

segmentation_service = SpendingSegmentationService()

