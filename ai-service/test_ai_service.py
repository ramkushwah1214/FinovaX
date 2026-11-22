import unittest
import os
import sys
import json

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.schemas.schemas import (
    CategorizationRequest,
    CategoryCorrectionRequest,
    TransactionAnalysisRequest,
    ForecastRequest,
    MonthlySpendPoint,
    SegmentationRequest,
    RetrainRequest
)
from app.services.categorization_service import categorization_service
from app.services.fraud_service import fraud_service
from app.services.forecast_service import forecast_service
from app.services.segmentation_service import segmentation_service

class TestFinovaxAIServiceUnit(unittest.TestCase):
    def test_01_categorization_ml_prediction(self):
        req = CategorizationRequest(title="Swiggy dinner order", amount=350.0)
        res = categorization_service.predict(req)
        self.assertEqual(res.category, "Food")
        self.assertIn(res.source, ["ml", "rule_based"])
        self.assertGreaterEqual(res.confidence, 0.4)

    def test_02_categorization_salary_inflow(self):
        req = CategorizationRequest(title="Corporate Monthly Payroll Salary", amount=95000.0, direction="credit")
        res = categorization_service.predict(req)
        self.assertEqual(res.category, "Salary")

    def test_03_categorization_transfer_classification(self):
        req = CategorizationRequest(title="Fund transfer between own bank accounts", amount=15000.0)
        res = categorization_service.predict(req)
        self.assertEqual(res.category, "Transfer")

    def test_04_categorization_user_correction_persistence(self):
        req = CategoryCorrectionRequest(
            title="Local Specialty Coffee Roaster",
            category="Food",
            previousCategory="Shopping"
        )
        total = categorization_service.record_correction(req)
        self.assertGreaterEqual(total, 1)

    def test_05_fraud_low_risk_baseline(self):
        req = TransactionAnalysisRequest(
            amount=250.0,
            type="expense",
            category="Food",
            title="Subway Lunch",
            user_avg_amount=300.0,
            user_std_amount=50.0,
            user_tx_count=15
        )
        res = fraud_service.analyze_transaction(req)
        self.assertFalse(res.is_anomaly)
        self.assertEqual(res.risk_level.value, "LOW")
        self.assertLessEqual(res.risk_score, 40)
        self.assertIn("statistical anomaly estimates", res.disclaimer)

    def test_06_fraud_high_risk_outlier(self):
        req = TransactionAnalysisRequest(
            amount=65000.0,
            type="expense",
            category="Electronics",
            title="Suspicious Outlier Purchase",
            user_avg_amount=1000.0,
            user_std_amount=200.0,
            user_tx_count=20
        )
        res = fraud_service.analyze_transaction(req)
        self.assertTrue(res.is_anomaly)
        self.assertEqual(res.risk_level.value, "HIGH")
        self.assertGreaterEqual(res.risk_score, 70)
        self.assertGreater(len(res.reasons), 0)

    def test_07_forecast_insufficient_data_contract(self):
        req = ForecastRequest(history=[], horizon_months=3)
        res = forecast_service.predict(req)
        self.assertEqual(res.status, "INSUFFICIENT_DATA")
        self.assertEqual(len(res.forecasts), 0)
        self.assertIn("minimum of 3 consecutive months", res.disclaimer)

    def test_08_forecast_valid_trajectory(self):
        history = [
            MonthlySpendPoint(month="2026-05", amount=30000.0),
            MonthlySpendPoint(month="2026-06", amount=32000.0),
            MonthlySpendPoint(month="2026-07", amount=31500.0)
        ]
        req = ForecastRequest(history=history, horizon_months=3)
        res = forecast_service.predict(req)
        self.assertEqual(res.status, "SUCCESS")
        self.assertEqual(len(res.forecasts), 3)
        self.assertGreater(res.forecasts[0].predictedAmount, 0)
        self.assertLessEqual(res.forecasts[0].lowerBound, res.forecasts[0].predictedAmount)
        self.assertGreaterEqual(res.forecasts[0].upperBound, res.forecasts[0].predictedAmount)

    def test_09_customer_segmentation_discretionary(self):
        req = SegmentationRequest(
            monthlyAvgSpend=60000.0,
            essentialRatio=0.30,
            discretionaryRatio=0.60,
            transactionFrequency=35,
            savingsRate=0.10
        )
        res = segmentation_service.segment_user(req)
        self.assertEqual(res.status, "SUCCESS")
        self.assertEqual(res.persona, "High Volume Discretionary")
        self.assertEqual(res.clusterId, 2)
        self.assertGreater(len(res.recommendations), 0)

    def test_10_customer_segmentation_saver(self):
        req = SegmentationRequest(
            monthlyAvgSpend=18000.0,
            essentialRatio=0.40,
            discretionaryRatio=0.15,
            transactionFrequency=12,
            savingsRate=0.45
        )
        res = segmentation_service.segment_user(req)
        self.assertEqual(res.status, "SUCCESS")
        self.assertEqual(res.persona, "Low Spending & High Savings")
        self.assertEqual(res.clusterId, 0)

    def test_11_customer_segmentation_insufficient_data(self):
        req = SegmentationRequest(
            monthlyAvgSpend=0.0,
            essentialRatio=0.0,
            discretionaryRatio=0.0,
            transactionFrequency=0,
            savingsRate=0.0
        )
        res = segmentation_service.segment_user(req)
        self.assertEqual(res.status, "INSUFFICIENT_DATA")

    def test_12_reports_directory_artifacts(self):
        reports_dir = os.path.join(os.path.dirname(__file__), "reports")
        self.assertTrue(os.path.exists(os.path.join(reports_dir, "categorization_model_comparison.json")))
        self.assertTrue(os.path.exists(os.path.join(reports_dir, "fraud_model_comparison.json")))
        self.assertTrue(os.path.exists(os.path.join(reports_dir, "forecast_model_comparison.json")))
        self.assertTrue(os.path.exists(os.path.join(reports_dir, "segmentation_model_comparison.json")))

if __name__ == "__main__":
    unittest.main()
