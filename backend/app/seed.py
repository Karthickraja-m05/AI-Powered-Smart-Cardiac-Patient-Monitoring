# -*- coding: utf-8 -*-
"""
Demo Data Seeder
================
Seeds the database with sample users, patients, vitals, and predictions
for hackathon demonstration purposes.
"""

import random
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models.user import User, UserRole
from .models.patient import Patient, PatientStatus, BloodGroup
from .models.vitals import VitalSign, VitalSource
from .models.prediction import Prediction, RiskLevel
from .models.symptom import SymptomRecord
from .models.medication import Medication, MedicationType, MedicationStatus
from .models.alert import Alert, AlertType, AlertSeverity
from .services.auth_service import hash_password


# ── Demo Users ──
DEMO_USERS = [
    {"username": "admin", "email": "admin@cardiosense.ai", "full_name": "Dr. Admin Kumar",
     "role": UserRole.SUPER_ADMIN, "specialization": "Hospital Administration", "department": "Admin"},
    {"username": "dr.sharma", "email": "sharma@cardiosense.ai", "full_name": "Dr. Priya Sharma",
     "role": UserRole.DOCTOR, "specialization": "Cardiology", "department": "Cardiology", "license_number": "MCI-23456"},
    {"username": "dr.patel", "email": "patel@cardiosense.ai", "full_name": "Dr. Rajesh Patel",
     "role": UserRole.DOCTOR, "specialization": "Internal Medicine", "department": "Medicine", "license_number": "MCI-34567"},
    {"username": "nurse.anitha", "email": "anitha@cardiosense.ai", "full_name": "Anitha Rajan",
     "role": UserRole.NURSE, "department": "ICU", "license_number": "NMC-12345"},
    {"username": "nurse.deepa", "email": "deepa@cardiosense.ai", "full_name": "Deepa Murugan",
     "role": UserRole.NURSE, "department": "Cardiology", "license_number": "NMC-23456"},
    {"username": "reception", "email": "reception@cardiosense.ai", "full_name": "Kavitha S",
     "role": UserRole.RECEPTIONIST, "department": "Front Desk"},
]

# ── Demo Patients ──
DEMO_PATIENTS = [
    {"first_name": "Ramesh", "last_name": "Kumar", "age": 62, "gender": "Male",
     "blood_group": BloodGroup.B_POS, "ward": "Cardiology", "room_number": "C-101",
     "bed_number": "1A", "has_hypertension": True, "has_diabetes": True,
     "has_previous_heart_disease": True, "is_smoker": True,
     "admission_reason": "Chest pain, elevated troponin levels",
     "allergies": "Penicillin", "phone": "+91 98765 43210"},
    {"first_name": "Lakshmi", "last_name": "Devi", "age": 55, "gender": "Female",
     "blood_group": BloodGroup.A_POS, "ward": "ICU", "room_number": "ICU-3",
     "bed_number": "3B", "has_hypertension": True, "has_kidney_disease": True,
     "admission_reason": "Acute shortness of breath, SpO2 < 88%",
     "phone": "+91 87654 32109"},
    {"first_name": "Suresh", "last_name": "Babu", "age": 48, "gender": "Male",
     "blood_group": BloodGroup.O_POS, "ward": "Cardiology", "room_number": "C-102",
     "bed_number": "2A", "has_diabetes": True, "alcohol_use": True,
     "admission_reason": "Routine cardiac checkup, family history of CAD",
     "phone": "+91 76543 21098"},
    {"first_name": "Meena", "last_name": "Krishnan", "age": 70, "gender": "Female",
     "blood_group": BloodGroup.AB_POS, "ward": "General", "room_number": "G-205",
     "bed_number": "5A", "has_hypertension": True, "has_diabetes": True,
     "has_previous_heart_disease": True, "has_kidney_disease": True,
     "admission_reason": "Dizziness, irregular heartbeat, fatigue",
     "phone": "+91 65432 10987"},
    {"first_name": "Arjun", "last_name": "Nair", "age": 35, "gender": "Male",
     "blood_group": BloodGroup.B_NEG, "ward": "Observation", "room_number": "O-101",
     "bed_number": "1B", "is_smoker": True,
     "admission_reason": "Palpitations during exercise, stress test ordered",
     "phone": "+91 54321 09876"},
    {"first_name": "Priya", "last_name": "Venkatesh", "age": 58, "gender": "Female",
     "blood_group": BloodGroup.O_NEG, "ward": "Cardiology", "room_number": "C-103",
     "bed_number": "3A", "has_hypertension": True,
     "has_previous_heart_disease": True, "is_smoker": False,
     "admission_reason": "Follow-up after CABG surgery, rehabilitation",
     "phone": "+91 43210 98765"},
    {"first_name": "Vijay", "last_name": "Sundaram", "age": 45, "gender": "Male",
     "blood_group": BloodGroup.A_NEG, "ward": "Emergency", "room_number": "ER-2",
     "bed_number": "ER-2A", "has_diabetes": True, "is_smoker": True,
     "alcohol_use": True, "admission_reason": "Severe chest pain radiating to left arm",
     "phone": "+91 32109 87654"},
    {"first_name": "Divya", "last_name": "Ramasamy", "age": 42, "gender": "Female",
     "blood_group": BloodGroup.B_POS, "ward": "General", "room_number": "G-210",
     "bed_number": "10A", "admission_reason": "Routine cardiac screening",
     "phone": "+91 21098 76543"},
]


def seed_demo_data():
    """Seed database with demo data if tables are empty."""
    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(User).count() > 0:
            print("[INFO] Database already has data — skipping seed")
            return

        print("[SEED] Creating demo users...")
        users = []
        for u_data in DEMO_USERS:
            user = User(
                username=u_data["username"],
                email=u_data["email"],
                hashed_password=hash_password("cardio123"),  # Default password
                full_name=u_data["full_name"],
                role=u_data["role"],
                phone=u_data.get("phone"),
                specialization=u_data.get("specialization"),
                department=u_data.get("department"),
                license_number=u_data.get("license_number"),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            users.append(user)
        db.commit()

        # Get doctor and nurse IDs
        doctors = [u for u in users if u.role == UserRole.DOCTOR]
        nurses = [u for u in users if u.role == UserRole.NURSE]

        print("[SEED] Creating demo patients...")
        patients = []
        for i, p_data in enumerate(DEMO_PATIENTS):
            status = PatientStatus.ADMITTED
            if p_data["ward"] == "ICU":
                status = PatientStatus.ICU
            elif p_data["ward"] == "Emergency":
                status = PatientStatus.EMERGENCY

            patient = Patient(
                patient_uid=f"PAT-{str(i + 1).zfill(5)}",
                first_name=p_data["first_name"],
                last_name=p_data["last_name"],
                age=p_data["age"],
                gender=p_data["gender"],
                blood_group=p_data.get("blood_group"),
                phone=p_data.get("phone"),
                ward=p_data.get("ward"),
                room_number=p_data.get("room_number"),
                bed_number=p_data.get("bed_number"),
                status=status,
                assigned_doctor_id=doctors[i % len(doctors)].id,
                assigned_nurse_id=nurses[i % len(nurses)].id,
                admission_date=datetime.utcnow() - timedelta(days=random.randint(0, 7)),
                admission_reason=p_data.get("admission_reason"),
                has_hypertension=p_data.get("has_hypertension", False),
                has_diabetes=p_data.get("has_diabetes", False),
                has_kidney_disease=p_data.get("has_kidney_disease", False),
                has_previous_heart_disease=p_data.get("has_previous_heart_disease", False),
                is_smoker=p_data.get("is_smoker", False),
                alcohol_use=p_data.get("alcohol_use", False),
                allergies=p_data.get("allergies"),
            )
            db.add(patient)
            patients.append(patient)
        db.commit()

        print("[SEED] Creating demo vitals, predictions, symptoms, medications...")
        for patient in patients:
            _seed_patient_data(db, patient)

        db.commit()
        print(f"[SEED] Seeded {len(users)} users, {len(patients)} patients with full demo data")
        print(f"[SEED] Login: admin / cardio123 (or any demo user with password 'cardio123')")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {e}")
    finally:
        db.close()


def _seed_patient_data(db: Session, patient: Patient):
    """Seed vitals, predictions, symptoms, and medications for a patient."""
    base_hr = random.randint(65, 95)
    base_spo2 = random.uniform(93, 99)
    base_temp = random.uniform(36.2, 37.2)
    base_sys = random.randint(110, 155)
    base_dia = random.randint(65, 95)
    base_resp = random.randint(14, 22)

    # Generate 24-48 hours of vital sign data
    num_readings = random.randint(24, 48)
    for i in range(num_readings):
        timestamp = datetime.utcnow() - timedelta(hours=num_readings - i)

        vital = VitalSign(
            patient_id=patient.id,
            heart_rate=base_hr + random.uniform(-12, 15),
            spo2=min(100, base_spo2 + random.uniform(-3, 2)),
            temperature=round(base_temp + random.uniform(-0.5, 0.8), 1),
            bp_systolic=base_sys + random.randint(-15, 20),
            bp_diastolic=base_dia + random.randint(-10, 15),
            respiratory_rate=base_resp + random.randint(-3, 5),
            pain_level=random.choice([0, 0, 1, 2, 3, 4, 5]),
            source=VitalSource.IOT_ESP32 if i % 3 == 0 else VitalSource.MANUAL,
            device_id="ESP32-DEMO-001" if i % 3 == 0 else None,
            recorded_at=timestamp,
        )
        db.add(vital)

    # Generate predictions (fewer than vitals)
    risk_levels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
    risk_weights = [0.3, 0.3, 0.25, 0.15]
    if patient.has_previous_heart_disease:
        risk_weights = [0.1, 0.2, 0.35, 0.35]

    for i in range(random.randint(3, 8)):
        risk = random.choices(risk_levels, weights=risk_weights, k=1)[0]
        score_ranges = {"low": (5, 25), "medium": (25, 50), "high": (50, 75), "critical": (75, 95)}
        lo, hi = score_ranges[risk.value]
        score = random.uniform(lo, hi)

        pred = Prediction(
            patient_id=patient.id,
            risk_score=score / 100,
            risk_percentage=round(score, 1),
            risk_level=risk,
            confidence=round(random.uniform(70, 98), 1),
            model_name="XGBoost",
            feature_values={"age": patient.age, "sex": 1 if patient.gender == "Male" else 0,
                           "cp": random.randint(0, 3), "trestbps": base_sys,
                           "chol": random.randint(180, 320), "fbs": random.randint(0, 1),
                           "restecg": random.randint(0, 2), "thalach": random.randint(100, 180),
                           "exang": random.randint(0, 1), "oldpeak": round(random.uniform(0, 4), 1),
                           "slope": random.randint(0, 2), "ca": random.randint(0, 3),
                           "thal": random.randint(0, 3)},
            top_risk_factors=random.sample(
                ["Chest Pain Type", "ST Depression", "Age", "Max Heart Rate",
                 "Number of Vessels", "Thalassemia", "Blood Pressure"],
                k=3,
            ),
            predicted_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
        )
        db.add(pred)

    # Update patient's current risk
    patient.current_risk_level = pred.risk_level.value
    patient.current_risk_score = pred.risk_percentage

    # Symptoms
    for i in range(random.randint(1, 3)):
        symptom = SymptomRecord(
            patient_id=patient.id,
            chest_pain=random.random() > 0.6,
            breathing_difficulty=random.random() > 0.7,
            dizziness=random.random() > 0.75,
            fatigue=random.random() > 0.5,
            sweating=random.random() > 0.7,
            palpitations=random.random() > 0.7,
            fever=random.random() > 0.85,
            pain_score=random.randint(0, 7),
            notes="Demo symptom record",
            recorded_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
        )
        db.add(symptom)

    # Medications
    meds = [
        ("Aspirin", "75mg", "Once daily", MedicationType.ORAL),
        ("Atorvastatin", "20mg", "Once daily", MedicationType.ORAL),
        ("Metoprolol", "50mg", "Twice daily", MedicationType.ORAL),
        ("Heparin", "5000 IU", "Every 12 hours", MedicationType.INJECTION),
        ("Normal Saline", "500ml", "Continuous", MedicationType.IV_FLUID),
    ]
    for med_name, dose, freq, route in random.sample(meds, k=random.randint(2, 4)):
        med = Medication(
            patient_id=patient.id,
            medicine_name=med_name,
            dose=dose,
            frequency=freq,
            route=route,
            status=MedicationStatus.ACTIVE,
            doses_given=random.randint(1, 8),
            doses_missed=random.randint(0, 2),
            start_date=datetime.utcnow() - timedelta(days=random.randint(1, 5)),
        )
        db.add(med)

    # Alerts for high-risk patients
    if patient.has_previous_heart_disease or patient.current_risk_level in ["high", "critical"]:
        alert = Alert(
            patient_id=patient.id,
            alert_type=AlertType.AI_RISK,
            severity=AlertSeverity.WARNING,
            title="Elevated Cardiovascular Risk",
            message=f"AI assessment indicates elevated risk for {patient.first_name} {patient.last_name}. Clinical review recommended.",
            risk_score=patient.current_risk_score,
            triggered_at=datetime.utcnow() - timedelta(hours=random.randint(1, 6)),
        )
        db.add(alert)
