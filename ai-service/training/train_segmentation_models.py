import os
import json
import time
import numpy as np
import joblib
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score

MODEL_DIR = os.path.join(os.path.dirname(__file__), "../models/segmentation")
REPORT_DIR = os.path.join(os.path.dirname(__file__), "../reports")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

def train_and_evaluate_segmentation():
    print("=" * 60)
    print("FINOVAX AI: TRAINING & EVALUATING CUSTOMER SEGMENTATION MODELS")
    print("=" * 60)

    np.random.seed(42)
    # Generate 5 distinct consumer archetypes (120 samples each = 600 synthetic benchmark users)
    # Features: [monthlyAvgSpend, essentialRatio, discretionaryRatio, transactionFrequency, savingsRate, avgTxAmount, recurringRatio]
    archetypes = [
        # Cluster 0: Low Spending & High Savings (Frugal Saver)
        np.column_stack([
            np.random.normal(16000, 3000, 120),  # monthlyAvgSpend
            np.random.normal(0.42, 0.05, 120),   # essentialRatio
            np.random.normal(0.14, 0.03, 120),   # discretionaryRatio
            np.random.normal(16, 4, 120),        # transactionFrequency
            np.random.normal(0.44, 0.05, 120),   # savingsRate
            np.random.normal(1000, 150, 120),    # avgTxAmount
            np.random.normal(0.20, 0.04, 120)    # recurringRatio
        ]),
        # Cluster 1: Balanced Disciplined Spender (Middle-Class Planner)
        np.column_stack([
            np.random.normal(38000, 5000, 120),
            np.random.normal(0.50, 0.05, 120),
            np.random.normal(0.25, 0.04, 120),
            np.random.normal(30, 5, 120),
            np.random.normal(0.25, 0.04, 120),
            np.random.normal(1260, 200, 120),
            np.random.normal(0.35, 0.05, 120)
        ]),
        # Cluster 2: High Volume Discretionary (Lifestyle Spender)
        np.column_stack([
            np.random.normal(78000, 10000, 120),
            np.random.normal(0.32, 0.05, 120),
            np.random.normal(0.58, 0.06, 120),
            np.random.normal(48, 8, 120),
            np.random.normal(0.10, 0.03, 120),
            np.random.normal(1625, 250, 120),
            np.random.normal(0.15, 0.03, 120)
        ]),
        # Cluster 3: Frequent Micro-Transactor (UPI-Heavy Millennial)
        np.column_stack([
            np.random.normal(30000, 4000, 120),
            np.random.normal(0.44, 0.05, 120),
            np.random.normal(0.42, 0.05, 120),
            np.random.normal(75, 10, 120),
            np.random.normal(0.14, 0.03, 120),
            np.random.normal(400, 60, 120),
            np.random.normal(0.10, 0.02, 120)
        ]),
        # Cluster 4: High Outflow & Fixed Obligations (Debt / EMI Burdened)
        np.column_stack([
            np.random.normal(68000, 7000, 120),
            np.random.normal(0.76, 0.04, 120),
            np.random.normal(0.17, 0.03, 120),
            np.random.normal(24, 5, 120),
            np.random.normal(0.07, 0.02, 120),
            np.random.normal(2830, 350, 120),
            np.random.normal(0.55, 0.05, 120)
        ])
    ]

    X = np.vstack(archetypes)
    # Clip realistic financial domain boundaries
    X[:, 0] = np.clip(X[:, 0], 1000, 250000)
    X[:, 1] = np.clip(X[:, 1], 0.0, 1.0)
    X[:, 2] = np.clip(X[:, 2], 0.0, 1.0)
    X[:, 3] = np.clip(X[:, 3], 1, 300)
    X[:, 4] = np.clip(X[:, 4], 0.0, 1.0)
    X[:, 5] = np.clip(X[:, 5], 50, 50000)
    X[:, 6] = np.clip(X[:, 6], 0.0, 1.0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 1. Cluster Count Selection (Evaluating k = 2..7)
    k_evaluations = {}
    print("\n--- Evaluating Optimal Cluster Count (Elbow & Silhouette) ---")
    for k in range(2, 8):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        preds = km.fit_predict(X_scaled)
        sil = float(silhouette_score(X_scaled, preds))
        db = float(davies_bouldin_score(X_scaled, preds))
        ch = float(calinski_harabasz_score(X_scaled, preds))
        k_evaluations[f"k={k}"] = {
            "silhouette_score": round(sil, 4),
            "davies_bouldin_index": round(db, 4),
            "calinski_harabasz_score": round(ch, 2),
            "inertia": round(float(km.inertia_), 2)
        }
        print(f"k={k} -> Silhouette: {sil:.4f}, Davies-Bouldin: {db:.4f}, Calinski-Harabasz: {ch:.2f}, Inertia: {km.inertia_:.1f}")

    results = {}

    # 2. Primary Model: KMeans (k=5) with deterministic archetype alignment
    print("\n--- Primary Model: KMeans (k=5) ---")
    start = time.time()
    archetype_init = np.array([
        [16000, 0.42, 0.14, 16, 0.44, 1000, 0.20],  # 0: Low Spending & High Savings
        [38000, 0.50, 0.25, 30, 0.25, 1260, 0.35],  # 1: Balanced Disciplined Spender
        [78000, 0.32, 0.58, 48, 0.10, 1625, 0.15],  # 2: High Volume Discretionary
        [30000, 0.44, 0.42, 75, 0.14, 400, 0.10],   # 3: Frequent Micro-Transactor
        [68000, 0.76, 0.17, 24, 0.07, 2830, 0.55]   # 4: High Outflow & Fixed Obligations
    ])
    init_scaled = scaler.transform(archetype_init)
    kmeans = KMeans(n_clusters=5, init=init_scaled, n_init=1, random_state=42)
    km_labels = kmeans.fit_predict(X_scaled)
    km_time = time.time() - start

    results["KMeans"] = {
        "n_clusters": 5,
        "silhouette_score": round(float(silhouette_score(X_scaled, km_labels)), 4),
        "davies_bouldin_index": round(float(davies_bouldin_score(X_scaled, km_labels)), 4),
        "calinski_harabasz_score": round(float(calinski_harabasz_score(X_scaled, km_labels)), 2),
        "fit_time_sec": round(km_time, 3),
        "role": "Primary Segmentation Engine"
    }

    # 3. Agglomerative Clustering (k=5)
    print("--- Alternative 1: Agglomerative Clustering (Hierarchical) ---")
    start = time.time()
    agg = AgglomerativeClustering(n_clusters=5)
    agg_labels = agg.fit_predict(X_scaled)
    agg_time = time.time() - start

    results["AgglomerativeClustering"] = {
        "n_clusters": 5,
        "silhouette_score": round(float(silhouette_score(X_scaled, agg_labels)), 4),
        "davies_bouldin_index": round(float(davies_bouldin_score(X_scaled, agg_labels)), 4),
        "calinski_harabasz_score": round(float(calinski_harabasz_score(X_scaled, agg_labels)), 2),
        "fit_time_sec": round(agg_time, 3),
        "role": "Hierarchical Clustering Benchmark"
    }

    # 4. DBSCAN (Density-Based)
    print("--- Alternative 2: DBSCAN (Density-Based Spatial Clustering) ---")
    start = time.time()
    dbscan = DBSCAN(eps=1.2, min_samples=15)
    db_labels = dbscan.fit_predict(X_scaled)
    db_time = time.time() - start

    # DBSCAN may assign noise (-1); calculate metrics on non-noise if > 1 cluster exists
    n_clusters_db = len(set(db_labels)) - (1 if -1 in db_labels else 0)
    if n_clusters_db > 1:
        valid_mask = db_labels != -1
        db_sil = round(float(silhouette_score(X_scaled[valid_mask], db_labels[valid_mask])), 4)
        db_db = round(float(davies_bouldin_score(X_scaled[valid_mask], db_labels[valid_mask])), 4)
        db_ch = round(float(calinski_harabasz_score(X_scaled[valid_mask], db_labels[valid_mask])), 2)
    else:
        db_sil, db_db, db_ch = 0.0, 0.0, 0.0

    results["DBSCAN"] = {
        "n_clusters_found": n_clusters_db,
        "noise_points": int(sum(db_labels == -1)),
        "silhouette_score": db_sil,
        "davies_bouldin_index": db_db,
        "calinski_harabasz_score": db_ch,
        "fit_time_sec": round(db_time, 3),
        "role": "Density-Based Outlier & Clustering Benchmark"
    }

    # Save artifacts
    joblib.dump(kmeans, os.path.join(MODEL_DIR, "kmeans_segmenter.joblib"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.joblib"))
    print(f"\n[OK] Saved KMeans Model and Scaler to {MODEL_DIR}")

    # Cluster centroids and human-readable archetypes
    centroids_unscaled = scaler.inverse_transform(kmeans.cluster_centers_)
    personas_dict = {
        0: {
            "name": "Low Spending & High Savings",
            "centroid": {
                "monthlySpend": round(float(centroids_unscaled[0][0]), 2),
                "essentialRatio": round(float(centroids_unscaled[0][1]), 2),
                "discretionaryRatio": round(float(centroids_unscaled[0][2]), 2),
                "frequency": round(float(centroids_unscaled[0][3]), 1),
                "savingsRate": round(float(centroids_unscaled[0][4]), 2)
            }
        },
        1: {
            "name": "Balanced Disciplined Spender",
            "centroid": {
                "monthlySpend": round(float(centroids_unscaled[1][0]), 2),
                "essentialRatio": round(float(centroids_unscaled[1][1]), 2),
                "discretionaryRatio": round(float(centroids_unscaled[1][2]), 2),
                "frequency": round(float(centroids_unscaled[1][3]), 1),
                "savingsRate": round(float(centroids_unscaled[1][4]), 2)
            }
        },
        2: {
            "name": "High Volume Discretionary",
            "centroid": {
                "monthlySpend": round(float(centroids_unscaled[2][0]), 2),
                "essentialRatio": round(float(centroids_unscaled[2][1]), 2),
                "discretionaryRatio": round(float(centroids_unscaled[2][2]), 2),
                "frequency": round(float(centroids_unscaled[2][3]), 1),
                "savingsRate": round(float(centroids_unscaled[2][4]), 2)
            }
        },
        3: {
            "name": "Frequent Micro-Transactor",
            "centroid": {
                "monthlySpend": round(float(centroids_unscaled[3][0]), 2),
                "essentialRatio": round(float(centroids_unscaled[3][1]), 2),
                "discretionaryRatio": round(float(centroids_unscaled[3][2]), 2),
                "frequency": round(float(centroids_unscaled[3][3]), 1),
                "savingsRate": round(float(centroids_unscaled[3][4]), 2)
            }
        },
        4: {
            "name": "High Outflow & Fixed Obligations",
            "centroid": {
                "monthlySpend": round(float(centroids_unscaled[4][0]), 2),
                "essentialRatio": round(float(centroids_unscaled[4][1]), 2),
                "discretionaryRatio": round(float(centroids_unscaled[4][2]), 2),
                "frequency": round(float(centroids_unscaled[4][3]), 1),
                "savingsRate": round(float(centroids_unscaled[4][4]), 2)
            }
        }
    }

    report = {
        "task": "Customer Persona & Spending Segmentation",
        "primary_model": "KMeans (k=5) with Standardized Scaler",
        "sample_size": X.shape[0],
        "feature_count": X.shape[1],
        "features": ["monthlyAvgSpend", "essentialRatio", "discretionaryRatio", "transactionFrequency", "savingsRate", "avgTxAmount", "recurringRatio"],
        "cluster_selection_evaluation": k_evaluations,
        "models_evaluated": results,
        "personas": personas_dict,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    with open(os.path.join(REPORT_DIR, "segmentation_model_comparison.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("[OK] Customer Segmentation Model Comparison Report Generated Successfully!")

if __name__ == "__main__":
    train_and_evaluate_segmentation()
