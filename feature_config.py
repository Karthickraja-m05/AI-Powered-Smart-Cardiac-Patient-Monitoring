# -*- coding: utf-8 -*-
"""
Heart Disease Feature Configuration
=====================================
Centralized mappings for column renaming, medical descriptions,
categorical label decoding, and Gradio dashboard form labels.

Usage:
    from feature_config import (
        COLUMN_RENAME_MAP,
        FEATURE_DESCRIPTIONS,
        CATEGORICAL_LABELS,
        GRADIO_FORM_LABELS,
        rename_columns,
        decode_categoricals,
    )
"""

# ============================================================================
# 1. COLUMN RENAME MAP — raw CSV name → friendly medical name
# ============================================================================
COLUMN_RENAME_MAP = {
    "age":      "Age (Years)",
    "sex":      "Gender",
    "cp":       "Chest Pain Type",
    "trestbps": "Resting Blood Pressure (mmHg)",
    "chol":     "Cholesterol Level (mg/dL)",
    "fbs":      "Fasting Blood Sugar",
    "restecg":  "ECG Result",
    "thalach":  "Maximum Heart Rate",
    "exang":    "Exercise Induced Angina",
    "oldpeak":  "ST Depression",
    "slope":    "ST Segment Slope",
    "ca":       "Number of Major Vessels",
    "thal":     "Thalassemia Status",
    "target":   "Heart Disease Risk",
}

# Reverse map: friendly name → raw name (for model input)
COLUMN_REVERSE_MAP = {v: k for k, v in COLUMN_RENAME_MAP.items()}


# ============================================================================
# 2. FEATURE DESCRIPTIONS — medical explanation of each feature
# ============================================================================
FEATURE_DESCRIPTIONS = {
    "Age (Years)": {
        "type":        "Continuous",
        "unit":        "Years",
        "range":       "29 – 77",
        "description": "Patient's age in years. Older age is a significant risk "
                       "factor for heart disease, especially above 45 for men "
                       "and 55 for women.",
        "clinical":    "Age-related arterial stiffening and plaque buildup "
                       "increase cardiovascular risk over time.",
    },
    "Gender": {
        "type":        "Binary Categorical",
        "unit":        None,
        "range":       "0 or 1",
        "description": "Biological sex of the patient. Males have a statistically "
                       "higher risk of heart disease at younger ages.",
        "clinical":    "Estrogen provides some cardioprotective effects in "
                       "pre-menopausal women; risk equalizes post-menopause.",
    },
    "Chest Pain Type": {
        "type":        "Ordinal Categorical",
        "unit":        None,
        "range":       "0 – 3",
        "description": "Type of chest pain experienced. Typical angina is the "
                       "classic squeezing/pressure pain during exertion. "
                       "Asymptomatic means no chest pain despite possible disease.",
        "clinical":    "Asymptomatic presentation (Type 3) is paradoxically more "
                       "associated with heart disease in this dataset, as patients "
                       "may have silent ischemia.",
    },
    "Resting Blood Pressure (mmHg)": {
        "type":        "Continuous",
        "unit":        "mmHg (millimeters of mercury)",
        "range":       "94 – 200",
        "description": "Blood pressure measured at rest upon hospital admission. "
                       "Normal is below 120 mmHg; hypertension starts at 140 mmHg.",
        "clinical":    "Chronic hypertension damages arterial walls and forces "
                       "the heart to work harder, leading to left ventricular "
                       "hypertrophy and increased heart disease risk.",
    },
    "Cholesterol Level (mg/dL)": {
        "type":        "Continuous",
        "unit":        "mg/dL (milligrams per deciliter)",
        "range":       "126 – 564",
        "description": "Total serum cholesterol. Desirable is below 200 mg/dL; "
                       "high is 240+ mg/dL.",
        "clinical":    "Elevated LDL cholesterol promotes atherosclerotic plaque "
                       "formation in coronary arteries. However, total cholesterol "
                       "alone is not the best predictor—HDL/LDL ratio matters more.",
    },
    "Fasting Blood Sugar": {
        "type":        "Binary Categorical",
        "unit":        "mg/dL threshold (>120)",
        "range":       "0 or 1",
        "description": "Whether fasting blood sugar exceeds 120 mg/dL, which "
                       "may indicate diabetes or pre-diabetes.",
        "clinical":    "Diabetes significantly increases cardiovascular risk "
                       "through vascular inflammation, endothelial dysfunction, "
                       "and accelerated atherosclerosis.",
    },
    "ECG Result": {
        "type":        "Ordinal Categorical",
        "unit":        None,
        "range":       "0 – 2",
        "description": "Resting electrocardiogram findings. Detects electrical "
                       "abnormalities in the heart's rhythm and structure.",
        "clinical":    "Left ventricular hypertrophy on ECG suggests chronic "
                       "pressure overload and is a strong predictor of "
                       "cardiovascular events.",
    },
    "Maximum Heart Rate": {
        "type":        "Continuous",
        "unit":        "bpm (beats per minute)",
        "range":       "71 – 202",
        "description": "Highest heart rate achieved during a stress test. "
                       "Expected maximum ≈ 220 minus age.",
        "clinical":    "Failure to reach target heart rate (chronotropic "
                       "incompetence) during stress testing is a strong "
                       "predictor of cardiac disease and mortality.",
    },
    "Exercise Induced Angina": {
        "type":        "Binary Categorical",
        "unit":        None,
        "range":       "0 or 1",
        "description": "Whether the patient experiences chest pain during "
                       "physical exercise or stress testing.",
        "clinical":    "Exercise-induced angina indicates that the coronary "
                       "arteries cannot supply adequate blood flow during "
                       "increased demand — a hallmark of obstructive CAD.",
    },
    "ST Depression": {
        "type":        "Continuous",
        "unit":        "mm (millimeters)",
        "range":       "0.0 – 6.2",
        "description": "ST segment depression on ECG induced by exercise "
                       "relative to rest. Values above 1.0 mm are significant.",
        "clinical":    "ST depression during exercise reflects subendocardial "
                       "ischemia. Greater depression indicates more severe "
                       "coronary artery disease.",
    },
    "ST Segment Slope": {
        "type":        "Ordinal Categorical",
        "unit":        None,
        "range":       "0 – 2",
        "description": "The slope of the peak exercise ST segment on ECG. "
                       "Downsloping is most concerning for ischemia.",
        "clinical":    "Downsloping ST segment during exercise is the most "
                       "specific indicator of significant coronary artery "
                       "disease among the three slope types.",
    },
    "Number of Major Vessels": {
        "type":        "Discrete (0–4)",
        "unit":        "Count",
        "range":       "0 – 4",
        "description": "Number of major coronary arteries (0–4) visualized "
                       "via fluoroscopy with contrast dye.",
        "clinical":    "More vessels visible indicates better coronary "
                       "perfusion. Fewer colored vessels may suggest "
                       "obstructed arteries not taking up contrast.",
    },
    "Thalassemia Status": {
        "type":        "Categorical",
        "unit":        None,
        "range":       "0 – 3",
        "description": "Results of thallium stress test showing blood flow "
                       "patterns in the heart muscle.",
        "clinical":    "A reversible defect indicates an area that is ischemic "
                       "during stress but recovers at rest — suggesting viable "
                       "but at-risk myocardium. Fixed defects indicate scarring.",
    },
    "Heart Disease Risk": {
        "type":        "Binary Target",
        "unit":        None,
        "range":       "0 or 1",
        "description": "Diagnosis of heart disease. This is the prediction "
                       "target for the machine learning model.",
        "clinical":    "Based on angiographic narrowing >50% diameter in any "
                       "major coronary vessel (original UCI dataset definition).",
    },
}


# ============================================================================
# 3. CATEGORICAL LABELS — numeric code → medical description
# ============================================================================
CATEGORICAL_LABELS = {
    "Gender": {
        0: "Female",
        1: "Male",
    },
    "Chest Pain Type": {
        0: "Typical Angina",
        1: "Atypical Angina",
        2: "Non-Anginal Pain",
        3: "Asymptomatic",
    },
    "Fasting Blood Sugar": {
        0: "Normal (≤ 120 mg/dL)",
        1: "Elevated (> 120 mg/dL)",
    },
    "ECG Result": {
        0: "Normal",
        1: "ST-T Wave Abnormality",
        2: "Left Ventricular Hypertrophy",
    },
    "Exercise Induced Angina": {
        0: "No",
        1: "Yes",
    },
    "ST Segment Slope": {
        0: "Upsloping",
        1: "Flat",
        2: "Downsloping",
    },
    "Number of Major Vessels": {
        0: "0 Vessels",
        1: "1 Vessel",
        2: "2 Vessels",
        3: "3 Vessels",
        4: "4 Vessels",
    },
    "Thalassemia Status": {
        0: "Normal",
        1: "Fixed Defect",
        2: "Reversible Defect",
        3: "Unknown / Other",
    },
    "Heart Disease Risk": {
        0: "No Heart Disease",
        1: "Heart Disease Detected",
    },
}


# ============================================================================
# 4. GRADIO FORM LABELS — dashboard-ready input components
# ============================================================================
GRADIO_FORM_LABELS = {
    "Age (Years)": {
        "component":   "Slider",
        "label":       "🎂 Patient Age",
        "info":        "Age of the patient in years",
        "minimum":     20,
        "maximum":     100,
        "step":        1,
        "default":     55,
    },
    "Gender": {
        "component":   "Radio",
        "label":       "👤 Gender",
        "info":        "Biological sex of the patient",
        "choices":     ["Female", "Male"],
        "default":     "Male",
    },
    "Chest Pain Type": {
        "component":   "Dropdown",
        "label":       "💔 Chest Pain Type",
        "info":        "Type of chest pain experienced by the patient",
        "choices":     [
            "Typical Angina",
            "Atypical Angina",
            "Non-Anginal Pain",
            "Asymptomatic",
        ],
        "default":     "Non-Anginal Pain",
    },
    "Resting Blood Pressure (mmHg)": {
        "component":   "Slider",
        "label":       "🩺 Resting Blood Pressure",
        "info":        "Blood pressure at rest (mmHg). Normal < 120",
        "minimum":     80,
        "maximum":     220,
        "step":        1,
        "default":     130,
    },
    "Cholesterol Level (mg/dL)": {
        "component":   "Slider",
        "label":       "🧪 Serum Cholesterol",
        "info":        "Total cholesterol level (mg/dL). Desirable < 200",
        "minimum":     100,
        "maximum":     600,
        "step":        1,
        "default":     250,
    },
    "Fasting Blood Sugar": {
        "component":   "Radio",
        "label":       "🍬 Fasting Blood Sugar > 120 mg/dL",
        "info":        "Is fasting blood sugar above 120 mg/dL?",
        "choices":     ["Normal (≤ 120 mg/dL)", "Elevated (> 120 mg/dL)"],
        "default":     "Normal (≤ 120 mg/dL)",
    },
    "ECG Result": {
        "component":   "Dropdown",
        "label":       "📈 Resting ECG Result",
        "info":        "Electrocardiogram findings at rest",
        "choices":     [
            "Normal",
            "ST-T Wave Abnormality",
            "Left Ventricular Hypertrophy",
        ],
        "default":     "Normal",
    },
    "Maximum Heart Rate": {
        "component":   "Slider",
        "label":       "❤️ Maximum Heart Rate Achieved",
        "info":        "Highest heart rate during stress test (bpm)",
        "minimum":     60,
        "maximum":     220,
        "step":        1,
        "default":     150,
    },
    "Exercise Induced Angina": {
        "component":   "Radio",
        "label":       "🏃 Exercise Induced Angina",
        "info":        "Chest pain during exercise?",
        "choices":     ["No", "Yes"],
        "default":     "No",
    },
    "ST Depression": {
        "component":   "Slider",
        "label":       "📉 ST Depression (Oldpeak)",
        "info":        "ST depression induced by exercise relative to rest (mm)",
        "minimum":     0.0,
        "maximum":     7.0,
        "step":        0.1,
        "default":     1.0,
    },
    "ST Segment Slope": {
        "component":   "Dropdown",
        "label":       "📊 Peak Exercise ST Slope",
        "info":        "Slope of the peak exercise ST segment",
        "choices":     ["Upsloping", "Flat", "Downsloping"],
        "default":     "Flat",
    },
    "Number of Major Vessels": {
        "component":   "Slider",
        "label":       "🫀 Major Vessels Colored (Fluoroscopy)",
        "info":        "Number of major vessels colored by fluoroscopy (0-4)",
        "minimum":     0,
        "maximum":     4,
        "step":        1,
        "default":     0,
    },
    "Thalassemia Status": {
        "component":   "Dropdown",
        "label":       "🩸 Thalassemia (Thallium Stress Test)",
        "info":        "Blood flow pattern observed during thallium stress test",
        "choices":     [
            "Normal",
            "Fixed Defect",
            "Reversible Defect",
            "Unknown / Other",
        ],
        "default":     "Reversible Defect",
    },
}


# ============================================================================
# 5. HELPER FUNCTIONS
# ============================================================================

def rename_columns(df):
    """Rename DataFrame columns from raw CSV names to friendly medical names."""
    return df.rename(columns=COLUMN_RENAME_MAP)


def reverse_rename(df):
    """Rename DataFrame columns from friendly names back to raw CSV names."""
    return df.rename(columns=COLUMN_REVERSE_MAP)


def decode_categoricals(df):
    """
    Replace numeric categorical codes with human-readable medical labels.
    Works on a DataFrame that has already been renamed with friendly names.
    Returns a copy — does not modify the original.
    """
    df_decoded = df.copy()
    for col, mapping in CATEGORICAL_LABELS.items():
        if col in df_decoded.columns:
            df_decoded[col] = df_decoded[col].map(mapping).fillna(df_decoded[col])
    return df_decoded


def get_feature_summary_table():
    """Return a list of dicts suitable for creating a summary DataFrame."""
    rows = []
    for friendly_name, desc in FEATURE_DESCRIPTIONS.items():
        raw_name = COLUMN_REVERSE_MAP.get(friendly_name, "—")
        rows.append({
            "Raw Column":       raw_name,
            "Friendly Name":    friendly_name,
            "Type":             desc["type"],
            "Unit":             desc.get("unit") or "—",
            "Range":            desc["range"],
            "Description":      desc["description"],
            "Clinical Note":    desc["clinical"],
        })
    return rows


def gradio_label_to_numeric(feature_name, label_text):
    """Convert a Gradio dropdown/radio label back to its numeric code."""
    if feature_name in CATEGORICAL_LABELS:
        for code, text in CATEGORICAL_LABELS[feature_name].items():
            if text == label_text:
                return code
    raise ValueError(f"Unknown label '{label_text}' for feature '{feature_name}'")


# ============================================================================
# 6. QUICK TEST — run this file directly to see all mappings
# ============================================================================
if __name__ == "__main__":
    import pandas as pd

    print("=" * 70)
    print("  HEART DISEASE — FEATURE CONFIGURATION")
    print("=" * 70)

    # Column rename map
    print("\n📋 Column Rename Map:")
    for raw, friendly in COLUMN_RENAME_MAP.items():
        print(f"   {raw:>10s}  →  {friendly}")

    # Categorical labels
    print("\n\n🏷️  Categorical Label Decodings:")
    for feature, mapping in CATEGORICAL_LABELS.items():
        print(f"\n  {feature}:")
        for code, label in mapping.items():
            print(f"    {code} = {label}")

    # Gradio form labels
    print("\n\n🖥️  Gradio Dashboard Form Labels:")
    for feature, config in GRADIO_FORM_LABELS.items():
        print(f"\n  {config['label']}")
        print(f"    Component : {config['component']}")
        print(f"    Info      : {config['info']}")
        if "choices" in config:
            print(f"    Choices   : {config['choices']}")
        if "minimum" in config:
            print(f"    Range     : {config['minimum']} – {config['maximum']}")

    # Feature summary table
    print("\n\n📊 Feature Summary Table:")
    summary_df = pd.DataFrame(get_feature_summary_table())
    print(summary_df[["Raw Column", "Friendly Name", "Type", "Range"]].to_string(index=False))

    print("\n\n✅ Feature configuration loaded successfully!")
