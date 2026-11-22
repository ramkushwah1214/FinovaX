import os
import json
import time
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.neighbors import LocalOutlierFactor
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, precision_recall_curve
)
from xgboost import XGBClassifier

RAW_CREDITCARD_PATH = os.path.join(os.path.dirname(__file__), "../data/raw/creditcard.csv")
RAW_PAYSIM_PATH = os.path.join(os.path.dirname(__file__), "../data/raw/PS_20174392719_1491204439457_log.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../models/fraud")
REPORT_DIR = os.path.join(os.path.dirname(__file__), "../reports")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

def evaluate_threshold_selection(y_val, val_scores):
    """
    Deterministically selects the optimal decision threshold on the validation split
    by maximizing the F1 score across the precision-recall curve.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_val, val_scores)
    f1_scores = np.where(
        (precisions + recalls) > 0,
        2 * (precisions * recalls) / (precisions + recalls + 1e-10),
        0
    )
    best_idx = np.argmax(f1_scores)
    best_thresh = float(thresholds[min(best_idx, len(thresholds) - 1)])
    best_f1 = float(f1_scores[best_idx])
    return best_thresh, round(best_f1, 4)

def calculate_fpr(cm):
    """Calculate False Positive Rate from confusion matrix [[TN, FP], [FN, TP]]."""
    tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
    return round(float(fp / (fp + tn + 1e-10)), 4)

def train_creditcard_models():
    print("\n" + "=" * 60)
    print("EXPERIMENT 1: CREDIT CARD FRAUD DETECTION (PCA FEATURES)")
    print("=" * 60)

    if not os.path.exists(RAW_CREDITCARD_PATH):
        print(f"Credit Card dataset not found at {RAW_CREDITCARD_PATH}")
        return None

    print("Loading Credit Card Fraud Dataset...")
    df = pd.read_csv(RAW_CREDITCARD_PATH)
    print(f"Dataset Loaded: {df.shape[0]} rows, {df.shape[1]} columns")

    fraud_df = df[df["Class"] == 1]
    genuine_df = df[df["Class"] == 0]
    print(f"Genuine transactions: {len(genuine_df)}, Fraud transactions: {len(fraud_df)}")

    # Representative stratified sample: all 492 fraud cases + 50,000 genuine cases
    sampled_genuine = genuine_df.sample(n=min(50000, len(genuine_df)), random_state=42)
    sample_df = pd.concat([fraud_df, sampled_genuine]).sample(frac=1.0, random_state=42).reset_index(drop=True)

    # Features: V1..V28 + Amount (exclude Class and Time)
    features = [c for c in sample_df.columns if c not in ["Class", "Time"]]
    X = sample_df[features].values
    y = sample_df["Class"].values

    # Stratified 70/15/15 train/val/test split
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f"Train split: {X_train.shape[0]}, Val split: {X_val.shape[0]}, Test split: {X_test.shape[0]}")
    results = {}

    # 1. Primary Model: Isolation Forest (Unsupervised Anomaly Detection)
    print("\n--- Model 1: Isolation Forest (Primary Unsupervised Anomaly Engine) ---")
    iso_start = time.time()
    X_train_genuine = X_train[y_train == 0]
    contamination_rate = len(fraud_df) / len(df) # Actual contamination ~ 0.0017
    iso = IsolationForest(
        n_estimators=100,
        contamination=float(np.clip(contamination_rate, 0.001, 0.05)),
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X_train_genuine)
    iso_train_time = time.time() - iso_start

    # Validation & test anomaly scores (-score_samples yields positive anomaly magnitude)
    iso_val_scores = -iso.score_samples(X_val)
    iso_test_scores = -iso.score_samples(X_test)

    # Optimal threshold selection on validation split
    best_iso_thresh, val_f1 = evaluate_threshold_selection(y_val, iso_val_scores)
    iso_preds = np.where(iso_test_scores >= best_iso_thresh, 1, 0)
    iso_cm = confusion_matrix(y_test, iso_preds).tolist()
    iso_fpr = calculate_fpr(iso_cm)

    results["IsolationForest"] = {
        "model_type": "Unsupervised Anomaly Detector",
        "training_time_sec": round(iso_train_time, 2),
        "validation_selected_threshold": round(best_iso_thresh, 4),
        "precision": round(precision_score(y_test, iso_preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, iso_preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, iso_preds, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, iso_test_scores), 4),
        "pr_auc": round(average_precision_score(y_test, iso_test_scores), 4),
        "false_positive_rate": iso_fpr,
        "confusion_matrix": iso_cm,
        "role": "Primary Anomaly Detection Engine (Unsupervised)"
    }
    print(f"Isolation Forest -> Prec: {results['IsolationForest']['precision']}, Rec: {results['IsolationForest']['recall']}, F1: {results['IsolationForest']['f1_score']}, PR-AUC: {results['IsolationForest']['pr_auc']}, FPR: {iso_fpr}")

    # 2. Comparison Model: Local Outlier Factor (LOF)
    print("\n--- Model 2: Local Outlier Factor (Unsupervised Comparison) ---")
    lof_start = time.time()
    # Subsampled fit for LOF to maintain reasonable compute time
    lof_subsample = X_train_genuine[:10000]
    lof = LocalOutlierFactor(n_neighbors=20, novelty=True, contamination=0.01, n_jobs=-1)
    lof.fit(lof_subsample)
    lof_time = time.time() - lof_start

    lof_test_scores = -lof.score_samples(X_test)
    lof_preds = np.where(lof.predict(X_test) == -1, 1, 0)
    lof_cm = confusion_matrix(y_test, lof_preds).tolist()
    lof_fpr = calculate_fpr(lof_cm)

    results["LocalOutlierFactor"] = {
        "model_type": "Density-Based Anomaly Detector (Unsupervised)",
        "training_time_sec": round(lof_time, 2),
        "precision": round(precision_score(y_test, lof_preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, lof_preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, lof_preds, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, lof_test_scores), 4),
        "pr_auc": round(average_precision_score(y_test, lof_test_scores), 4),
        "false_positive_rate": lof_fpr,
        "confusion_matrix": lof_cm,
        "role": "Alternative Unsupervised Anomaly Benchmark"
    }
    print(f"LOF -> Prec: {results['LocalOutlierFactor']['precision']}, Rec: {results['LocalOutlierFactor']['recall']}, ROC-AUC: {results['LocalOutlierFactor']['roc_auc']}, FPR: {lof_fpr}")

    # 3. Supervised Model: Random Forest Classifier
    print("\n--- Model 3: Random Forest Classifier (Supervised Ensemble) ---")
    rf_start = time.time()
    rf = RandomForestClassifier(n_estimators=60, max_depth=12, random_state=42, n_jobs=-1, class_weight="balanced")
    rf.fit(X_train, y_train)
    rf_time = time.time() - rf_start
    rf_preds = rf.predict(X_test)
    rf_probas = rf.predict_proba(X_test)[:, 1]
    rf_cm = confusion_matrix(y_test, rf_preds).tolist()
    rf_fpr = calculate_fpr(rf_cm)

    results["RandomForest"] = {
        "model_type": "Supervised Balanced Random Forest",
        "training_time_sec": round(rf_time, 2),
        "precision": round(precision_score(y_test, rf_preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, rf_preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, rf_preds, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, rf_probas), 4),
        "pr_auc": round(average_precision_score(y_test, rf_probas), 4),
        "false_positive_rate": rf_fpr,
        "confusion_matrix": rf_cm,
        "role": "Supervised Benchmark Classifier"
    }
    print(f"Random Forest -> Prec: {results['RandomForest']['precision']}, Rec: {results['RandomForest']['recall']}, F1: {results['RandomForest']['f1_score']}, PR-AUC: {results['RandomForest']['pr_auc']}, FPR: {rf_fpr}")

    # 4. Supervised Model: XGBoost Classifier
    print("\n--- Model 4: XGBoost Classifier (Gradient Boosted Trees) ---")
    xgb_start = time.time()
    xgb = XGBClassifier(n_estimators=60, max_depth=4, learning_rate=0.1, scale_pos_weight=10, random_state=42, eval_metric="logloss")
    xgb.fit(X_train, y_train)
    xgb_time = time.time() - xgb_start
    xgb_preds = xgb.predict(X_test)
    xgb_probas = xgb.predict_proba(X_test)[:, 1]
    xgb_cm = confusion_matrix(y_test, xgb_preds).tolist()
    xgb_fpr = calculate_fpr(xgb_cm)

    results["XGBoost"] = {
        "model_type": "Supervised Gradient Boosted Decision Trees",
        "training_time_sec": round(xgb_time, 2),
        "precision": round(precision_score(y_test, xgb_preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, xgb_preds, zero_division=0), 4),
        "f1_score": round(f1_score(y_test, xgb_preds, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, xgb_probas), 4),
        "pr_auc": round(average_precision_score(y_test, xgb_probas), 4),
        "false_positive_rate": xgb_fpr,
        "confusion_matrix": xgb_cm,
        "role": "Advanced Supervised Comparison"
    }
    print(f"XGBoost -> Prec: {results['XGBoost']['precision']}, Rec: {results['XGBoost']['recall']}, F1: {results['XGBoost']['f1_score']}, PR-AUC: {results['XGBoost']['pr_auc']}, FPR: {xgb_fpr}")

    # Save trained models
    joblib.dump(iso, os.path.join(MODEL_DIR, "isolation_forest.joblib"))
    joblib.dump(rf, os.path.join(MODEL_DIR, "fraud_rf.joblib"))

    return {
        "dataset": "Kaggle European Credit Card Fraud Benchmark",
        "domain": "Credit Card In-Store & Online PCA Transactions (V1-V28)",
        "dataset_rows": df.shape[0],
        "training_sample": sample_df.shape[0],
        "test_sample_size": X_test.shape[0],
        "fraud_cases_in_test": int(sum(y_test)),
        "models_compared": results
    }

def train_paysim_chunked_models():
    """
    Processes the 6.36-million-row PaySim mobile money transfer dataset in memory-efficient chunks.
    Extracts all frauds + representative genuine sample, excluding isFlaggedFraud and identifiers.
    """
    print("\n" + "=" * 60)
    print("EXPERIMENT 2: PAYSIM MOBILE MONEY CHUNKED STREAMING EXPERIMENT")
    print("=" * 60)

    if not os.path.exists(RAW_PAYSIM_PATH):
        print(f"PaySim dataset not found at {RAW_PAYSIM_PATH}. Skipping PaySim experiment.")
        return None

    print("Streaming PaySim dataset in 250,000-row chunks...")
    start_time = time.time()
    chunksize = 250000
    frauds = []
    genuine_samples = []
    total_streamed = 0

    # Stream through dataset without loading multiple 500MB copies into memory
    for chunk in pd.read_csv(RAW_PAYSIM_PATH, chunksize=chunksize):
        total_streamed += len(chunk)
        # 1. Capture all fraud rows
        f = chunk[chunk["isFraud"] == 1]
        if len(f) > 0:
            frauds.append(f)
        # 2. Sample balanced genuine cases per chunk (rate: 1500 per 250k)
        g = chunk[chunk["isFraud"] == 0].sample(n=min(1500, len(chunk)), random_state=42)
        genuine_samples.append(g)

    fraud_df = pd.concat(frauds, ignore_index=True)
    genuine_df = pd.concat(genuine_samples, ignore_index=True)
    stream_time = time.time() - start_time
    print(f"Streamed {total_streamed:,} total rows in {stream_time:.2f}s. Extracted {len(fraud_df)} frauds and {len(genuine_df)} genuine cases.")

    # Combine and construct domain-specific mobile money features
    paysim_df = pd.concat([fraud_df, genuine_df], ignore_index=True)

    # Feature Engineering (Strictly excluding isFlaggedFraud, nameOrig, and nameDest)
    # One-hot encode transfer type
    type_dummies = pd.get_dummies(paysim_df["type"], prefix="type", drop_first=True)
    
    # Financial discrepancy features
    error_orig = paysim_df["newbalanceOrig"] + paysim_df["amount"] - paysim_df["oldbalanceOrg"]
    error_dest = paysim_df["oldbalanceDest"] + paysim_df["amount"] - paysim_df["newbalanceDest"]

    feature_df = pd.concat([
        paysim_df[["step", "amount", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest"]],
        type_dummies
    ], axis=1)
    feature_df["errorBalanceOrig"] = error_orig
    feature_df["errorBalanceDest"] = error_dest

    X = feature_df.values.astype(np.float32)
    y = paysim_df["isFraud"].values.astype(np.int32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    print(f"PaySim Evaluated Features: {list(feature_df.columns)}")
    print(f"PaySim Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")

    # Evaluate Isolation Forest on PaySim Mobile Money Features
    iso_ps = IsolationForest(n_estimators=60, contamination=len(fraud_df)/total_streamed, random_state=42, n_jobs=-1)
    iso_ps.fit(X_train[y_train == 0])
    iso_ps_scores = -iso_ps.score_samples(X_test)
    iso_ps_preds = np.where(iso_ps.predict(X_test) == -1, 1, 0)
    iso_ps_cm = confusion_matrix(y_test, iso_ps_preds).tolist()

    # Evaluate Random Forest on PaySim
    rf_ps = RandomForestClassifier(n_estimators=40, max_depth=10, random_state=42, n_jobs=-1)
    rf_ps.fit(X_train, y_train)
    rf_ps_preds = rf_ps.predict(X_test)
    rf_ps_probas = rf_ps.predict_proba(X_test)[:, 1]
    rf_ps_cm = confusion_matrix(y_test, rf_ps_preds).tolist()

    paysim_results = {
        "IsolationForest_PaySim": {
            "model_type": "Unsupervised Anomaly Detector on Mobile Money Flows",
            "precision": round(precision_score(y_test, iso_ps_preds, zero_division=0), 4),
            "recall": round(recall_score(y_test, iso_ps_preds, zero_division=0), 4),
            "f1_score": round(f1_score(y_test, iso_ps_preds, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y_test, iso_ps_scores), 4),
            "pr_auc": round(average_precision_score(y_test, iso_ps_scores), 4),
            "false_positive_rate": calculate_fpr(iso_ps_cm),
            "confusion_matrix": iso_ps_cm
        },
        "RandomForest_PaySim": {
            "model_type": "Supervised Mobile Money Flow Classifier",
            "precision": round(precision_score(y_test, rf_ps_preds, zero_division=0), 4),
            "recall": round(recall_score(y_test, rf_ps_preds, zero_division=0), 4),
            "f1_score": round(f1_score(y_test, rf_ps_preds, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y_test, rf_ps_probas), 4),
            "pr_auc": round(average_precision_score(y_test, rf_ps_probas), 4),
            "false_positive_rate": calculate_fpr(rf_ps_cm),
            "confusion_matrix": rf_ps_cm
        }
    }
    print(f"PaySim Random Forest -> Prec: {paysim_results['RandomForest_PaySim']['precision']}, Rec: {paysim_results['RandomForest_PaySim']['recall']}, PR-AUC: {paysim_results['RandomForest_PaySim']['pr_auc']}")

    return {
        "dataset": "PaySim Synthetic Mobile Money Dataset",
        "domain": "Mobile Money Transfer & Cash-Out Ledger",
        "total_rows_streamed": total_streamed,
        "sample_analyzed": len(paysim_df),
        "frauds_detected_in_stream": len(fraud_df),
        "features_used": list(feature_df.columns),
        "excluded_features": ["isFlaggedFraud (leakage)", "nameOrig (identifier)", "nameDest (identifier)"],
        "models_compared": paysim_results
    }

def main():
    cc_report = train_creditcard_models()
    ps_report = train_paysim_chunked_models()

    final_report = {
        "task": "Fraud & Anomaly Intelligence",
        "primary_model": "IsolationForest (Unsupervised Statistical Anomaly Detection)",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "domain_distinction_notice": (
            "Credit card PCA features (V1-V28) and PaySim mobile money transfer features belong to separate financial domains. "
            "Neither dataset mirrors domestic Indian UPI rails directly (e.g. VPA addresses, NPCI settlement batches). "
            "FinovaX treats anomaly scores strictly as statistical variance measures to flag suspicious risk factors, "
            "distinguishing unsupervised anomaly detection from supervised fraud classification."
        ),
        "credit_card_experiment": cc_report,
        "paysim_chunked_experiment": ps_report,
        "models_compared": cc_report["models_compared"] if cc_report else {}
    }

    with open(os.path.join(MODEL_DIR, "fraud_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2)

    with open(os.path.join(REPORT_DIR, "fraud_model_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2)

    print("\n[OK] Fraud & Anomaly Intelligence Training and Comprehensive Benchmarking Completed Successfully!")

if __name__ == "__main__":
    main()
