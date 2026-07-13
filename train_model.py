# -*- coding: utf-8 -*-
"""
Heart Disease Prediction - Complete ML Pipeline
=================================================
Trains and compares multiple classifiers on the UCI Heart Disease dataset,
selects the best model, and exports artifacts for Gradio / Hugging Face deployment.

Output files:
  - heart_model.pkl   (best trained model)
  - scaler.pkl        (fitted StandardScaler)
"""

import os
import sys
import io
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                       # non-interactive backend
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    ConfusionMatrixDisplay,
)

warnings.filterwarnings("ignore")

# Force UTF-8 output on Windows to avoid cp1252 encoding errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ---------- paths ----------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "heart.csv")
MODEL_PATH = os.path.join(BASE_DIR, "heart_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")


# ==========================================================================
# 1. LOAD & ANALYSE THE DATASET
# ==========================================================================
print("=" * 70)
print("  HEART DISEASE PREDICTION -- ML PIPELINE")
print("=" * 70)

df = pd.read_csv(DATA_PATH)

print("\n[INFO] Dataset Shape:", df.shape)
print("\n--- First 5 rows ---")
print(df.head())

print("\n--- Dataset Info ---")
buf = io.StringIO()
df.info(buf=buf)
print(buf.getvalue())

print("\n--- Statistical Summary ---")
print(df.describe().to_string())

print("\n--- Missing Values ---")
missing = df.isnull().sum()
print(missing)
print(f"\nTotal missing values: {missing.sum()}")

print("\n--- Target Distribution ---")
print(df["target"].value_counts())
print(f"  1 (Heart Disease) : {(df['target'] == 1).sum()}")
print(f"  0 (No Heart Disease): {(df['target'] == 0).sum()}")

# Check for duplicate rows
duplicates = df.duplicated().sum()
print(f"\n--- Duplicate rows: {duplicates} ---")
if duplicates > 0:
    df.drop_duplicates(inplace=True)
    print(f"  Removed duplicates. New shape: {df.shape}")


# ==========================================================================
# 2. DATA PREPROCESSING
# ==========================================================================
print("\n" + "=" * 70)
print("  DATA PREPROCESSING")
print("=" * 70)

# 2a. Handle missing values (fill numeric with median if any exist)
if df.isnull().sum().sum() > 0:
    print("[!] Filling missing values with column medians ...")
    df.fillna(df.median(numeric_only=True), inplace=True)
else:
    print("[OK] No missing values detected.")

# 2b. All columns are already numeric in this dataset, so no encoding needed.
#     If categorical columns existed, we would apply LabelEncoder / OneHot here.
print("[OK] All features are numeric -- no encoding required.")

# 2c. Separate features & target
X = df.drop("target", axis=1)
y = df["target"]
feature_names = X.columns.tolist()

# 2d. Feature scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print("[OK] Feature scaling applied (StandardScaler).")


# ==========================================================================
# 3. TRAIN / TEST SPLIT  (80 / 20)
# ==========================================================================
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.20, random_state=42, stratify=y
)
print(f"\n[OK] Train set: {X_train.shape[0]} samples  |  Test set: {X_test.shape[0]} samples")


# ==========================================================================
# 4. DEFINE MODELS
# ==========================================================================
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Decision Tree":       DecisionTreeClassifier(random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=200, random_state=42),
    "SVM":                 SVC(kernel="rbf", probability=True, random_state=42),
}

# Try adding XGBoost if installed
try:
    from xgboost import XGBClassifier
    models["XGBoost"] = XGBClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    print("[OK] XGBoost available and added to model list.")
except ImportError:
    print("[i]  XGBoost not installed -- skipping.")


# ==========================================================================
# 5. TRAIN & EVALUATE ALL MODELS
# ==========================================================================
print("\n" + "=" * 70)
print("  MODEL TRAINING & EVALUATION")
print("=" * 70)

results = {}

for name, model in models.items():
    print(f"\n{'---' * 17}")
    print(f"  Training: {name}")
    print(f"{'---' * 17}")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec  = recall_score(y_test, y_pred)
    f1   = f1_score(y_test, y_pred)
    cm   = confusion_matrix(y_test, y_pred)

    results[name] = {
        "model":     model,
        "accuracy":  acc,
        "precision": prec,
        "recall":    rec,
        "f1":        f1,
        "cm":        cm,
    }

    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1 Score  : {f1:.4f}")
    print(f"  Confusion Matrix:\n{cm}")


# ==========================================================================
# 6. COMPARISON TABLE
# ==========================================================================
print("\n" + "=" * 70)
print("  MODEL COMPARISON")
print("=" * 70)

comp_df = pd.DataFrame({
    name: {
        "Accuracy":  r["accuracy"],
        "Precision": r["precision"],
        "Recall":    r["recall"],
        "F1 Score":  r["f1"],
    }
    for name, r in results.items()
}).T

comp_df.sort_values("F1 Score", ascending=False, inplace=True)
print(comp_df.to_string(float_format="%.4f"))


# ==========================================================================
# 7. SELECT BEST MODEL  (by combined accuracy + F1)
# ==========================================================================
best_name = max(results, key=lambda n: results[n]["accuracy"] + results[n]["f1"])
best_result = results[best_name]
best_model  = best_result["model"]

print(f"\n>>> Best Model: {best_name}")
print(f"    Accuracy : {best_result['accuracy']:.4f}")
print(f"    F1 Score : {best_result['f1']:.4f}")


# ==========================================================================
# 8. CLASSIFICATION REPORT (best model)
# ==========================================================================
print("\n" + "=" * 70)
print(f"  CLASSIFICATION REPORT -- {best_name}")
print("=" * 70)
y_pred_best = best_model.predict(X_test)
print(classification_report(y_test, y_pred_best, target_names=["No Disease", "Heart Disease"]))


# ==========================================================================
# 9. CONFUSION MATRIX PLOT (best model)
# ==========================================================================
fig_cm, ax_cm = plt.subplots(figsize=(6, 5))
ConfusionMatrixDisplay.from_estimator(
    best_model, X_test, y_test,
    display_labels=["No Disease", "Heart Disease"],
    cmap="Blues", ax=ax_cm,
)
ax_cm.set_title(f"Confusion Matrix -- {best_name}", fontsize=14, fontweight="bold")
plt.tight_layout()
cm_path = os.path.join(BASE_DIR, "confusion_matrix.png")
fig_cm.savefig(cm_path, dpi=150)
plt.close(fig_cm)
print(f"\n[SAVED] Confusion matrix --> {cm_path}")


# ==========================================================================
# 10. FEATURE IMPORTANCE VISUALISATION
# ==========================================================================
print("\n" + "=" * 70)
print("  FEATURE IMPORTANCE")
print("=" * 70)

fig_fi, ax_fi = plt.subplots(figsize=(10, 6))

if hasattr(best_model, "feature_importances_"):
    importances = best_model.feature_importances_
elif hasattr(best_model, "coef_"):
    importances = np.abs(best_model.coef_[0])
else:
    # For models without native importances (e.g. SVM with RBF),
    # use permutation importance as a fallback.
    from sklearn.inspection import permutation_importance
    perm = permutation_importance(best_model, X_test, y_test, n_repeats=20, random_state=42)
    importances = perm.importances_mean

sorted_idx = np.argsort(importances)
colors = plt.cm.viridis(np.linspace(0.3, 0.95, len(sorted_idx)))

ax_fi.barh(
    [feature_names[i] for i in sorted_idx],
    importances[sorted_idx],
    color=colors,
    edgecolor="white",
    linewidth=0.5,
)
ax_fi.set_xlabel("Importance", fontsize=12)
ax_fi.set_title(f"Feature Importance -- {best_name}", fontsize=14, fontweight="bold")
ax_fi.spines["top"].set_visible(False)
ax_fi.spines["right"].set_visible(False)
plt.tight_layout()
fi_path = os.path.join(BASE_DIR, "feature_importance.png")
fig_fi.savefig(fi_path, dpi=150)
plt.close(fig_fi)
print(f"[SAVED] Feature importance chart --> {fi_path}")


# ==========================================================================
# 11. MODEL COMPARISON BAR CHART
# ==========================================================================
fig_comp, ax_comp = plt.subplots(figsize=(12, 6))
x_labels = list(comp_df.index)
x = np.arange(len(x_labels))
width = 0.2
metrics = ["Accuracy", "Precision", "Recall", "F1 Score"]
bar_colors = ["#4C72B0", "#55A868", "#C44E52", "#8172B2"]

for i, (metric, color) in enumerate(zip(metrics, bar_colors)):
    ax_comp.bar(x + i * width, comp_df[metric], width, label=metric, color=color)

ax_comp.set_xticks(x + width * 1.5)
ax_comp.set_xticklabels(x_labels, fontsize=11)
ax_comp.set_ylim(0, 1.12)
ax_comp.set_ylabel("Score", fontsize=12)
ax_comp.set_title("Model Performance Comparison", fontsize=14, fontweight="bold")
ax_comp.legend(loc="upper right", fontsize=10)
ax_comp.spines["top"].set_visible(False)
ax_comp.spines["right"].set_visible(False)

# Annotate bars
for i, metric in enumerate(metrics):
    for j, val in enumerate(comp_df[metric]):
        ax_comp.text(j + i * width, val + 0.015, f"{val:.2f}", ha="center", fontsize=7.5)

plt.tight_layout()
comp_path = os.path.join(BASE_DIR, "model_comparison.png")
fig_comp.savefig(comp_path, dpi=150)
plt.close(fig_comp)
print(f"[SAVED] Model comparison chart --> {comp_path}")


# ==========================================================================
# 12. SAVE MODEL & SCALER
# ==========================================================================
joblib.dump(best_model, MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)
print(f"\n[SAVED] Model  --> {MODEL_PATH}")
print(f"[SAVED] Scaler --> {SCALER_PATH}")


# ==========================================================================
# 13. PREDICTION FUNCTION  (Gradio / HF Spaces compatible)
# ==========================================================================
def predict_heart_disease(
    age: float,
    sex: int,
    cp: int,
    trestbps: float,
    chol: float,
    fbs: int,
    restecg: int,
    thalach: float,
    exang: int,
    oldpeak: float,
    slope: int,
    ca: int,
    thal: int,
) -> dict:
    """
    Predict heart disease from 13 clinical features.

    Parameters
    ----------
    age      : Age in years
    sex      : Sex (1 = male, 0 = female)
    cp       : Chest pain type (0-3)
    trestbps : Resting blood pressure (mm Hg)
    chol     : Serum cholesterol (mg/dl)
    fbs      : Fasting blood sugar > 120 mg/dl (1 = true, 0 = false)
    restecg  : Resting ECG results (0-2)
    thalach  : Maximum heart rate achieved
    exang    : Exercise induced angina (1 = yes, 0 = no)
    oldpeak  : ST depression induced by exercise
    slope    : Slope of the peak exercise ST segment (0-2)
    ca       : Number of major vessels coloured by fluoroscopy (0-4)
    thal     : Thalassemia (0 = normal, 1 = fixed defect, 2 = reversible defect, 3 = ?)

    Returns
    -------
    dict with keys: "prediction" (str), "probability" (float), "label" (int)
    """
    # Load artefacts (allows standalone usage after training)
    loaded_model  = joblib.load(MODEL_PATH)
    loaded_scaler = joblib.load(SCALER_PATH)

    # Build input array
    input_data = np.array(
        [[age, sex, cp, trestbps, chol, fbs, restecg,
          thalach, exang, oldpeak, slope, ca, thal]]
    )
    input_scaled = loaded_scaler.transform(input_data)

    # Predict
    prediction = loaded_model.predict(input_scaled)[0]
    probability = loaded_model.predict_proba(input_scaled)[0]

    label = int(prediction)
    prob_pct = probability[label] * 100

    result = {
        "prediction":  "Heart Disease" if label == 1 else "No Heart Disease",
        "probability": round(prob_pct, 2),
        "label":       label,
    }
    return result


# ---------- quick sanity check with a sample from the dataset ----------
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("  SAMPLE PREDICTION")
    print("=" * 70)

    sample = df.iloc[0]
    result = predict_heart_disease(
        age=sample["age"],
        sex=int(sample["sex"]),
        cp=int(sample["cp"]),
        trestbps=sample["trestbps"],
        chol=sample["chol"],
        fbs=int(sample["fbs"]),
        restecg=int(sample["restecg"]),
        thalach=sample["thalach"],
        exang=int(sample["exang"]),
        oldpeak=sample["oldpeak"],
        slope=int(sample["slope"]),
        ca=int(sample["ca"]),
        thal=int(sample["thal"]),
    )

    print(f"\n  Input  : Row 0 -- age={sample['age']}, sex={int(sample['sex'])}, ...")
    print(f"  Result : {result['prediction']}  ({result['probability']}% confidence)")
    print(f"  Actual : {'Heart Disease' if sample['target'] == 1 else 'No Heart Disease'}")

    print("\n" + "=" * 70)
    print("  [DONE] PIPELINE COMPLETE -- All files saved successfully.")
    print("=" * 70)
