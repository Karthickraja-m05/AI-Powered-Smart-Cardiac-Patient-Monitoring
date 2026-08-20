# -*- coding: utf-8 -*-
"""
Demo Data Seeder
================
Seeds the database with sample users, patients, vitals, predictions,
appointments, tamper-evident audit logs, and in-app notifications.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import random
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models.user import User, UserRole
from .models.patient import Patient, PatientStatus, BloodGroup
from .models.vitals import VitalSign, VitalSource
from .models.prediction import Prediction, RiskLevel
from .models.symptom import SymptomRecord
from .models.medication import Medication, MedicationType, MedicationStatus
from .models.alert import Alert, AlertType, AlertSeverity
from .models.hospital import Hospital, Department
from .models.doctor_availability import DoctorAvailability, AvailabilityStatus
from .models.shift import DoctorShift, NurseShift, ShiftType
from .models.patient_timeline import TimelineEvent, TimelineEventType
from .models.chat import ChatMessage, MessageType
from .models.appointment import Appointment, AppointmentStatus
from .models.audit_log import AuditLog, AuditAction
from .models.notification import Notification, NotificationChannel
from .services.auth_service import hash_password


# ── Demo Users ──
DEMO_USERS = [
    {"username": "admin", "email": "admin@carebridge.ai", "full_name": "Dr. Admin Kumar",
     "role": UserRole.SUPER_ADMIN, "specialization": "Hospital Administration", "department": "Admin",
     "password": "admin123"},
    {"username": "hospital.admin", "email": "hadmin@carebridge.ai", "full_name": "Srinivas Rao",
     "role": UserRole.HOSPITAL_ADMIN, "department": "Administration",
     "password": "hadmin123"},
    {"username": "dr.sharma", "email": "sharma@carebridge.ai", "full_name": "Dr. Priya Sharma",
     "role": UserRole.DOCTOR, "specialization": "Cardiology", "department": "Cardiology",
     "license_number": "MCI-23456", "experience_years": 12, "consultation_time_avg": 20,
     "password": "sharma123"},
    {"username": "dr.patel", "email": "patel@carebridge.ai", "full_name": "Dr. Rajesh Patel",
     "role": UserRole.DOCTOR, "specialization": "Internal Medicine", "department": "Medicine",
     "license_number": "MCI-34567", "experience_years": 8, "consultation_time_avg": 15,
     "password": "patel123"},
    {"username": "dr.mehta", "email": "mehta@carebridge.ai", "full_name": "Dr. Anand Mehta",
     "role": UserRole.DOCTOR, "specialization": "Cardiology", "department": "Cardiology",
     "license_number": "MCI-45678", "experience_years": 15, "consultation_time_avg": 25,
     "password": "mehta123"},
    {"username": "dr.singh", "email": "singh@carebridge.ai", "full_name": "Dr. Harpreet Singh",
     "role": UserRole.DOCTOR, "specialization": "Cardiac Surgery", "department": "Surgery",
     "license_number": "MCI-56789", "experience_years": 20, "consultation_time_avg": 30,
     "password": "singh123"},
    {"username": "nurse.anitha", "email": "anitha@carebridge.ai", "full_name": "Anitha Rajan",
     "role": UserRole.NURSE, "department": "ICU", "license_number": "NMC-12345",
     "password": "anitha123"},
    {"username": "nurse.deepa", "email": "deepa@carebridge.ai", "full_name": "Deepa Murugan",
     "role": UserRole.NURSE, "department": "Cardiology", "license_number": "NMC-23456",
     "password": "deepa123"},
    {"username": "nurse.priya", "email": "npriya@carebridge.ai", "full_name": "Priya Nair",
     "role": UserRole.NURSE, "department": "General", "license_number": "NMC-34567",
     "password": "priya123"},
    {"username": "reception", "email": "reception@carebridge.ai", "full_name": "Kavitha S",
     "role": UserRole.RECEPTIONIST, "department": "Front Desk",
     "password": "reception123"},
    {"username": "patient.ramesh", "email": "ramesh@gmail.com", "full_name": "Ramesh Kumar",
     "role": UserRole.PATIENT, "password": "patient123"},
    {"username": "caregiver.sunita", "email": "sunita@gmail.com", "full_name": "Sunita Kumar",
     "role": UserRole.CAREGIVER, "caregiver_relation": "Spouse", "password": "sunita123"},
    {"username": "caregiver.arun", "email": "arun@gmail.com", "full_name": "Arun Devi",
     "role": UserRole.CAREGIVER, "caregiver_relation": "Son", "password": "arun123"},
]

# ── Demo Patients ──
DEMO_PATIENTS = [
    {"first_name": "Ramesh", "last_name": "Kumar", "age": 62, "gender": "Male",
     "blood_group": BloodGroup.B_POS, "ward": "Cardiac ICU", "room_number": "ICU-3",
     "bed_number": "ICU-03", "has_hypertension": True, "has_diabetes": True,
     "has_previous_heart_disease": True, "is_smoker": True,
     "admission_reason": "Acute Myocardial Infarction, elevated troponin",
     "allergies": "Penicillin", "phone": "+91 98765 43210"},
    {"first_name": "Lakshmi", "last_name": "Devi", "age": 55, "gender": "Female",
     "blood_group": BloodGroup.A_POS, "ward": "ICU", "room_number": "ICU-3",
     "bed_number": "3B", "has_hypertension": True, "has_kidney_disease": True,
     "admission_reason": "Acute shortness of breath, SpO2 < 88%",
     "phone": "+91 87654 32109"},
    {"first_name": "Suresh", "last_name": "Babu", "age": 48, "gender": "Male",
     "blood_group": BloodGroup.O_POS, "ward": "Cardiology", "room_number": "C-102",
     "bed_number": "2A", "has_diabetes": True, "alcohol_use": True,
     "admission_reason": "Post-PTCA Follow-up, angina on exertion",
     "phone": "+91 76543 21098"},
    {"first_name": "Meena", "last_name": "Krishnan", "age": 70, "gender": "Female",
     "blood_group": BloodGroup.AB_POS, "ward": "General Ward", "room_number": "G-201",
     "bed_number": "1B", "has_hypertension": True,
     "admission_reason": "Dizziness, syncopal episode, bradycardia",
     "allergies": "Sulfa drugs", "phone": "+91 65432 10987"},
    {"first_name": "Vijay", "last_name": "Raghavan", "age": 45, "gender": "Male",
     "blood_group": BloodGroup.B_POS, "ward": "Cardiology", "room_number": "C-103",
     "bed_number": "3A", "has_hypertension": True, "is_smoker": True,
     "admission_reason": "Arrhythmia & Holter monitoring assessment",
     "phone": "+91 54321 09876"},
    {"first_name": "Ananya", "last_name": "Sharma", "age": 48, "gender": "Female",
     "blood_group": BloodGroup.O_POS, "ward": "CCU Wing A", "room_number": "Room 204-B",
     "bed_number": "204-B", "has_hypertension": True, "has_previous_heart_disease": True,
     "admission_reason": "Unstable Angina with dynamic ST elevations",
     "phone": "+91 91234 56789"},
    {"first_name": "Vikram", "last_name": "Sethi", "age": 55, "gender": "Male",
     "blood_group": BloodGroup.A_POS, "ward": "Step-Down CCU", "room_number": "Room 112",
     "bed_number": "112", "has_diabetes": True,
     "admission_reason": "Post-PTCA coronary stent recovery and titration",
     "phone": "+91 92345 67890"},
    {"first_name": "Kavita", "last_name": "Menon", "age": 71, "gender": "Female",
     "blood_group": BloodGroup.B_POS, "ward": "General Ward 2", "room_number": "Bed 214",
     "bed_number": "214", "has_hypertension": True,
     "admission_reason": "Hypertensive Heart Disease management",
     "phone": "+91 93456 78901"},
]


def seed_demo_data():
    """Seed database with demo data if tables are empty."""
    db = SessionLocal()
    try:
        # Check if users exist
        user_count = db.query(User).count()
        if user_count > 0:
            print("[INFO] Users already exist in database.")
            # Ensure appointments, audit logs and notifications are seeded if missing
            _ensure_auxiliary_data(db)
            return

        # ── Seed Hospital ──
        print("[SEED] Creating demo hospital...")
        hospital = Hospital(
            name="CareBridge Medical Center",
            code="HSP-001",
            address="123 Medical Drive, Anna Nagar",
            city="Chennai",
            state="Tamil Nadu",
            country="India",
            pincode="600040",
            phone="+91 44 2345 6789",
            email="info@carebridge.in",
            total_beds=100,
            icu_beds=10,
            emergency_beds=15,
            carbon_savings_kg=1250.5,
            solar_panels=True,
            green_rating="A",
            established_year=2015,
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

        # ── Seed Departments ──
        print("[SEED] Creating departments...")
        dept_data = [
            {"name": "Cardiology", "code": "CARD", "floor": "3rd", "wing": "East", "bed_count": 30},
            {"name": "Internal Medicine", "code": "MED", "floor": "2nd", "wing": "West", "bed_count": 25},
            {"name": "ICU", "code": "ICU", "floor": "4th", "wing": "Central", "bed_count": 10},
            {"name": "Emergency", "code": "ER", "floor": "Ground", "wing": "South", "bed_count": 15},
            {"name": "General Ward", "code": "GEN", "floor": "1st", "wing": "North", "bed_count": 20},
            {"name": "Cardiac Surgery", "code": "CSURG", "floor": "5th", "wing": "East", "bed_count": 8},
        ]
        departments = []
        for dd in dept_data:
            dept = Department(hospital_id=hospital.id, **dd)
            db.add(dept)
            departments.append(dept)
        db.commit()

        # ── Seed Users ──
        print("[SEED] Creating demo users...")
        users = []
        for u_data in DEMO_USERS:
            user = User(
                username=u_data["username"],
                email=u_data["email"],
                hashed_password=hash_password(u_data["password"]),
                full_name=u_data["full_name"],
                role=u_data["role"],
                phone=u_data.get("phone"),
                specialization=u_data.get("specialization"),
                department=u_data.get("department"),
                license_number=u_data.get("license_number"),
                hospital_id=hospital.id,
                experience_years=u_data.get("experience_years"),
                consultation_time_avg=u_data.get("consultation_time_avg", 15),
                caregiver_relation=u_data.get("caregiver_relation"),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            users.append(user)
        db.commit()

        doctors = [u for u in users if u.role == UserRole.DOCTOR]
        nurses = [u for u in users if u.role == UserRole.NURSE]
        caregivers = [u for u in users if u.role == UserRole.CAREGIVER]
        patient_user = next((u for u in users if u.role == UserRole.PATIENT), None)

        for i, dept in enumerate(departments):
            if i < len(doctors):
                dept.head_doctor_id = doctors[i].id
        db.commit()

        # ── Seed Doctor Availability ──
        print("[SEED] Creating doctor availability records...")
        statuses = [AvailabilityStatus.AVAILABLE, AvailabilityStatus.AVAILABLE,
                    AvailabilityStatus.BUSY, AvailabilityStatus.IN_SURGERY]
        for i, doc in enumerate(doctors):
            avail = DoctorAvailability(
                doctor_id=doc.id,
                status=statuses[i % len(statuses)],
                status_message=None if statuses[i % len(statuses)] == AvailabilityStatus.AVAILABLE
                    else "Currently with an inpatient",
            )
            db.add(avail)
            doc.current_workload = random.randint(2, 6)
            doc.rating_avg = round(random.uniform(4.5, 4.9), 1)
            doc.rating_count = random.randint(15, 60)
        db.commit()

        # ── Seed Shifts ──
        print("[SEED] Creating shifts...")
        today = date.today()
        shift_types = [ShiftType.MORNING, ShiftType.AFTERNOON, ShiftType.NIGHT]
        shift_times = {
            ShiftType.MORNING: ("06:00", "14:00"),
            ShiftType.AFTERNOON: ("14:00", "22:00"),
            ShiftType.NIGHT: ("22:00", "06:00"),
        }
        for i, doc in enumerate(doctors):
            st = shift_types[i % len(shift_types)]
            shift = DoctorShift(
                doctor_id=doc.id,
                hospital_id=hospital.id,
                department=doc.department,
                shift_type=st,
                shift_date=today,
                start_time=shift_times[st][0],
                end_time=shift_times[st][1],
                checked_in=True,
                checked_in_at=datetime.utcnow().replace(hour=6),
            )
            db.add(shift)

        for i, nurse in enumerate(nurses):
            st = shift_types[i % len(shift_types)]
            shift = NurseShift(
                nurse_id=nurse.id,
                hospital_id=hospital.id,
                ward=nurse.department,
                shift_type=st,
                shift_date=today,
                start_time=shift_times[st][0],
                end_time=shift_times[st][1],
                checked_in=True,
                checked_in_at=datetime.utcnow().replace(hour=6),
            )
            db.add(shift)
        db.commit()

        # ── Seed Patients ──
        print("[SEED] Creating demo patients...")
        patients = []
        for i, p_data in enumerate(DEMO_PATIENTS):
            h = random.randint(155, 185)
            w = random.randint(55, 95)
            bmi = round(w / ((h / 100) ** 2), 1)

            assigned_doc = doctors[i % len(doctors)]
            assigned_nur = nurses[i % len(nurses)]

            patient = Patient(
                patient_uid=f"PAT-2026-{str(i + 1).zfill(3)}",
                first_name=p_data["first_name"],
                last_name=p_data["last_name"],
                date_of_birth=datetime(2026 - p_data["age"], random.randint(1, 12), random.randint(1, 28)),
                age=p_data["age"],
                gender=p_data["gender"],
                blood_group=p_data["blood_group"],
                height_cm=h,
                weight_kg=w,
                bmi=bmi,
                phone=p_data.get("phone"),
                email=f"{p_data['first_name'].lower()}@example.com",
                hospital_id=hospital.id,
                department_id=departments[0].id if departments else None,
                status=PatientStatus.ICU if "ICU" in p_data.get("ward", "") else PatientStatus.ADMITTED,
                ward=p_data.get("ward"),
                room_number=p_data.get("room_number"),
                bed_number=p_data.get("bed_number"),
                assigned_doctor_id=assigned_doc.id,
                assigned_nurse_id=assigned_nur.id,
                assigned_caregiver_id=caregivers[i % len(caregivers)].id if caregivers else None,
                admission_date=datetime.utcnow() - timedelta(days=random.randint(0, 5)),
                admission_reason=p_data.get("admission_reason"),
                has_hypertension=p_data.get("has_hypertension", False),
                has_diabetes=p_data.get("has_diabetes", False),
                has_kidney_disease=p_data.get("has_kidney_disease", False),
                has_previous_heart_disease=p_data.get("has_previous_heart_disease", False),
                is_smoker=p_data.get("is_smoker", False),
                alcohol_use=p_data.get("alcohol_use", False),
                allergies=p_data.get("allergies"),
                icu_priority_level=random.choice(["critical", "urgent", "stable"]),
                icu_priority_score=round(random.uniform(30, 95), 1),
            )
            db.add(patient)
            patients.append(patient)
        db.commit()

        if patient_user and patients:
            patients[0].user_id = patient_user.id
            if caregivers:
                caregivers[0].linked_patient_id = patients[0].id
                patients[0].assigned_caregiver_id = caregivers[0].id
            db.commit()

        # ── Seed Vitals, Predictions, Symptoms, Medications, Alerts ──
        for patient in patients:
            _seed_patient_data(db, patient)

        for patient in patients:
            _seed_timeline(db, patient)

        for patient in patients[:3]:
            _seed_chat(db, patient, doctors, nurses)

        db.commit()

        # ── Seed Appointments, Audit Logs & Notifications ──
        _seed_appointments(db, patients, doctors)
        _seed_audit_logs(db, users, patients)
        _seed_notifications(db, users, patients)

        db.commit()
        print(f"[SEED] Successfully seeded {len(users)} users, {len(patients)} patients with complete clinical data!")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _ensure_auxiliary_data(db: Session):
    """Ensure appointments, audit logs, and notifications exist in active database."""
    users = db.query(User).all()
    patients = db.query(Patient).all()
    doctors = [u for u in users if u.role == UserRole.DOCTOR]

    if db.query(Appointment).count() == 0 and patients and doctors:
        print("[SEED] Seeding appointments...")
        _seed_appointments(db, patients, doctors)
        db.commit()

    if db.query(AuditLog).count() < 10 and users and patients:
        print("[SEED] Seeding rich audit logs...")
        _seed_audit_logs(db, users, patients)
        db.commit()

    if db.query(Notification).count() == 0 and users and patients:
        print("[SEED] Seeding notifications...")
        _seed_notifications(db, users, patients)
        db.commit()


def _seed_patient_data(db: Session, patient: Patient):
    """Seed vitals, predictions, symptoms, and medications for a patient."""
    base_hr = random.randint(68, 92)
    base_spo2 = random.uniform(94, 99)
    base_temp = random.uniform(36.4, 37.2)
    base_sys = random.randint(115, 150)
    base_dia = random.randint(70, 90)
    base_resp = random.randint(14, 20)

    num_readings = 24
    for i in range(num_readings):
        timestamp = datetime.utcnow() - timedelta(hours=num_readings - i)
        vital = VitalSign(
            patient_id=patient.id,
            heart_rate=round(base_hr + random.uniform(-8, 12), 1),
            spo2=round(min(100.0, base_spo2 + random.uniform(-2, 1)), 1),
            temperature=round(base_temp + random.uniform(-0.3, 0.5), 1),
            bp_systolic=base_sys + random.randint(-10, 15),
            bp_diastolic=base_dia + random.randint(-8, 10),
            respiratory_rate=round(base_resp + random.uniform(-2, 3), 1),
            pain_level=random.choice([0, 1, 2, 3]),
            source=VitalSource.IOT_ESP32 if i % 2 == 0 else VitalSource.MANUAL,
            device_id="ESP32-ICU-001",
            recorded_at=timestamp,
            created_at=timestamp,
        )
        db.add(vital)

    score = random.uniform(70, 92) if patient.has_previous_heart_disease or "ICU" in (patient.ward or "") else random.uniform(15, 45)
    risk = RiskLevel.CRITICAL if score >= 75 else (RiskLevel.HIGH if score >= 50 else RiskLevel.LOW)

    pred = Prediction(
        patient_id=patient.id,
        risk_score=score / 100,
        risk_percentage=round(score, 1),
        risk_level=risk,
        confidence=round(random.uniform(85, 98), 1),
        model_name="XGBoost Ensemble",
        feature_values={"age": patient.age, "sex": 1 if patient.gender == "Male" else 0,
                       "cp": 2 if score > 50 else 0, "trestbps": base_sys,
                       "chol": 240, "fbs": 1, "restecg": 1, "thalach": 145,
                       "exang": 1 if score > 50 else 0, "oldpeak": 2.2 if score > 50 else 0.5,
                       "slope": 1, "ca": 1, "thal": 2},
        top_risk_factors=["ST Depression", "Resting BP", "Chest Pain Type", "Max Heart Rate"],
        predicted_at=datetime.utcnow() - timedelta(hours=2),
    )
    db.add(pred)

    patient.current_risk_level = risk.value
    patient.current_risk_score = round(score, 1)

    # Meds
    meds = [
        ("Aspirin", "75mg", "Once daily", MedicationType.ORAL),
        ("Atorvastatin", "20mg", "Once daily (Bedtime)", MedicationType.ORAL),
        ("Metoprolol Tartrate", "50mg", "Twice daily", MedicationType.ORAL),
        ("Amiodarone IV", "150mg", "Continuous Infusion", MedicationType.IV_FLUID),
    ]
    for med_name, dose, freq, route in meds:
        med = Medication(
            patient_id=patient.id,
            medicine_name=med_name,
            dose=dose,
            frequency=freq,
            route=route,
            status=MedicationStatus.ACTIVE,
            doses_given=random.randint(4, 12),
            doses_missed=random.randint(0, 1),
            start_date=datetime.utcnow() - timedelta(days=3),
        )
        db.add(med)

    # Clinical Alert
    if patient.current_risk_level in ["high", "critical"]:
        alert = Alert(
            patient_id=patient.id,
            alert_type=AlertType.AI_RISK,
            severity=AlertSeverity.CRITICAL if patient.current_risk_level == "critical" else AlertSeverity.WARNING,
            title=f"Elevated Hemodynamic Deterioration Risk: {patient.first_name} {patient.last_name}",
            message=f"AI inference projects elevated cardiovascular instability ({score:.1f}%). Continuous CCU telemetry monitoring recommended.",
            risk_score=score,
            threshold=75.0 if score >= 75 else 50.0,
            is_acknowledged=False,
            is_resolved=False,
            triggered_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 45)),
            created_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 45)),
        )
        db.add(alert)


def _seed_appointments(db: Session, patients: list, doctors: list):
    """Seed realistic appointments for today and upcoming days."""
    today = datetime.utcnow()
    primary_doc = doctors[0] if doctors else None
    if not primary_doc:
        return

    sample_appts = [
        {
            "patient": patients[0],
            "doctor": primary_doc,
            "scheduled_at": today.replace(hour=9, minute=30, second=0),
            "type": "follow-up",
            "status": AppointmentStatus.CONFIRMED,
            "reason": "Post-discharge Holter monitor analysis & Statin titration",
        },
        {
            "patient": patients[1] if len(patients) > 1 else patients[0],
            "doctor": primary_doc,
            "scheduled_at": today.replace(hour=10, minute=15, second=0),
            "type": "consultation",
            "status": AppointmentStatus.SCHEDULED,
            "reason": "Exertional dyspnea & chest tightness evaluation",
        },
        {
            "patient": patients[2] if len(patients) > 2 else patients[0],
            "doctor": primary_doc,
            "scheduled_at": today.replace(hour=11, minute=0, second=0),
            "type": "checkup",
            "status": AppointmentStatus.IN_PROGRESS,
            "reason": "Hypertension & 12-lead ECG review",
        },
        {
            "patient": patients[3] if len(patients) > 3 else patients[0],
            "doctor": primary_doc,
            "scheduled_at": today.replace(hour=11, minute=45, second=0),
            "type": "emergency",
            "status": AppointmentStatus.SCHEDULED,
            "reason": "Abnormal T-wave inversion priority follow-up",
        },
        {
            "patient": patients[4] if len(patients) > 4 else patients[0],
            "doctor": primary_doc,
            "scheduled_at": today.replace(hour=14, minute=30, second=0),
            "type": "consultation",
            "status": AppointmentStatus.SCHEDULED,
            "reason": "Lipid panel review and echocardiogram discussion",
        },
        {
            "patient": patients[5] if len(patients) > 5 else patients[0],
            "doctor": primary_doc,
            "scheduled_at": today + timedelta(days=1, hours=2),
            "type": "follow-up",
            "status": AppointmentStatus.SCHEDULED,
            "reason": "Post-angioplasty 2-week review",
        },
        {
            "patient": patients[6] if len(patients) > 6 else patients[0],
            "doctor": doctors[1] if len(doctors) > 1 else primary_doc,
            "scheduled_at": today.replace(hour=10, minute=0, second=0),
            "type": "consultation",
            "status": AppointmentStatus.CONFIRMED,
            "reason": "Internal medicine cardiac co-morbidity review",
        },
    ]

    for a in sample_appts:
        appt = Appointment(
            patient_id=a["patient"].id,
            doctor_id=a["doctor"].id,
            scheduled_at=a["scheduled_at"],
            duration_minutes=30,
            appointment_type=a["type"],
            status=a["status"],
            reason=a["reason"],
            created_at=datetime.utcnow() - timedelta(hours=random.randint(2, 24)),
        )
        db.add(appt)


def _seed_audit_logs(db: Session, users: list, patients: list):
    """Seed comprehensive tamper-evident audit logs across all clinical entities."""
    admin_user = next((u for u in users if u.role == UserRole.SUPER_ADMIN), None)
    doc_user = next((u for u in users if u.role == UserRole.DOCTOR), None)
    nurse_user = next((u for u in users if u.role == UserRole.NURSE), None)
    recept_user = next((u for u in users if u.role == UserRole.RECEPTIONIST), None)
    hadmin_user = next((u for u in users if u.role == UserRole.HOSPITAL_ADMIN), None)

    p0_name = patients[0].full_name if patients else "Ramesh Kumar"
    p1_name = patients[1].full_name if len(patients) > 1 else "Lakshmi Devi"
    p2_name = patients[2].full_name if len(patients) > 2 else "Suresh Babu"
    p3_name = patients[3].full_name if len(patients) > 3 else "Meena Krishnan"
    p4_name = patients[4].full_name if len(patients) > 4 else "Arjun Nair"

    audit_events = [
        (AuditAction.LOGIN, "user", admin_user.id if admin_user else 1, admin_user.username if admin_user else "admin",
         "Super Admin Dr. Admin Kumar logged in from executive station (192.168.1.10)", {"ip": "192.168.1.10", "role": "super_admin"}, -timedelta(hours=24)),
        (AuditAction.SHIFT_CHECKIN, "shift", 1, doc_user.username if doc_user else "dr.sharma",
         "Dr. Priya Sharma checked into Morning Cardiology Shift (08:00 - 16:00)", {"shift": "morning", "dept": "Cardiology"}, -timedelta(hours=23)),
        (AuditAction.SHIFT_CHECKIN, "shift", 2, nurse_user.username if nurse_user else "nurse.anitha",
         "Nurse Anitha Rajan checked into Morning ICU Shift (06:00 - 14:00) in Cardiac ICU", {"shift": "morning", "ward": "ICU"}, -timedelta(hours=22)),
        (AuditAction.CREATE, "patient", patients[0].id if patients else 1, recept_user.username if recept_user else "reception",
         f"Receptionist Kavitha S registered patient {p0_name} (PAT-00001) for Acute Chest Pain intake", {"patient_id": 1, "ward": "Cardiology"}, -timedelta(hours=20)),
        (AuditAction.CREATE, "patient", patients[1].id if len(patients) > 1 else 2, recept_user.username if recept_user else "reception",
         f"Receptionist Kavitha S registered patient {p1_name} (PAT-00002) for ICU telemetry monitoring", {"patient_id": 2, "ward": "ICU"}, -timedelta(hours=19)),
        (AuditAction.REASSIGN, "load_balancer", 1, "system",
         f"AI Load Balancer assigned Dr. Priya Sharma to {p0_name} (Optimization Score: 94.2)", {"assigned_doc": "Dr. Priya Sharma", "score": 94.2}, -timedelta(hours=18)),
        (AuditAction.UPDATE, "vitals", 1, nurse_user.username if nurse_user else "nurse.anitha",
         f"Bedside telemetry vitals recorded for {p0_name}: HR 88 bpm, SpO2 96%, BP 138/85 mmHg", {"hr": 88, "spo2": 96, "sys": 138}, -timedelta(hours=17)),
        (AuditAction.PRESCRIBE_MED, "medication", 1, doc_user.username if doc_user else "dr.sharma",
         f"Dr. Priya Sharma prescribed Aspirin 75mg once daily for {p0_name}", {"med": "Aspirin", "dose": "75mg"}, -timedelta(hours=16)),
        (AuditAction.PRESCRIBE_MED, "medication", 2, doc_user.username if doc_user else "dr.sharma",
         f"Dr. Priya Sharma prescribed Atorvastatin 20mg once daily for {p0_name}", {"med": "Atorvastatin", "dose": "20mg"}, -timedelta(hours=15)),
        (AuditAction.ADMINISTER_MED, "medication", 1, nurse_user.username if nurse_user else "nurse.anitha",
         f"Nurse Anitha Rajan administered morning oral dose of Aspirin 75mg to {p0_name}", {"med": "Aspirin", "status": "administered"}, -timedelta(hours=14)),
        (AuditAction.EMERGENCY_ALERT, "alert", 1, "system",
         f"High Tachycardia Alert triggered for {p0_name} (HR: 128 bpm > threshold 110 bpm)", {"hr": 128, "severity": "critical"}, -timedelta(hours=12)),
        (AuditAction.ACKNOWLEDGE_ALERT, "alert", 1, doc_user.username if doc_user else "dr.sharma",
         f"Dr. Priya Sharma ACKNOWLEDGED Tachycardia Alert for {p0_name}. Notes: IV Metoprolol administered", {"notes": "IV Metoprolol administered"}, -timedelta(hours=11, minutes=45)),
        (AuditAction.RESOLVE_ALERT, "alert", 1, doc_user.username if doc_user else "dr.sharma",
         f"Dr. Priya Sharma marked Tachycardia Alert RESOLVED for {p0_name}. Patient stabilized at HR 78 bpm", {"hr_after": 78, "status": "resolved"}, -timedelta(hours=10)),
        (AuditAction.BOOK_APPOINTMENT, "appointment", 1, recept_user.username if recept_user else "reception",
         f"Consultation appointment booked for {p1_name} with Dr. Priya Sharma on Today at 10:15 AM", {"scheduled_at": "10:15 AM"}, -timedelta(hours=9)),
        (AuditAction.UPDATE_APPOINTMENT, "appointment", 1, doc_user.username if doc_user else "dr.sharma",
         f"Appointment #{1} status updated to CONFIRMED for {p1_name}", {"status": "confirmed"}, -timedelta(hours=8, minutes=30)),
        (AuditAction.BOOK_APPOINTMENT, "appointment", 2, recept_user.username if recept_user else "reception",
         f"Follow-up appointment booked for {p2_name} with Dr. Priya Sharma on Today at 09:30 AM", {"scheduled_at": "09:30 AM"}, -timedelta(hours=8)),
        (AuditAction.STATUS_CHANGE, "doctor_availability", doc_user.id if doc_user else 3, doc_user.username if doc_user else "dr.sharma",
         "Dr. Priya Sharma updated status to Available for Consultations", {"status": "available"}, -timedelta(hours=7, minutes=30)),
        (AuditAction.TRANSFER, "transfer", 1, doc_user.username if doc_user else "dr.sharma",
         f"Clinical transfer order: Step-down transfer initiated for {p2_name} to Cardiology Bed 2A", {"to_ward": "Cardiology", "to_bed": "2A"}, -timedelta(hours=7)),
        (AuditAction.VIEW, "patient_emr", patients[0].id if patients else 1, doc_user.username if doc_user else "dr.sharma",
         f"Cardiology EMR and 15-min Risk Trajectory inspected for {p0_name}", {"view": "trajectory_forecast"}, -timedelta(hours=6)),
        (AuditAction.LOGIN, "user", hadmin_user.id if hadmin_user else 2, hadmin_user.username if hadmin_user else "hospital.admin",
         "Hospital Admin Srinivas Rao authenticated from Administration Console", {"ip": "192.168.1.15"}, -timedelta(hours=5)),
        (AuditAction.UPDATE, "hospital_capacity", 1, hadmin_user.username if hadmin_user else "hospital.admin",
         "Hospital Admin adjusted CCU bed allocation capacity to 24 beds", {"ccu_beds": 24}, -timedelta(hours=4, minutes=30)),
        (AuditAction.EMERGENCY_ALERT, "alert", 2, "system",
         f"SpO2 Desaturation Alert (<88%) triggered for {p1_name} in ICU Bed 3B", {"spo2": 86.5, "severity": "emergency"}, -timedelta(hours=4)),
        (AuditAction.ESCALATE_ALERT, "alert", 2, nurse_user.username if nurse_user else "nurse.anitha",
         f"Alert #{2} ESCALATED by Nurse Anitha Rajan: Patient requires immediate supplemental oxygen and physician bedside review", {"escalated_to": "Duty Cardiologists"}, -timedelta(hours=3, minutes=45)),
        (AuditAction.ACKNOWLEDGE_ALERT, "alert", 2, doc_user.username if doc_user else "dr.sharma",
         f"Dr. Priya Sharma ACKNOWLEDGED escalated oxygen desaturation for {p1_name}. High-flow nasal cannula ordered", {"action": "HFNC initiated"}, -timedelta(hours=3, minutes=30)),
        (AuditAction.RESOLVE_ALERT, "alert", 2, doc_user.username if doc_user else "dr.sharma",
         f"Dr. Priya Sharma marked SpO2 Alert RESOLVED for {p1_name}. SpO2 recovered to 96%", {"spo2_recovered": 96.0}, -timedelta(hours=2, minutes=30)),
        (AuditAction.CREATE, "patient", patients[2].id if len(patients) > 2 else 3, recept_user.username if recept_user else "reception",
         f"Patient check-in recorded for {p2_name} for routine cardiac consultation", {"patient_id": 3}, -timedelta(hours=2)),
        (AuditAction.UPDATE_APPOINTMENT, "appointment", 2, doc_user.username if doc_user else "dr.sharma",
         f"Appointment with {p2_name} marked IN_PROGRESS by Dr. Priya Sharma", {"status": "in_progress"}, -timedelta(hours=1, minutes=30)),
        (AuditAction.UPDATE_APPOINTMENT, "appointment", 2, doc_user.username if doc_user else "dr.sharma",
         f"Appointment with {p2_name} COMPLETED. Diagnosis: Mild sinus arrhythmia with benign profile", {"status": "completed"}, -timedelta(hours=1)),
        (AuditAction.UPLOAD, "patient_document", 1, doc_user.username if doc_user else "dr.sharma",
         f"12-Lead Holter ECG Report uploaded for {p0_name}", {"doc_type": "ecg_report"}, -timedelta(minutes=45)),
        (AuditAction.USER_MANAGE, "user", admin_user.id if admin_user else 1, admin_user.username if admin_user else "admin",
         "Super Admin verified clinical license NMC-23456 for Deepa Murugan (Nurse)", {"target_user": "nurse.deepa"}, -timedelta(minutes=30)),
        (AuditAction.STATUS_CHANGE, "doctor_availability", doc_user.id if doc_user else 3, doc_user.username if doc_user else "dr.sharma",
         "Dr. Priya Sharma toggled clinical status to Available for Consultations", {"status": "available"}, -timedelta(minutes=15)),
        (AuditAction.VIEW, "audit_log", 1, admin_user.username if admin_user else "admin",
         "Compliance audit inspection generated by Super Admin Dr. Admin Kumar", {"format": "summary"}, -timedelta(minutes=5)),
    ]

    for action, entity_type, entity_id, uname, desc_text, new_val, delta in audit_events:
        log = AuditLog(
            user_id=1,
            username=uname,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=desc_text,
            new_value=new_val,
            ip_address="192.168.1.45 (Hospital LAN)",
            created_at=datetime.utcnow() + delta,
        )
        db.add(log)


def _seed_notifications(db: Session, users: list, patients: list):
    """Seed initial in-app notifications for doctors and staff."""
    doc_user = next((u for u in users if u.role == UserRole.DOCTOR), None)
    nurse_user = next((u for u in users if u.role == UserRole.NURSE), None)
    patient = patients[0] if patients else None

    if doc_user:
        n1 = Notification(
            recipient_id=doc_user.id,
            channel=NotificationChannel.IN_APP,
            title="🚨 CRITICAL: Tachycardia Detected",
            message=f"{patient.full_name if patient else 'Ramesh Kumar'} (Cardiac ICU / Bed ICU-03): Heart rate spike (138 bpm). Action required.",
            patient_id=patient.id if patient else 1,
            is_sent=True,
            is_read=False,
            sent_at=datetime.utcnow() - timedelta(minutes=15),
            created_at=datetime.utcnow() - timedelta(minutes=15),
        )
        n2 = Notification(
            recipient_id=doc_user.id,
            channel=NotificationChannel.IN_APP,
            title="📅 New Consultation Booked",
            message=f"Appointment booked with {patients[1].full_name if len(patients) > 1 else 'Lakshmi Devi'} for today at 10:15 AM.",
            patient_id=patients[1].id if len(patients) > 1 else 1,
            is_sent=True,
            is_read=False,
            sent_at=datetime.utcnow() - timedelta(hours=1),
            created_at=datetime.utcnow() - timedelta(hours=1),
        )
        db.add(n1)
        db.add(n2)

    if nurse_user:
        n3 = Notification(
            recipient_id=nurse_user.id,
            channel=NotificationChannel.IN_APP,
            title="💊 Medication Due Reminder",
            message=f"Scheduled dose of Atorvastatin 20mg due for {patient.full_name if patient else 'Ramesh Kumar'} in 30 mins.",
            patient_id=patient.id if patient else 1,
            is_sent=True,
            is_read=False,
            sent_at=datetime.utcnow() - timedelta(minutes=30),
            created_at=datetime.utcnow() - timedelta(minutes=30),
        )
        db.add(n3)


def _seed_timeline(db: Session, patient: Patient):
    """Seed timeline events for a patient."""
    events = [
        (TimelineEventType.ADMISSION, "Patient Admitted", f"Admitted to {patient.ward or 'Cardiology'} ward", "🏥", -timedelta(days=2)),
        (TimelineEventType.VITALS, "Initial Vitals Recorded", "Vitals baseline recorded by nurse on duty", "💓", -timedelta(days=2, hours=-1)),
        (TimelineEventType.DOCTOR_VISIT, "Cardiologist Consultation", "Clinical examination and 12-lead ECG review", "👨‍⚕️", -timedelta(days=1, hours=18)),
        (TimelineEventType.MEDICATION, "Medication Initiated", "Prescribed cardiac medications initiated", "💊", -timedelta(days=1, hours=12)),
        (TimelineEventType.LAB_REPORT, "Cardiac Biomarkers Received", "Troponin T: 0.85 ng/mL, BNP: 420 pg/mL", "🔬", -timedelta(days=1, hours=4)),
        (TimelineEventType.ECG, "12-Lead ECG Completed", "Sinus rhythm with ST depression in V4-V6", "📈", -timedelta(hours=18)),
        (TimelineEventType.NURSE_CHECK, "Routine Vitals Logged", "Blood pressure and pulse checked", "👩‍⚕️", -timedelta(hours=2)),
    ]
    for evt_type, title, desc, icon, delta in events:
        event = TimelineEvent(
            patient_id=patient.id,
            event_type=evt_type,
            title=title,
            description=desc,
            icon=icon,
            event_at=datetime.utcnow() + delta,
        )
        db.add(event)


def _seed_chat(db: Session, patient: Patient, doctors: list, nurses: list):
    """Seed sample chat messages."""
    doc_id = doctors[0].id if doctors else 1
    nur_id = nurses[0].id if nurses else 1

    messages = [
        (doc_id, "Patient vitals showing mild ST elevation. Keep continuous telemetry active.", True),
        (nur_id, "Administered morning beta blocker. Patient resting comfortably.", False),
        (doc_id, "Please draw repeat Troponin levels at 14:00.", False),
    ]
    for sender_id, message, is_urgent in messages:
        msg = ChatMessage(
            patient_id=patient.id,
            sender_id=sender_id,
            message=message,
            message_type=MessageType.TEXT,
            is_urgent=is_urgent,
            created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 12)),
        )
        db.add(msg)


def _ensure_auxiliary_data(db: Session):
    """Ensure auxiliary records (appointments, audit logs, notifications) exist even in pre-existing databases."""
    users = db.query(User).all()
    patients = db.query(Patient).all()
    doctors = [u for u in users if u.role == UserRole.DOCTOR]

    if not patients or not doctors:
        return

    # Check and seed appointments if fewer than 5
    if db.query(Appointment).count() < 5:
        print("[SEED] Seeding demo appointments...")
        _seed_appointments(db, patients, doctors)
        db.commit()

    # Check and seed audit logs if fewer than 25
    if db.query(AuditLog).count() < 25:
        print("[SEED] Seeding comprehensive audit logs...")
        _seed_audit_logs(db, users, patients)
        db.commit()

    # Check and seed notifications
    if db.query(Notification).count() < 5:
        print("[SEED] Seeding demo notifications...")
        _seed_notifications(db, users, patients)
        db.commit()


