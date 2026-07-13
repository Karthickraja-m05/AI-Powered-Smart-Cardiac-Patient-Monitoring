# -*- coding: utf-8 -*-
"""
Enhanced ML Training Pipeline
==============================
Compares Random Forest, XGBoost, LightGBM, CatBoost, and Logistic Regression.
Selects the best model by F1 + Accuracy, exports artifacts.
"""

import os
import sys
import io
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, classification_report,
)

warnings.filterwarnings("ignore")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DATA_PATH = os.path.join(PROJECT_DIR, "heart.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "best_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
RESULTS_PATH = os.path.join(MODEL_DIR, "training_results.json")


def train():
    print("=" * 70)
    print("  CARDIOSENSE AI — ENHANCED ML TRAINING PIPELINE")
    print("=" * 70)

    # ── Load Data ──
    df = pd.read_csv(DATA_PATH)
    print(f"\n[INFO] Dataset: {df.shape[0]} rows × {df.shape[1]} columns")

    # Remove duplicates
    dups = df.duplicated().sum()
    if dups > 0:
        df.drop_duplicates(inplace=True)
        print(f"[INFO] Removed {dups} duplicate rows → {df.shape[0]} rows")

    # ── Split ──
    X = df.drop("target", axis=1)
    y = df["target"]
    feature_names = X.columns.tolist()

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"[OK] Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    # ── Define Models ──
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=42),
    }

    # Optional models
    try:
        from xgboost import XGBClassifier
        models["XGBoost"] = XGBClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=5,
            use_label_encoder=False, eval_metric="logloss", random_state=42,
        )
        print("[OK] XGBoost loaded")
    except ImportError:
        print("[SKIP] XGBoost not installed")

    try:
        from lightgbm import LGBMClassifier
        models["LightGBM"] = LGBMClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=5,
            random_state=42, verbose=-1,
        )
        print("[OK] LightGBM loaded")
    except ImportError:
        print("[SKIP] LightGBM not installed")

    try:
        from catboost import CatBoostClassifier
        models["CatBoost"] = CatBoostClassifier(
            iterations=200, learning_rate=0.1, depth=5,
            random_seed=42, verbose=0,
        )
        print("[OK] CatBoost loaded")
    except ImportError:
        print("[SKIP] CatBoost not installed")

    # ── Train & Evaluate ──
    print("\n" + "=" * 70)
    print("  TRAINING ALL MODELS")
    print("=" * 70)

    results = {}
    for name, model in models.items():
        print(f"\n  Training: {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)

        # Cross-validation
        cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="f1")

        results[name] = {
            "model": model,
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "cv_f1_mean": cv_scores.mean(),
            "cv_f1_std": cv_scores.std(),
        }
        print(f"    Accuracy: {acc:.4f} | F1: {f1:.4f} | CV-F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ── Comparison ──
    print("\n" + "=" * 70)
    print("  MODEL COMPARISON")
    print("=" * 70)

    comp_data = {
        name: {k: v for k, v in r.items() if k != "model"}
        for name, r in results.items()
    }
    comp_df = pd.DataFrame(comp_data).T.sort_values("f1", ascending=False)
    print(comp_df.to_string(float_format="%.4f"))

    # ── Select Best ──
    best_name = max(results, key=lambda n: results[n]["accuracy"] + results[n]["f1"])
    best_model = results[best_name]["model"]

    print(f"\n>>> BEST MODEL: {best_name}")
    print(f"    Accuracy: {results[best_name]['accuracy']:.4f}")
    print(f"    F1 Score: {results[best_name]['f1']:.4f}")

    # ── Classification Report ──
    y_pred_best = best_model.predict(X_test)
    print("\n" + classification_report(y_test, y_pred_best,
                                       target_names=["Low Risk", "Elevated Risk"]))

    # ── Feature Importance ──
    print("\n  FEATURE IMPORTANCE:")
    if hasattr(best_model, "feature_importances_"):
        importances = best_model.feature_importances_
    elif hasattr(best_model, "coef_"):
        importances = np.abs(best_model.coef_[0])
    else:
        importances = np.ones(len(feature_names))

    for idx in np.argsort(importances)[::-1]:
        print(f"    {feature_names[idx]:>20s}: {importances[idx]:.4f}")

    # ── Save ──
    joblib.dump(best_model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\n[SAVED] Model  → {MODEL_PATH}")
    print(f"[SAVED] Scaler → {SCALER_PATH}")

    # Save results as JSON
    import json
    results_json = {
        "best_model": best_name,
        "best_accuracy": results[best_name]["accuracy"],
        "best_f1": results[best_name]["f1"],
        "features": feature_names,
        "all_results": {
            name: {k: v for k, v in r.items() if k != "model"}
            for name, r in results.items()
        },
    }
    with open(RESULTS_PATH, "w") as f:
        json.dump(results_json, f, indent=2, default=str)
    print(f"[SAVED] Results → {RESULTS_PATH}")

    print("\n" + "=" * 70)
    print("  PIPELINE COMPLETE ✅")
    print("=" * 70)

    return best_model, scaler, results


if __name__ == "__main__":
    train()
