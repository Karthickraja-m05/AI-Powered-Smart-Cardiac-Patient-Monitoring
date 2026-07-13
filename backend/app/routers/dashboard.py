# -*- coding: utf-8 -*-
"""
Dashboard Router
================
Admin, doctor, and nurse dashboard statistics.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient, PatientStatus
from ..models.alert import Alert, AlertSeverity
from ..models.prediction import Prediction
from ..models.symptom import SymptomRecord
from ..models.medication import Medication, MedicationStatus
from ..models.vitals import VitalSign
from ..schemas.dashboard_schema import DashboardStats, DashboardCharts, ChartDataPoint
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get hospital-wide dashboard statistics."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_patients = db.query(Patient).count()
    total_doctors = db.query(User).filter(User.role == UserRole.DOCTOR).count()
    total_nurses = db.query(User).filter(User.role == UserRole.NURSE).count()

    todays_admissions = db.query(Patient).filter(
        Patient.admission_date >= today_start
    ).count()

    icu_patients = db.query(Patient).filter(Patient.status == PatientStatus.ICU).count()
    discharged = db.query(Patient).filter(Patient.status == PatientStatus.DISCHARGED).count()

    # Risk distribution
    critical = db.query(Patient).filter(Patient.current_risk_level == "critical").count()
    high_risk = db.query(Patient).filter(Patient.current_risk_level == "high").count()
    medium_risk = db.query(Patient).filter(Patient.current_risk_level == "medium").count()
    low_risk = db.query(Patient).filter(Patient.current_risk_level == "low").count()

    # Symptom counts (from most recent symptom records)
    chest_pain = db.query(SymptomRecord).filter(SymptomRecord.chest_pain == True).distinct(SymptomRecord.patient_id).count()
    breathing = db.query(SymptomRecord).filter(
        (SymptomRecord.breathing_difficulty == True) | (SymptomRecord.shortness_of_breath == True)
    ).distinct(SymptomRecord.patient_id).count()
    fever_count = db.query(SymptomRecord).filter(SymptomRecord.fever == True).distinct(SymptomRecord.patient_id).count()

    # Emergency alerts today
    emergency_today = db.query(Alert).filter(
        Alert.triggered_at >= today_start,
        Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]),
    ).count()

    # Missed medications
    missed_meds = db.query(Medication).filter(
        Medication.status == MedicationStatus.ACTIVE,
        Medication.doses_missed > 0,
    ).distinct(Medication.patient_id).count()

    # Bed occupancy
    admitted = db.query(Patient).filter(
        Patient.status.in_([PatientStatus.ADMITTED, PatientStatus.ICU, PatientStatus.EMERGENCY])
    ).count()
    total_beds = 100  # configurable
    occupancy = round((admitted / total_beds) * 100, 1) if total_beds > 0 else 0

    return DashboardStats(
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_nurses=total_nurses,
        todays_admissions=todays_admissions,
        icu_patients=icu_patients,
        critical_patients=critical,
        high_risk_patients=high_risk,
        medium_risk_patients=medium_risk,
        low_risk_patients=low_risk,
        patients_with_chest_pain=chest_pain,
        patients_with_breathing_problems=breathing,
        patients_with_fever=fever_count,
        patients_with_abnormal_ecg=0,  # Would need ECG analysis
        patients_missing_medication=missed_meds,
        emergency_cases_today=emergency_today,
        discharged_patients=discharged,
        total_beds=total_beds,
        occupied_beds=admitted,
        bed_occupancy_percentage=occupancy,
    )


@router.get("/charts", response_model=DashboardCharts)
def get_dashboard_charts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chart data for dashboard visualizations."""
    # Admissions trend (last 7 days)
    admissions_trend = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().replace(hour=0, minute=0, second=0) - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = db.query(Patient).filter(
            Patient.admission_date >= day,
            Patient.admission_date < next_day,
        ).count()
        admissions_trend.append(ChartDataPoint(
            label=day.strftime("%b %d"),
            value=count,
        ))

    # Risk distribution
    risk_dist = []
    for level in ["low", "medium", "high", "critical"]:
        count = db.query(Patient).filter(Patient.current_risk_level == level).count()
        risk_dist.append(ChartDataPoint(label=level.title(), value=count))

    # Hourly emergencies (last 24 hours)
    hourly_emergencies = []
    for i in range(23, -1, -1):
        hour_start = datetime.utcnow().replace(minute=0, second=0) - timedelta(hours=i)
        hour_end = hour_start + timedelta(hours=1)
        count = db.query(Alert).filter(
            Alert.triggered_at >= hour_start,
            Alert.triggered_at < hour_end,
            Alert.severity.in_([AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]),
        ).count()
        hourly_emergencies.append(ChartDataPoint(
            label=hour_start.strftime("%H:00"),
            value=count,
        ))

    return DashboardCharts(
        admissions_trend=admissions_trend,
        risk_distribution=risk_dist,
        hourly_emergencies=hourly_emergencies,
        monthly_trends=[],
    )


@router.get("/alerts")
def get_recent_alerts(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent unacknowledged alerts."""
    alerts = (
        db.query(Alert)
        .filter(Alert.is_acknowledged == False)
        .order_by(Alert.triggered_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "alert_type": a.alert_type.value,
            "severity": a.severity.value,
            "title": a.title,
            "message": a.message,
            "triggered_at": a.triggered_at.isoformat(),
        }
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"message": "Alert acknowledged"}
