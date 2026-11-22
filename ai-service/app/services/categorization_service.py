import os
import json
import joblib
from typing import Dict, Any, Tuple
from app.schemas.schemas import CategorizationRequest, CategorizationResponse, CategoryCorrectionRequest

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../models/categorization/categorizer_pipeline.joblib")
CORRECTIONS_DIR = os.path.join(os.path.dirname(__file__), "../../data/corrections")
CORRECTIONS_PATH = os.path.join(CORRECTIONS_DIR, "category_corrections.json")

RULE_BASED_PATTERNS = {
    # Food & Groceries
    "swiggy": ("Food", "Online Food Delivery"),
    "zomato": ("Food", "Online Food Delivery"),
    "mcdonald": ("Food", "Fast Food"),
    "starbucks": ("Food", "Cafes"),
    "domino": ("Food", "Dining"),
    "restaurant": ("Food", "Dining"),
    "blinkit": ("Groceries", "Quick Commerce"),
    "zepto": ("Groceries", "Quick Commerce"),
    "instamart": ("Groceries", "Quick Commerce"),
    "bigbasket": ("Groceries", "Household"),
    "dmart": ("Groceries", "Supermarket"),
    
    # Travel & Fuel
    "uber": ("Travel", "Rideshare"),
    "ola": ("Travel", "Rideshare"),
    "rapido": ("Travel", "Bike Taxi"),
    "irctc": ("Travel", "Railways"),
    "makemytrip": ("Travel", "Flight & Hotels"),
    "petrol": ("Fuel", "Automotive"),
    "fuel": ("Fuel", "Automotive"),
    "hpcl": ("Fuel", "Gas Station"),
    "bpcl": ("Fuel", "Gas Station"),
    "ioc": ("Fuel", "Gas Station"),

    # Shopping
    "amazon": ("Shopping", "E-Commerce"),
    "flipkart": ("Shopping", "E-Commerce"),
    "myntra": ("Shopping", "Apparel"),
    "ajio": ("Shopping", "Fashion"),
    "zara": ("Shopping", "Apparel"),

    # Bills & Subscriptions
    "netflix": ("Subscriptions", "Streaming Video"),
    "spotify": ("Subscriptions", "Music"),
    "youtube": ("Subscriptions", "Digital Content"),
    "electricity": ("Bills", "Electricity"),
    "bescom": ("Bills", "Electricity"),
    "airtel": ("Bills", "Mobile & Broadband"),
    "jio": ("Bills", "Mobile & Broadband"),
    "broadband": ("Bills", "Internet"),

    # Healthcare
    "apollo": ("Healthcare", "Pharmacy"),
    "pharmacy": ("Healthcare", "Medicine"),
    "hospital": ("Healthcare", "Clinical"),
    "medplus": ("Healthcare", "Pharmacy"),

    # Income
    "salary": ("Salary", "Employment Inflow"),
    "payroll": ("Salary", "Employment Inflow"),
    "interest": ("Interest", "Deposit Earnings"),
    "dividend": ("Interest", "Equity Yield"),
    "freelance": ("Business Income", "Consulting")
}

class CategorizationService:
    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"[CategorizationService] Could not load model: {e}")
                self.model = None
        else:
            self.model = None

    def rule_based_classify(self, title: str, direction: str) -> Tuple[str, str, float]:
        t = title.lower()
        
        # Inflows / Credits
        if direction == "credit":
            if any(k in t for k in ["salary", "payroll", "stipend"]):
                return "Salary", "Employment Inflow", 0.95
            if any(k in t for k in ["interest", "dividend", "int.pd"]):
                return "Interest", "Investment Income", 0.90
            if any(k in t for k in ["invoice", "client", "consulting", "freelance"]):
                return "Business Income", "Professional Income", 0.85
            return "Other Income", "General Credit", 0.60

        # Outflows / Debits
        for key, (cat, subcat) in RULE_BASED_PATTERNS.items():
            if key in t:
                return cat, subcat, 0.92

        return "Other Expenses", "Uncategorized Expense", 0.40

    def predict(self, req: CategorizationRequest) -> CategorizationResponse:
        direction = req.direction or "debit"

        # If trained ML model exists, use it
        if self.model is not None:
            try:
                pred_category = str(self.model.predict([req.title])[0])
                proba = 0.85
                if hasattr(self.model, "predict_proba"):
                    probas = self.model.predict_proba([req.title])[0]
                    proba = float(max(probas))

                # Calibrate confidence: if ML matches rule-based heuristic, elevate confidence
                cat_rule, subcat_rule, rule_conf = self.rule_based_classify(req.title, direction)
                if pred_category == cat_rule:
                    calibrated_conf = round(max(proba, rule_conf), 2)
                    subcat = subcat_rule
                else:
                    calibrated_conf = round(proba, 2)
                    subcat = "ML Predicted"

                return CategorizationResponse(
                    category=pred_category,
                    subcategory=subcat,
                    confidence=calibrated_conf,
                    source="ml",
                    status="MODEL_READY",
                    model_metadata={
                        "algorithm": "RandomForestClassifier with TF-IDF Vectorizer",
                        "trained": True,
                        "raw_ml_confidence": round(proba, 4)
                    }
                )
            except Exception:
                pass

        # Transparent rule-based fallback
        cat, subcat, conf = self.rule_based_classify(req.title, direction)
        return CategorizationResponse(
            category=cat,
            subcategory=subcat,
            confidence=conf,
            source="rule_based",
            status="RULE_BASED_FALLBACK",
            model_metadata={
                "algorithm": "Deterministic Keyword & Pattern Matcher",
                "notice": "Raw fraud datasets (creditcard, paysim) lack consumer merchant expense labels. Transparent rule-based engine active without fabricated ML claims."
            }
        )

    def record_correction(self, req: CategoryCorrectionRequest) -> int:
        """
        Persists a user-validated category correction for continuous active learning.
        Returns total accumulated corrections count.
        """
        os.makedirs(CORRECTIONS_DIR, exist_ok=True)
        corrections = []
        if os.path.exists(CORRECTIONS_PATH):
            try:
                with open(CORRECTIONS_PATH, "r", encoding="utf-8") as f:
                    corrections = json.load(f)
            except Exception:
                corrections = []

        # Check if identical correction exists to update or append
        existing = next((c for c in corrections if c.get("title", "").strip().lower() == req.title.strip().lower()), None)
        if existing:
            existing["category"] = req.category
            existing["previousCategory"] = req.previousCategory
        else:
            corrections.append({
                "title": req.title.strip(),
                "category": req.category.strip(),
                "previousCategory": req.previousCategory,
                "userId": req.userId
            })

        with open(CORRECTIONS_PATH, "w", encoding="utf-8") as f:
            json.dump(corrections, f, indent=2)

        return len(corrections)

categorization_service = CategorizationService()

