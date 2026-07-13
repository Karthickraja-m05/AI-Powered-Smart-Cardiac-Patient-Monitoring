# -*- coding: utf-8 -*-
"""
Heart Disease Prediction - Anti Overfit/Underfit ML Pipeline
=============================================================
Google Colab Ready — Upload heart.csv and run all cells.

Key techniques to prevent Overfitting & Underfitting:
  ✅ Stratified K-Fold Cross Validation (5-fold)
  ✅ GridSearchCV for hyperparameter tuning
  ✅ Regularization (controlled tree depth, C parameter, etc.)
  ✅ Learning Curves to visually detect fit issues
  ✅ Train vs Test accuracy gap analysis
  ✅ Duplicate removal & proper preprocessing
  ✅ Feature correlation analysis
  ✅ Multiple model comparison with confidence intervals

Output files:
  - heart_model.pkl   (best tuned model)
  - scaler.pkl        (fitted StandardScaler)
"""

# ============================================================================
# CELL 1: INSTALL DEPENDENCIES (run this cell first in Colab)
# ============================================================================
# !pip install -q xgboost scikit-learn pandas numpy matplotlib seaborn joblib

import os
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import (
    train_test_split,
    StratifiedKFold,
    GridSearchCV,
    cross_val_score,
    learning_curve,
)
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
)
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    ConfusionMatrixDisplay,
    RocCurveDisplay,
)

warnings.filterwarnings("ignore")
plt.style.use("seaborn-v0_8-darkgrid")
sns.set_palette("husl")

# ── Feature Configuration (inline for Colab — no extra file needed) ──
COLUMN_RENAME_MAP = {
    "age": "Age (Years)", "sex": "Gender", "cp": "Chest Pain Type",
    "trestbps": "Resting Blood Pressure (mmHg)",
    "chol": "Cholesterol Level (mg/dL)", "fbs": "Fasting Blood Sugar",
    "restecg": "ECG Result", "thalach": "Maximum Heart Rate",
    "exang": "Exercise Induced Angina", "oldpeak": "ST Depression",
    "slope": "ST Segment Slope", "ca": "Number of Major Vessels",
    "thal": "Thalassemia Status", "target": "Heart Disease Risk",
}
COLUMN_REVERSE_MAP = {v: k for k, v in COLUMN_RENAME_MAP.items()}

CATEGORICAL_LABELS = {
    "Gender":                   {0: "Female", 1: "Male"},
    "Chest Pain Type":          {0: "Typical Angina", 1: "Atypical Angina",
                                 2: "Non-Anginal Pain", 3: "Asymptomatic"},
    "Fasting Blood Sugar":      {0: "Normal (≤ 120 mg/dL)",
                                 1: "Elevated (> 120 mg/dL)"},
    "ECG Result":               {0: "Normal", 1: "ST-T Wave Abnormality",
                                 2: "Left Ventricular Hypertrophy"},
    "Exercise Induced Angina":  {0: "No", 1: "Yes"},
    "ST Segment Slope":         {0: "Upsloping", 1: "Flat", 2: "Downsloping"},
    "Number of Major Vessels":  {0: "0", 1: "1", 2: "2", 3: "3", 4: "4"},
    "Thalassemia Status":       {0: "Normal", 1: "Fixed Defect",
                                 2: "Reversible Defect", 3: "Unknown / Other"},
    "Heart Disease Risk":       {0: "No Heart Disease",
                                 1: "Heart Disease Detected"},
}

FEATURE_DESCRIPTIONS = {
    "Age (Years)":                       "Patient age in years. Major risk factor above 45 (M) / 55 (F).",
    "Gender":                            "Biological sex. Males have higher early-life cardiovascular risk.",
    "Chest Pain Type":                   "Type of chest pain. Asymptomatic (3) is paradoxically more linked to disease.",
    "Resting Blood Pressure (mmHg)":     "BP at rest. Normal <120; Hypertension ≥140 mmHg.",
    "Cholesterol Level (mg/dL)":         "Total serum cholesterol. Desirable <200; High ≥240 mg/dL.",
    "Fasting Blood Sugar":               "Blood sugar >120 mg/dL may indicate diabetes.",
    "ECG Result":                        "Resting ECG. LVH suggests chronic pressure overload.",
    "Maximum Heart Rate":                "Peak heart rate during stress test. Expected max ≈ 220 − age.",
    "Exercise Induced Angina":           "Chest pain during exercise = coronary arteries can't meet demand.",
    "ST Depression":                     "ST depression during exercise (mm). >1.0 mm is significant.",
    "ST Segment Slope":                  "ST slope during peak exercise. Downsloping is most concerning.",
    "Number of Major Vessels":           "Vessels visible via fluoroscopy (0-4). More = better perfusion.",
    "Thalassemia Status":                "Thallium stress test result. Reversible defect = ischemic but viable tissue.",
    "Heart Disease Risk":                "Target variable. 1 = angiographic narrowing >50% in any major vessel.",
}

def rename_columns(dataframe):
    """Rename raw CSV columns to friendly medical names."""
    return dataframe.rename(columns=COLUMN_RENAME_MAP)

def decode_categoricals(dataframe):
    """Replace numeric codes with human-readable medical labels."""
    df_dec = dataframe.copy()
    for col, mapping in CATEGORICAL_LABELS.items():
        if col in df_dec.columns:
            df_dec[col] = df_dec[col].map(mapping).fillna(df_dec[col])
    return df_dec

print("✅ All libraries + feature configuration loaded successfully!")


# ============================================================================
# CELL 2: LOAD THE DATASET
# ============================================================================
# ------- Google Colab: Upload heart.csv using this -------
# from google.colab import files
# uploaded = files.upload()        # <-- click "Choose Files" and pick heart.csv
# DATA_PATH = "heart.csv"

# ------- Local: use this instead -------
DATA_PATH = "heart.csv"

df = pd.read_csv(DATA_PATH)

print("=" * 70)
print("  📊 DATASET OVERVIEW")
print("=" * 70)
print(f"\n  Shape           : {df.shape[0]} rows × {df.shape[1]} columns")
print(f"  Missing values  : {df.isnull().sum().sum()}")
print(f"  Duplicate rows  : {df.duplicated().sum()}")

print("\n--- First 5 Rows ---")
print(df.head().to_string())

print("\n--- Column Types ---")
print(df.dtypes.to_string())

print("\n--- Statistical Summary ---")
print(df.describe().round(2).to_string())


# ============================================================================
# CELL 2B: DATA DICTIONARY & FEATURE MAPPING
# ============================================================================
print("\n" + "=" * 70)
print("  📖 DATA DICTIONARY — Feature Mapping")
print("=" * 70)

print("\n  Column Rename Map (raw → friendly):")
print("  " + "─" * 55)
for raw, friendly in COLUMN_RENAME_MAP.items():
    print(f"    {raw:>10s}  →  {friendly}")

print("\n\n  🏷️  Categorical Value Decodings:")
print("  " + "─" * 55)
for feature, mapping in CATEGORICAL_LABELS.items():
    print(f"\n    {feature}:")
    for code, label in mapping.items():
        print(f"      {code} = {label}")

print("\n\n  📋 Feature Descriptions:")
print("  " + "─" * 55)
for feat_name, desc in FEATURE_DESCRIPTIONS.items():
    if feat_name != "Heart Disease Risk":
        print(f"    {feat_name}")
        print(f"      {desc}")

# Show the renamed DataFrame
df_display = rename_columns(df.copy())
df_decoded = decode_categoricals(df_display)
print("\n\n--- First 5 Rows (Friendly Names + Decoded Categories) ---")
print(df_decoded.head().to_string())


# ============================================================================
# CELL 3: DATA CLEANING & EXPLORATION
# ============================================================================
print("\n" + "=" * 70)
print("  🧹 DATA CLEANING & EXPLORATION")
print("=" * 70)

# 3a. Remove duplicates
duplicates = df.duplicated().sum()
if duplicates > 0:
    df.drop_duplicates(inplace=True)
    print(f"  ⚠️  Removed {duplicates} duplicate row(s). New shape: {df.shape}")
else:
    print("  ✅ No duplicates found.")

# 3b. Handle missing values
if df.isnull().sum().sum() > 0:
    print("  ⚠️  Filling missing values with column medians ...")
    df.fillna(df.median(numeric_only=True), inplace=True)
else:
    print("  ✅ No missing values.")

# 3c. Target distribution
print("\n--- Target Distribution ---")
target_counts = df["target"].value_counts()
print(f"  1 (Heart Disease)    : {target_counts.get(1, 0)}  "
      f"({target_counts.get(1, 0) / len(df) * 100:.1f}%)")
print(f"  0 (No Heart Disease) : {target_counts.get(0, 0)}  "
      f"({target_counts.get(0, 0) / len(df) * 100:.1f}%)")

# 3d. Target distribution bar chart
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

colors_target = ["#e74c3c", "#2ecc71"]
target_counts.plot(kind="bar", ax=axes[0], color=colors_target, edgecolor="white",
                   linewidth=1.5)
axes[0].set_title("Target Distribution", fontsize=14, fontweight="bold")
axes[0].set_xlabel("Target", fontsize=12)
axes[0].set_ylabel("Count", fontsize=12)
axes[0].set_xticklabels(["No Disease (0)", "Heart Disease (1)"], rotation=0)
for i, v in enumerate(target_counts.values):
    axes[0].text(i, v + 2, str(v), ha="center", fontweight="bold", fontsize=12)

# 3e. Age distribution by target
df[df["target"] == 0]["age"].plot(kind="hist", ax=axes[1], alpha=0.6,
                                   bins=20, label="No Disease", color="#e74c3c")
df[df["target"] == 1]["age"].plot(kind="hist", ax=axes[1], alpha=0.6,
                                   bins=20, label="Heart Disease", color="#2ecc71")
axes[1].set_title("Age Distribution by Target", fontsize=14, fontweight="bold")
axes[1].set_xlabel("Age", fontsize=12)
axes[1].legend(fontsize=11)

plt.tight_layout()
plt.show()


# ============================================================================
# CELL 4: CORRELATION ANALYSIS (with friendly medical names)
# ============================================================================
print("\n" + "=" * 70)
print("  🔗 FEATURE CORRELATION ANALYSIS")
print("=" * 70)

# Use friendly column names for the heatmap
df_friendly = rename_columns(df.copy())
fig, ax = plt.subplots(figsize=(16, 12))
corr_friendly = df_friendly.corr()
mask = np.triu(np.ones_like(corr_friendly, dtype=bool))
sns.heatmap(corr_friendly, mask=mask, annot=True, fmt=".2f", cmap="RdBu_r",
            center=0, linewidths=0.5, ax=ax,
            cbar_kws={"shrink": 0.8, "label": "Correlation"},
            annot_kws={"fontsize": 8})
ax.set_title("Feature Correlation Heatmap (Medical Names)",
             fontsize=16, fontweight="bold", pad=20)
ax.tick_params(axis='x', rotation=35, labelsize=9)
ax.tick_params(axis='y', labelsize=9)
plt.tight_layout()
plt.show()

# Show top correlations with target using friendly names
corr_raw = df.corr()
target_corr = corr_raw["target"].drop("target").abs().sort_values(ascending=False)
print("\n--- Top Feature Correlations with Heart Disease Risk ---")
for feat, val in target_corr.items():
    friendly = COLUMN_RENAME_MAP.get(feat, feat)
    bar = "█" * int(val * 40)
    print(f"  {friendly:>35s}  {val:.3f}  {bar}")


# ============================================================================
# CELL 5: DATA PREPROCESSING
# ============================================================================
print("\n" + "=" * 70)
print("  ⚙️  DATA PREPROCESSING")
print("=" * 70)

# Separate features & target
X = df.drop("target", axis=1)
y = df["target"]
feature_names = X.columns.tolist()

print(f"  Features : {len(feature_names)}")
print(f"  Samples  : {len(y)}")

# Feature scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print("  ✅ StandardScaler applied.")

# Train/Test split (80/20, stratified)
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.20, random_state=42, stratify=y
)
print(f"  ✅ Train: {X_train.shape[0]} samples | Test: {X_test.shape[0]} samples")
print(f"     Train target ratio: {y_train.mean():.2f} | Test target ratio: {y_test.mean():.2f}")


# ============================================================================
# CELL 6: DEFINE MODELS WITH REGULARIZATION (Anti-Overfit)
# ============================================================================
print("\n" + "=" * 70)
print("  🤖 MODEL DEFINITIONS (with Regularization)")
print("=" * 70)

# Cross-validation strategy
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# -----------------------------------------------------------------------
# Models are tuned with REGULARIZATION to prevent overfitting:
#   - LogisticRegression: C parameter controls regularization strength
#   - DecisionTree: max_depth, min_samples_split prevent overgrown trees
#   - RandomForest: max_depth + many estimators reduce variance
#   - SVM: C + gamma control decision boundary complexity
#   - GradientBoosting: learning_rate + max_depth + subsample
#   - KNN: n_neighbors controls smoothness
# -----------------------------------------------------------------------

models = {
    "Logistic Regression": LogisticRegression(
        C=1.0,               # regularization (lower = more regularized)
        penalty="l2",         # L2 regularization prevents large weights
        max_iter=1000,
        random_state=42,
    ),
    "Decision Tree": DecisionTreeClassifier(
        max_depth=5,          # ⚡ PREVENTS OVERFITTING (no unlimited depth)
        min_samples_split=10, # minimum samples to split a node
        min_samples_leaf=5,   # minimum samples in leaf
        random_state=42,
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=200,
        max_depth=8,          # constrained depth
        min_samples_split=5,
        min_samples_leaf=3,
        max_features="sqrt",  # random feature subset reduces correlation
        random_state=42,
    ),
    "SVM": SVC(
        C=1.0,
        kernel="rbf",
        gamma="scale",        # auto-scaled gamma
        probability=True,
        random_state=42,
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,    # slow learning = better generalization
        max_depth=4,
        subsample=0.8,        # row subsampling reduces overfitting
        min_samples_split=10,
        random_state=42,
    ),
    "KNN": KNeighborsClassifier(
        n_neighbors=7,        # odd number, not too small (overfit) or large (underfit)
        weights="distance",
        metric="minkowski",
    ),
}

# Try adding XGBoost
try:
    from xgboost import XGBClassifier
    models["XGBoost"] = XGBClassifier(
        n_estimators=200,
        learning_rate=0.05,   # slow learning
        max_depth=4,
        subsample=0.8,
        colsample_bytree=0.8, # feature subsampling
        reg_alpha=0.1,        # L1 regularization
        reg_lambda=1.0,       # L2 regularization
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )
    print("  ✅ XGBoost available and added.")
except ImportError:
    print("  ℹ️  XGBoost not installed. Install with: !pip install xgboost")

print(f"\n  Total models to evaluate: {len(models)}")
for name in models:
    print(f"    • {name}")


# ============================================================================
# CELL 7: CROSS-VALIDATION EVALUATION (Anti-Overfit Check)
# ============================================================================
print("\n" + "=" * 70)
print("  📈 5-FOLD STRATIFIED CROSS-VALIDATION")
print("=" * 70)
print("  (This is the GOLD STANDARD for detecting overfit/underfit)\n")

cv_results = {}

for name, model in models.items():
    # Cross-validation scores
    scores = cross_val_score(model, X_scaled, y, cv=cv, scoring="accuracy")

    # Also train on train set and evaluate on test set for gap analysis
    model.fit(X_train, y_train)
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)
    gap = train_acc - test_acc

    y_pred = model.predict(X_test)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    # AUC if probabilities available
    try:
        y_proba = model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_proba)
    except Exception:
        auc = 0.0

    cv_results[name] = {
        "model":      model,
        "cv_mean":    scores.mean(),
        "cv_std":     scores.std(),
        "train_acc":  train_acc,
        "test_acc":   test_acc,
        "gap":        gap,
        "precision":  prec,
        "recall":     rec,
        "f1":         f1,
        "auc":        auc,
        "y_pred":     y_pred,
    }

    # Overfit / Underfit diagnosis
    if gap > 0.10:
        status = "⚠️  OVERFITTING (train >> test)"
    elif test_acc < 0.70:
        status = "⚠️  UNDERFITTING (low accuracy)"
    elif gap > 0.05:
        status = "🟡 Slight overfit"
    else:
        status = "✅ GOOD FIT"

    print(f"  {name}")
    print(f"    CV Accuracy  : {scores.mean():.4f} ± {scores.std():.4f}")
    print(f"    Train Acc    : {train_acc:.4f}")
    print(f"    Test Acc     : {test_acc:.4f}")
    print(f"    Gap          : {gap:.4f}  →  {status}")
    print(f"    F1 Score     : {f1:.4f}  |  AUC: {auc:.4f}")
    print()


# ============================================================================
# CELL 8: HYPERPARAMETER TUNING (GridSearchCV on Top 2 Models)
# ============================================================================
print("\n" + "=" * 70)
print("  🔧 HYPERPARAMETER TUNING (GridSearchCV)")
print("=" * 70)
print("  Tuning the best models to find optimal parameters...\n")

# Hyperparameter grids
param_grids = {
    "Random Forest": {
        "n_estimators": [100, 200, 300],
        "max_depth": [5, 8, 12, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 3, 5],
        "max_features": ["sqrt", "log2"],
    },
    "Logistic Regression": {
        "C": [0.01, 0.1, 0.5, 1.0, 5.0, 10.0],
        "penalty": ["l2"],
        "solver": ["lbfgs", "liblinear"],
    },
    "Gradient Boosting": {
        "n_estimators": [100, 200, 300],
        "learning_rate": [0.01, 0.05, 0.1, 0.2],
        "max_depth": [3, 4, 5, 6],
        "subsample": [0.7, 0.8, 0.9, 1.0],
    },
    "SVM": {
        "C": [0.1, 0.5, 1.0, 5.0, 10.0],
        "gamma": ["scale", "auto", 0.01, 0.1],
        "kernel": ["rbf"],
    },
}

# Sort models by CV score and tune top candidates
sorted_models = sorted(cv_results.items(), key=lambda x: x[1]["cv_mean"], reverse=True)

tuned_results = {}
for name, result in sorted_models:
    if name in param_grids:
        print(f"  🔍 Tuning: {name} ...")

        base_model_class = type(models[name])
        grid = GridSearchCV(
            estimator=base_model_class(random_state=42) if hasattr(models[name], "random_state") else base_model_class(),
            param_grid=param_grids[name],
            cv=cv,
            scoring="f1",
            n_jobs=-1,
            verbose=0,
        )
        grid.fit(X_train, y_train)

        best_model = grid.best_estimator_
        y_pred_tuned = best_model.predict(X_test)

        tuned_train_acc = best_model.score(X_train, y_train)
        tuned_test_acc = best_model.score(X_test, y_test)
        tuned_f1 = f1_score(y_test, y_pred_tuned)

        try:
            y_proba_tuned = best_model.predict_proba(X_test)[:, 1]
            tuned_auc = roc_auc_score(y_test, y_proba_tuned)
        except Exception:
            tuned_auc = 0.0

        tuned_gap = tuned_train_acc - tuned_test_acc

        tuned_results[name] = {
            "model":     best_model,
            "train_acc": tuned_train_acc,
            "test_acc":  tuned_test_acc,
            "f1":        tuned_f1,
            "auc":       tuned_auc,
            "gap":       tuned_gap,
            "params":    grid.best_params_,
            "y_pred":    y_pred_tuned,
        }

        print(f"    Best Params  : {grid.best_params_}")
        print(f"    Train Acc    : {tuned_train_acc:.4f}")
        print(f"    Test Acc     : {tuned_test_acc:.4f}")
        print(f"    Gap          : {tuned_gap:.4f}")
        print(f"    F1 (tuned)   : {tuned_f1:.4f}")
        print(f"    AUC (tuned)  : {tuned_auc:.4f}")
        print()


# ============================================================================
# CELL 9: SELECT BEST MODEL
# ============================================================================
print("\n" + "=" * 70)
print("  🏆 BEST MODEL SELECTION")
print("=" * 70)

# Combine all results (prefer tuned if available)
all_candidates = {}
for name, res in cv_results.items():
    all_candidates[name] = {
        "model":    res["model"],
        "test_acc": res["test_acc"],
        "f1":       res["f1"],
        "auc":      res["auc"],
        "gap":      res["gap"],
        "y_pred":   res["y_pred"],
        "source":   "baseline",
    }

for name, res in tuned_results.items():
    tuned_name = f"{name} (Tuned)"
    all_candidates[tuned_name] = {
        "model":    res["model"],
        "test_acc": res["test_acc"],
        "f1":       res["f1"],
        "auc":      res["auc"],
        "gap":      res["gap"],
        "y_pred":   res["y_pred"],
        "source":   "tuned",
    }

# Score = weighted combination, penalize large gaps (overfit penalty)
def model_score(candidate):
    overfit_penalty = max(0, candidate["gap"] - 0.05) * 2
    return (candidate["f1"] * 0.4 +
            candidate["auc"] * 0.3 +
            candidate["test_acc"] * 0.3 -
            overfit_penalty)

best_name = max(all_candidates, key=lambda n: model_score(all_candidates[n]))
best_candidate = all_candidates[best_name]
best_model = best_candidate["model"]

print(f"\n  🥇 Winner: {best_name}")
print(f"     Test Accuracy : {best_candidate['test_acc']:.4f}")
print(f"     F1 Score      : {best_candidate['f1']:.4f}")
print(f"     AUC-ROC       : {best_candidate['auc']:.4f}")
print(f"     Train-Test Gap: {best_candidate['gap']:.4f}")
print(f"     Source         : {best_candidate['source']}")


# ============================================================================
# CELL 10: DETAILED EVALUATION OF BEST MODEL
# ============================================================================
print("\n" + "=" * 70)
print(f"  📋 CLASSIFICATION REPORT — {best_name}")
print("=" * 70)

y_pred_best = best_candidate["y_pred"]
print(classification_report(y_test, y_pred_best,
                            target_names=["No Disease", "Heart Disease"]))


# ============================================================================
# CELL 11: CONFUSION MATRIX
# ============================================================================
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Confusion Matrix
ConfusionMatrixDisplay.from_estimator(
    best_model, X_test, y_test,
    display_labels=["No Disease", "Heart Disease"],
    cmap="Blues", ax=axes[0],
)
axes[0].set_title(f"Confusion Matrix — {best_name}", fontsize=13, fontweight="bold")

# ROC Curve
try:
    RocCurveDisplay.from_estimator(best_model, X_test, y_test, ax=axes[1],
                                    color="#e74c3c", linewidth=2)
    axes[1].plot([0, 1], [0, 1], "k--", alpha=0.5, linewidth=1)
    axes[1].set_title(f"ROC Curve — AUC: {best_candidate['auc']:.4f}",
                       fontsize=13, fontweight="bold")
except Exception:
    axes[1].text(0.5, 0.5, "ROC not available", ha="center", fontsize=14)

plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=150, bbox_inches="tight")
plt.show()
print("  💾 Saved: confusion_matrix.png")


# ============================================================================
# CELL 12: LEARNING CURVES (Overfit/Underfit Visual Diagnostic)
# ============================================================================
print("\n" + "=" * 70)
print("  📉 LEARNING CURVES (Overfit / Underfit Detector)")
print("=" * 70)

fig, ax = plt.subplots(figsize=(10, 6))

lc_result = learning_curve(
    best_model, X_scaled, y, cv=cv,
    train_sizes=np.linspace(0.1, 1.0, 10),
    scoring="accuracy",
    n_jobs=-1,
    shuffle=True,
    random_state=42,
    return_times=False,
)
train_sizes = lc_result[0]
train_scores = lc_result[1]
val_scores = lc_result[2]

train_mean = train_scores.mean(axis=1)
train_std = train_scores.std(axis=1)
val_mean = val_scores.mean(axis=1)
val_std = val_scores.std(axis=1)

ax.fill_between(train_sizes, train_mean - train_std, train_mean + train_std,
                alpha=0.15, color="#2196F3")
ax.fill_between(train_sizes, val_mean - val_std, val_mean + val_std,
                alpha=0.15, color="#FF5722")
ax.plot(train_sizes, train_mean, "o-", color="#2196F3", linewidth=2,
        markersize=6, label="Training Accuracy")
ax.plot(train_sizes, val_mean, "s-", color="#FF5722", linewidth=2,
        markersize=6, label="Validation Accuracy")

ax.set_xlabel("Training Set Size", fontsize=13)
ax.set_ylabel("Accuracy", fontsize=13)
ax.set_title(f"Learning Curve — {best_name}\n"
             "(Lines converging = Good Fit | Large gap = Overfit | Both low = Underfit)",
             fontsize=13, fontweight="bold")
ax.legend(loc="lower right", fontsize=12)
ax.set_ylim(0.5, 1.05)
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig("learning_curve.png", dpi=150, bbox_inches="tight")
plt.show()
print("  💾 Saved: learning_curve.png")

# Interpret the learning curve
final_gap = train_mean[-1] - val_mean[-1]
print(f"\n  Final Training Accuracy   : {train_mean[-1]:.4f}")
print(f"  Final Validation Accuracy : {val_mean[-1]:.4f}")
print(f"  Gap                       : {final_gap:.4f}")
if final_gap < 0.03:
    print("  🟢 EXCELLENT: No overfitting detected. Model generalizes well!")
elif final_gap < 0.08:
    print("  🟡 ACCEPTABLE: Minor gap. Model is slightly overfitting but usable.")
else:
    print("  🔴 WARNING: Large gap suggests overfitting. Consider more regularization.")


# ============================================================================
# CELL 13: TRAIN vs TEST ACCURACY COMPARISON (All Models)
# ============================================================================
fig, ax = plt.subplots(figsize=(12, 6))

model_names_cv = list(cv_results.keys())
train_accs = [cv_results[n]["train_acc"] for n in model_names_cv]
test_accs = [cv_results[n]["test_acc"] for n in model_names_cv]
cv_means = [cv_results[n]["cv_mean"] for n in model_names_cv]

x = np.arange(len(model_names_cv))
width = 0.25

bars1 = ax.bar(x - width, train_accs, width, label="Train Accuracy",
               color="#2196F3", edgecolor="white", linewidth=1)
bars2 = ax.bar(x, test_accs, width, label="Test Accuracy",
               color="#FF5722", edgecolor="white", linewidth=1)
bars3 = ax.bar(x + width, cv_means, width, label="CV Mean Accuracy",
               color="#4CAF50", edgecolor="white", linewidth=1)

ax.set_ylabel("Accuracy", fontsize=12)
ax.set_title("Train vs Test vs CV Accuracy (Overfit Detector)",
             fontsize=14, fontweight="bold")
ax.set_xticks(x)
ax.set_xticklabels(model_names_cv, rotation=25, ha="right", fontsize=10)
ax.legend(fontsize=11)
ax.set_ylim(0.5, 1.12)
ax.axhline(y=1.0, color="gray", linestyle="--", alpha=0.3)

# Annotate
for bars in [bars1, bars2, bars3]:
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                f"{height:.2f}", ha="center", va="bottom", fontsize=8)

plt.tight_layout()
plt.savefig("model_comparison.png", dpi=150, bbox_inches="tight")
plt.show()
print("  💾 Saved: model_comparison.png")


# ============================================================================
# CELL 14: FEATURE IMPORTANCE
# ============================================================================
print("\n" + "=" * 70)
print("  📊 FEATURE IMPORTANCE")
print("=" * 70)

fig, ax = plt.subplots(figsize=(10, 7))

if hasattr(best_model, "feature_importances_"):
    importances = best_model.feature_importances_
    method = "Built-in Feature Importance"
elif hasattr(best_model, "coef_"):
    importances = np.abs(best_model.coef_[0])
    method = "Absolute Coefficients"
else:
    from sklearn.inspection import permutation_importance
    perm = permutation_importance(best_model, X_test, y_test,
                                   n_repeats=20, random_state=42)
    importances = perm.importances_mean
    method = "Permutation Importance"

sorted_idx = np.argsort(importances)
colors = plt.cm.RdYlGn(np.linspace(0.2, 0.9, len(sorted_idx)))

ax.barh([feature_names[i] for i in sorted_idx], importances[sorted_idx],
        color=colors, edgecolor="white", linewidth=0.8, height=0.7)
ax.set_xlabel("Importance", fontsize=12)
ax.set_title(f"Feature Importance ({method})\n{best_name}",
             fontsize=14, fontweight="bold")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig("feature_importance.png", dpi=150, bbox_inches="tight")
plt.show()
print(f"  💾 Saved: feature_importance.png")


# ============================================================================
# CELL 15: SAVE MODEL & SCALER
# ============================================================================
print("\n" + "=" * 70)
print("  💾 SAVING MODEL & SCALER")
print("=" * 70)

MODEL_PATH = "heart_model.pkl"
SCALER_PATH = "scaler.pkl"

joblib.dump(best_model, MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)

print(f"  ✅ Model  saved → {MODEL_PATH}")
print(f"  ✅ Scaler saved → {SCALER_PATH}")

# ------- Download from Colab -------
# from google.colab import files
# files.download("heart_model.pkl")
# files.download("scaler.pkl")


# ============================================================================
# CELL 16: PREDICTION FUNCTION
# ============================================================================
def predict_heart_disease(age, sex, cp, trestbps, chol, fbs, restecg,
                          thalach, exang, oldpeak, slope, ca, thal):
    """
    Predict heart disease from 13 clinical features.

    Returns dict with prediction, probability, and label.
    """
    loaded_model = joblib.load(MODEL_PATH)
    loaded_scaler = joblib.load(SCALER_PATH)

    input_data = np.array(
        [[age, sex, cp, trestbps, chol, fbs, restecg,
          thalach, exang, oldpeak, slope, ca, thal]]
    )
    input_scaled = loaded_scaler.transform(input_data)

    prediction = loaded_model.predict(input_scaled)[0]
    probability = loaded_model.predict_proba(input_scaled)[0]

    label = int(prediction)
    prob_pct = probability[label] * 100

    return {
        "prediction": "Heart Disease ❤️" if label == 1 else "No Heart Disease ✅",
        "probability": round(prob_pct, 2),
        "label": label,
    }


# ============================================================================
# CELL 17: TEST PREDICTION
# ============================================================================
print("\n" + "=" * 70)
print("  🧪 SAMPLE PREDICTION TEST")
print("=" * 70)

sample = df.iloc[0]
result = predict_heart_disease(
    age=sample["age"], sex=int(sample["sex"]), cp=int(sample["cp"]),
    trestbps=sample["trestbps"], chol=sample["chol"], fbs=int(sample["fbs"]),
    restecg=int(sample["restecg"]), thalach=sample["thalach"],
    exang=int(sample["exang"]), oldpeak=sample["oldpeak"],
    slope=int(sample["slope"]), ca=int(sample["ca"]), thal=int(sample["thal"]),
)

print(f"\n  Input    : Row 0 (age={sample['age']}, sex={int(sample['sex'])}, ...)")
print(f"  Result   : {result['prediction']} ({result['probability']}% confidence)")
actual = "Heart Disease" if sample["target"] == 1 else "No Heart Disease"
print(f"  Actual   : {actual}")
match = "✅ CORRECT" if (result["label"] == sample["target"]) else "❌ INCORRECT"
print(f"  Match    : {match}")


# ============================================================================
# CELL 18: FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 70)
print("  📋 FINAL PIPELINE SUMMARY")
print("=" * 70)
print(f"""
  Dataset          : {df.shape[0]} samples, {df.shape[1] - 1} features
  Best Model       : {best_name}
  Test Accuracy    : {best_candidate['test_acc']:.4f}
  F1 Score         : {best_candidate['f1']:.4f}
  AUC-ROC          : {best_candidate['auc']:.4f}
  Train-Test Gap   : {best_candidate['gap']:.4f}

  Anti-Overfit Techniques Applied:
    ✅ 5-Fold Stratified Cross Validation
    ✅ GridSearchCV Hyperparameter Tuning
    ✅ Regularization (L2, max_depth, etc.)
    ✅ Learning Curve Analysis
    ✅ Train vs Test Gap Monitoring
    ✅ Duplicate Row Removal
    ✅ Feature Scaling (StandardScaler)

  Saved Files:
    📁 heart_model.pkl       (trained model)
    📁 scaler.pkl            (fitted scaler)
    📁 confusion_matrix.png  (evaluation plot)
    📁 learning_curve.png    (overfit diagnostic)
    📁 model_comparison.png  (all models compared)
    📁 feature_importance.png
""")
print("=" * 70)
print("  ✅ PIPELINE COMPLETE — Model is ready for deployment!")
print("=" * 70)


# ============================================================================
# CELL 19: 🩺 INTERACTIVE PREDICTION — Enter Your Own Patient Data
# ============================================================================
# ⬇️ COPY THIS ENTIRE CELL INTO A NEW COLAB CELL ⬇️
# Run it, type in values, and get instant predictions!

def interactive_predict():
    """
    Interactive prediction: asks you for each feature value and predicts.
    Just run this cell and follow the prompts!
    """
    print("\n" + "=" * 70)
    print("  🩺 INTERACTIVE HEART DISEASE PREDICTION")
    print("=" * 70)
    print("  Enter patient data below (press Enter for default values):\n")

    defaults = {
        "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 250,
        "fbs": 0, "restecg": 1, "thalach": 150, "exang": 0,
        "oldpeak": 1.0, "slope": 2, "ca": 0, "thal": 2,
    }

    prompts = {
        "age":      "  Age (years)                          ",
        "sex":      "  Sex (1=Male, 0=Female)               ",
        "cp":       "  Chest Pain Type (0-3)                ",
        "trestbps": "  Resting Blood Pressure (mm Hg)       ",
        "chol":     "  Cholesterol (mg/dl)                  ",
        "fbs":      "  Fasting Blood Sugar >120 (1=Y, 0=N)  ",
        "restecg":  "  Resting ECG (0-2)                    ",
        "thalach":  "  Max Heart Rate                       ",
        "exang":    "  Exercise Angina (1=Yes, 0=No)        ",
        "oldpeak":  "  ST Depression (oldpeak)              ",
        "slope":    "  ST Slope (0-2)                       ",
        "ca":       "  Major Vessels Coloured (0-4)         ",
        "thal":     "  Thalassemia (0-3)                    ",
    }

    values = {}
    for key in defaults:
        try:
            raw = input(f"{prompts[key]} [{defaults[key]}]: ").strip()
            values[key] = float(raw) if raw else defaults[key]
        except ValueError:
            values[key] = defaults[key]
            print(f"    ⚠️  Invalid input, using default: {defaults[key]}")

    # Make prediction
    result = predict_heart_disease(
        age=values["age"], sex=int(values["sex"]), cp=int(values["cp"]),
        trestbps=values["trestbps"], chol=values["chol"],
        fbs=int(values["fbs"]), restecg=int(values["restecg"]),
        thalach=values["thalach"], exang=int(values["exang"]),
        oldpeak=values["oldpeak"], slope=int(values["slope"]),
        ca=int(values["ca"]), thal=int(values["thal"]),
    )

    print("\n" + "─" * 50)
    print(f"  🔮 PREDICTION: {result['prediction']}")
    print(f"  📊 CONFIDENCE: {result['probability']}%")
    print("─" * 50)

    # Show risk breakdown
    loaded_model = joblib.load(MODEL_PATH)
    loaded_scaler = joblib.load(SCALER_PATH)
    inp = np.array([[values[k] for k in defaults]])
    inp_scaled = loaded_scaler.transform(inp)
    proba = loaded_model.predict_proba(inp_scaled)[0]

    print(f"\n  Risk Breakdown:")
    print(f"    No Disease  : {proba[0]*100:.1f}%  {'█' * int(proba[0]*30)}")
    print(f"    Heart Disease: {proba[1]*100:.1f}%  {'█' * int(proba[1]*30)}")

    if result["label"] == 1:
        print("\n  ⚠️  The model suggests this patient may have heart disease.")
        print("  ➡️  Please consult a medical professional for proper diagnosis.")
    else:
        print("\n  ✅ The model suggests this patient is likely healthy.")
        print("  ➡️  Regular check-ups are still recommended.")

    return result


# Uncomment the line below to run interactively:
# interactive_predict()


# ============================================================================
# CELL 20: 🚀 QUICK PREDICT — Just Change the Values Below and Run!
# ============================================================================
# ⬇️ COPY THIS CELL, CHANGE THE VALUES, AND RUN IT! ⬇️
# This is the easiest way — just edit the numbers directly.

print("\n" + "=" * 70)
print("  🚀 QUICK PREDICT — Change values below & re-run this cell")
print("=" * 70)

# ╔══════════════════════════════════════════════════════════════╗
# ║  ✏️  CHANGE THESE VALUES TO YOUR PATIENT'S DATA:            ║
# ╚══════════════════════════════════════════════════════════════╝

my_patient = {
    "age":      55,     # Age in years
    "sex":      1,      # 1 = Male, 0 = Female
    "cp":       2,      # Chest pain type (0-3)
    "trestbps": 130,    # Resting blood pressure (mm Hg)
    "chol":     250,    # Serum cholesterol (mg/dl)
    "fbs":      0,      # Fasting blood sugar > 120 mg/dl (1=True, 0=False)
    "restecg":  1,      # Resting ECG results (0-2)
    "thalach":  160,    # Max heart rate achieved
    "exang":    0,      # Exercise induced angina (1=Yes, 0=No)
    "oldpeak":  1.5,    # ST depression induced by exercise
    "slope":    2,      # Slope of peak exercise ST segment (0-2)
    "ca":       0,      # Major vessels coloured by fluoroscopy (0-4)
    "thal":     2,      # Thalassemia (0=normal, 1=fixed, 2=reversible, 3=?)
}

# ╔══════════════════════════════════════════════════════════════╗
# ║  🔽  DON'T CHANGE ANYTHING BELOW THIS LINE                  ║
# ╚══════════════════════════════════════════════════════════════╝

result = predict_heart_disease(**my_patient)

print(f"\n  📋 Patient Data:")
for key, val in my_patient.items():
    print(f"     {key:>10s} = {val}")

print(f"\n  {'━' * 50}")
print(f"  🔮 PREDICTION : {result['prediction']}")
print(f"  📊 CONFIDENCE : {result['probability']}%")
print(f"  {'━' * 50}")

# Show probability bars
loaded_model = joblib.load(MODEL_PATH)
loaded_scaler = joblib.load(SCALER_PATH)
inp = np.array([[my_patient[k] for k in my_patient]])
inp_scaled = loaded_scaler.transform(inp)
proba = loaded_model.predict_proba(inp_scaled)[0]

print(f"\n  📊 Risk Breakdown:")
print(f"     Healthy      : {proba[0]*100:5.1f}% |{'█' * int(proba[0]*40)}{'░' * (40 - int(proba[0]*40))}|")
print(f"     Heart Disease : {proba[1]*100:5.1f}% |{'█' * int(proba[1]*40)}{'░' * (40 - int(proba[1]*40))}|")

if result["label"] == 1:
    print("\n  ⚠️  WARNING: Model predicts HEART DISEASE risk.")
    print("  ➡️  Seek professional medical evaluation.")
else:
    print("\n  ✅ Model predicts LOW risk of heart disease.")
    print("  ➡️  Continue healthy lifestyle & regular check-ups.")


# ============================================================================
# CELL 21: 📸 SETUP — Install Gemini Vision for Image-Based Prediction
# ============================================================================
# !pip install -q google-generativeai Pillow

try:
    import google.generativeai as genai  # type: ignore
    from PIL import Image
    from IPython.display import display as ipy_display  # type: ignore
    import json
    import re
    import io

    # ── Configure Gemini API Key ──
    # Option A: Paste your API key directly (get free key: https://aistudio.google.com/apikey)
    # GEMINI_API_KEY = "YOUR_API_KEY_HERE"

    # Option B (Recommended for Colab): Use Colab Secrets
    # 1. Click the 🔑 icon in the left sidebar → Add a secret named "GEMINI_API_KEY"
    # 2. Paste your API key as the value
    # 3. Toggle "Notebook access" ON
    from google.colab import userdata  # type: ignore
    GEMINI_API_KEY = userdata.get("GEMINI_API_KEY")

    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-2.0-flash")

    print("✅ Gemini Vision API configured successfully!")
    print("   Model: gemini-2.0-flash")
    print("   Ready to process patient record images.")
    _GEMINI_AVAILABLE = True

except ImportError as e:
    print(f"⚠️  Gemini Vision not available (missing: {e.name}).")
    print("   This feature requires Google Colab. Install with:")
    print("   !pip install google-generativeai Pillow")
    _GEMINI_AVAILABLE = False


# ============================================================================
# CELL 22: 📤 UPLOAD IMAGE & EXTRACT PATIENT FEATURES
# ============================================================================
if _GEMINI_AVAILABLE:
    from google.colab import files as colab_files  # type: ignore

    print("=" * 70)
    print("  📸 UPLOAD PATIENT RECORD IMAGE")
    print("=" * 70)
    print("  Supported: Photos of lab reports, printed forms, handwritten records,")
    print("  screenshots of EHRs, or any image containing patient clinical data.\n")

    # ── Upload the image ──
    uploaded = colab_files.upload()
    image_filename = list(uploaded.keys())[0]
    patient_image = Image.open(io.BytesIO(uploaded[image_filename]))

    print(f"\n  ✅ Uploaded: {image_filename}")
    print(f"     Size: {patient_image.size[0]}×{patient_image.size[1]} pixels")

    # Display the uploaded image
    print("\n  📷 Patient Record Image:")
    ipy_display(patient_image)

    # ── Gemini Vision Extraction Prompt ──
    EXTRACTION_PROMPT = (
        "You are a medical data extraction assistant. Analyze this patient record image\n"
        "and extract EXACTLY these 13 clinical features. Return ONLY a valid JSON object.\n\n"
        "Required features (use these exact keys):\n"
        "{\n"
        '  "age":      <integer, patient age in years, range 20-100>,\n'
        '  "sex":      <integer, 0=Female, 1=Male>,\n'
        '  "cp":       <integer, chest pain type: 0=Typical Angina, 1=Atypical Angina, 2=Non-Anginal Pain, 3=Asymptomatic>,\n'
        '  "trestbps": <integer, resting blood pressure in mmHg, range 80-220>,\n'
        '  "chol":     <integer, serum cholesterol in mg/dL, range 100-600>,\n'
        '  "fbs":      <integer, fasting blood sugar >120 mg/dL: 0=No, 1=Yes>,\n'
        '  "restecg":  <integer, resting ECG: 0=Normal, 1=ST-T Wave Abnormality, 2=Left Ventricular Hypertrophy>,\n'
        '  "thalach":  <integer, maximum heart rate achieved in bpm, range 60-220>,\n'
        '  "exang":    <integer, exercise induced angina: 0=No, 1=Yes>,\n'
        '  "oldpeak":  <float, ST depression induced by exercise, range 0.0-7.0>,\n'
        '  "slope":    <integer, ST segment slope: 0=Upsloping, 1=Flat, 2=Downsloping>,\n'
        '  "ca":       <integer, number of major vessels colored by fluoroscopy, range 0-4>,\n'
        '  "thal":     <integer, thalassemia: 0=Normal, 1=Fixed Defect, 2=Reversible Defect, 3=Unknown>\n'
        "}\n\n"
        "Rules:\n"
        '- Extract values from the image text, tables, or handwritten data.\n'
        '- If a value uses medical labels (e.g., "Male", "Normal"), convert it to the numeric code.\n'
        "- If a feature is NOT visible or unreadable, use -999 as the value.\n"
        "- Return ONLY the JSON object, no explanation, no markdown fences."
    )

    # ── Send image to Gemini ──
    print("\n  🤖 Sending image to Gemini Vision for analysis...")
    response = gemini_model.generate_content([EXTRACTION_PROMPT, patient_image])
    raw_response = response.text.strip()

    # ── Parse JSON response ──
    # Clean up response (remove markdown fences if present)
    json_text = raw_response
    if "```" in json_text:
        json_text = re.sub(r"```(?:json)?\s*", "", json_text)
        json_text = json_text.strip()

    try:
        extracted_data = json.loads(json_text)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        match = re.search(r"\{[^{}]+\}", raw_response, re.DOTALL)
        if match:
            extracted_data = json.loads(match.group())
        else:
            print("  ❌ ERROR: Could not parse Gemini's response as JSON.")
            print(f"  Raw response:\n{raw_response}")
            extracted_data = None

    # ── Validate and display extracted values ──
    EXPECTED_KEYS = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
                     "thalach", "exang", "oldpeak", "slope", "ca", "thal"]

    VALID_RANGES = {
        "age": (20, 100), "sex": (0, 1), "cp": (0, 3), "trestbps": (80, 220),
        "chol": (100, 600), "fbs": (0, 1), "restecg": (0, 2), "thalach": (60, 220),
        "exang": (0, 1), "oldpeak": (0.0, 7.0), "slope": (0, 2), "ca": (0, 4),
        "thal": (0, 3),
    }

    DEFAULTS = {
        "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 250,
        "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
        "oldpeak": 1.0, "slope": 1, "ca": 0, "thal": 2,
    }

    if extracted_data is not None:
        print("\n" + "=" * 70)
        print("  📋 EXTRACTED PATIENT DATA (from image)")
        print("=" * 70)

        image_patient = {}
        warnings_list = []

        for key in EXPECTED_KEYS:
            value = extracted_data.get(key, -999)
            friendly = COLUMN_RENAME_MAP.get(key, key)
            lo, hi = VALID_RANGES[key]

            if value == -999 or value is None:
                # Not found in image — use default
                image_patient[key] = DEFAULTS[key]
                status = f"⚠️  NOT FOUND → using default: {DEFAULTS[key]}"
                warnings_list.append(f"{friendly}: not found in image")
            elif not (lo <= float(value) <= hi):
                # Out of range — flag but keep value
                image_patient[key] = value
                status = f"🟡 OUT OF RANGE (expected {lo}–{hi})"
                warnings_list.append(f"{friendly}: value {value} outside range {lo}–{hi}")
            else:
                image_patient[key] = value
                status = "✅"

            # Format the value display
            if key == "oldpeak":
                val_str = f"{float(image_patient[key]):.1f}"
            else:
                val_str = str(int(image_patient[key]))

            print(f"    {friendly:<35s} = {val_str:>6s}  {status}")

        if warnings_list:
            print(f"\n  ⚠️  {len(warnings_list)} warning(s):")
            for w in warnings_list:
                print(f"     • {w}")
            print("\n  💡 You can manually correct values in the 'image_patient' dict below")
            print("     before running the prediction cell.")
        else:
            print("\n  ✅ All 13 features successfully extracted!")

        print(f"\n  {'─' * 60}")
        print(f"  📝 Extracted dict (edit if needed, then run next cell):")
        print(f"  {'─' * 60}")
        print(f"  image_patient = {json.dumps(image_patient, indent=4)}")

    else:
        # Fallback: use defaults
        image_patient = DEFAULTS.copy()
        print("\n  ❌ Extraction failed. Using default values.")
        print("  💡 Please manually edit 'image_patient' dict and re-run.")


    # ========================================================================
    # CELL 23: 🔮 PREDICT FROM EXTRACTED IMAGE DATA
    # ========================================================================
    print("\n" + "=" * 70)
    print("  🔮 PREDICTION FROM PATIENT RECORD IMAGE")
    print("=" * 70)

    # ── Run prediction ──
    image_result = predict_heart_disease(**image_patient)

    # ── Display input summary ──
    print(f"\n  📋 Patient Features Used:")
    print(f"  {'─' * 55}")
    for key, val in image_patient.items():
        friendly = COLUMN_RENAME_MAP.get(key, key)
        # Decode categorical values for display
        cat_label = ""
        if friendly in CATEGORICAL_LABELS:
            cat_label = f"  ({CATEGORICAL_LABELS[friendly].get(int(val), '?')})"
        if key == "oldpeak":
            print(f"    {friendly:<35s} = {float(val):>6.1f}{cat_label}")
        else:
            print(f"    {friendly:<35s} = {int(val):>6d}{cat_label}")

    # ── Display prediction result ──
    print(f"\n  {'━' * 55}")
    if image_result["label"] == 1:
        print(f"  🔮 PREDICTION : ❤️  {image_result['prediction']}")
    else:
        print(f"  🔮 PREDICTION : ✅ {image_result['prediction']}")
    print(f"  📊 CONFIDENCE : {image_result['probability']}%")
    print(f"  {'━' * 55}")

    # ── Risk breakdown with visual bars ──
    loaded_model_img = joblib.load(MODEL_PATH)
    loaded_scaler_img = joblib.load(SCALER_PATH)
    inp_img = np.array([[image_patient[k] for k in EXPECTED_KEYS]])
    inp_img_scaled = loaded_scaler_img.transform(inp_img)
    proba_img = loaded_model_img.predict_proba(inp_img_scaled)[0]

    print(f"\n  📊 Risk Breakdown:")
    print(f"     Healthy       : {proba_img[0]*100:5.1f}% |{'█' * int(proba_img[0]*40)}{'░' * (40 - int(proba_img[0]*40))}|")
    print(f"     Heart Disease  : {proba_img[1]*100:5.1f}% |{'█' * int(proba_img[1]*40)}{'░' * (40 - int(proba_img[1]*40))}|")

    # ── Clinical advisory ──
    if image_result["label"] == 1:
        print("\n  ⚠️  WARNING: The model predicts HEART DISEASE risk for this patient.")
        print("  ➡️  This is a screening tool only — NOT a clinical diagnosis.")
        print("  ➡️  Please refer the patient for professional medical evaluation.")
    else:
        print("\n  ✅ The model predicts LOW risk of heart disease for this patient.")
        print("  ➡️  Regular check-ups and a healthy lifestyle are still recommended.")

    print(f"\n  📸 Source: {image_filename}")
    print("=" * 70)
    print("  ✅ IMAGE-BASED PREDICTION COMPLETE")
    print("=" * 70)

else:
    print("\n⚠️  Skipping image-based prediction (Gemini Vision not available).")
    print("   Run this notebook in Google Colab with the required packages installed.")

