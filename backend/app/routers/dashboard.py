# -*- coding: utf-8 -*-
"""
Dashboard Router
================
Admin, doctor, nurse statistics, rich clinical emergency alerts,
and multi-tier alert acknowledgment, escalation, and resolution.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..models.user import User, UserRole
from ..models.patient import Patient, PatientStatus
from ..models.alert import Alert, AlertSeverity, AlertType
from ..models.prediction import Prediction
from ..models.symptom import SymptomRecord
from ..models.medication import Medication, MedicationStatus
from ..models.vitals import VitalSign
from ..models.audit_log import AuditAction
from ..schemas.dashboard_schema import DashboardStats, DashboardCharts, ChartDataPoint
from ..services.auth_service import get_current_user
from ..services.audit_service import log_audit_event
from ..services.websocket_manager import trigger_background_broadcast
from ..services.alert_service import escalate_alert as service_escalate_alert, create_emergency_button_alert

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

    # Symptom counts
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
    total_beds = 100
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
        patients_with_abnormal_ecg=0,
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

    risk_dist = []
    for level in ["low", "medium", "high", "critical"]:
        count = db.query(Patient).filter(Patient.current_risk_level == level).count()
        risk_dist.append(ChartDataPoint(label=level.title(), value=count))

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
    limit: int = 30,
    include_acknowledged: bool = False,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent alerts with full patient and clinical context."""
    q = db.query(Alert)
    if not include_acknowledged:
        q = q.filter(Alert.is_resolved == False)
    if severity:
        try:
            q = q.filter(Alert.severity == AlertSeverity(severity))
        except ValueError:
            pass

    alerts = q.order_by(desc(Alert.triggered_at)).limit(limit).all()

    result = []
    for a in alerts:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        ack_user = db.query(User).filter(User.id == a.acknowledged_by).first() if a.acknowledged_by else None

        result.append({
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": patient.full_name if patient else f"Patient #{a.patient_id}",
            "patient_uid": patient.patient_uid if patient else None,
            "ward": patient.ward if patient else "Ward",
            "room_number": patient.room_number if patient else "Room",
            "bed_number": patient.bed_number if patient else "Bed",
            "alert_type": a.alert_type.value if hasattr(a.alert_type, "value") else str(a.alert_type),
            "severity": a.severity.value if hasattr(a.severity, "value") else str(a.severity),
            "title": a.title,
            "message": a.message,
            "vitals_snapshot": a.vitals_snapshot,
            "trigger_value": a.trigger_value,
            "threshold": a.threshold,
            "risk_score": a.risk_score,
            "is_acknowledged": a.is_acknowledged,
            "acknowledged_by_name": ack_user.full_name if ack_user else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "resolution_notes": a.resolution_notes,
            "is_resolved": a.is_resolved,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "triggered_at": a.triggered_at.isoformat() if a.triggered_at else datetime.utcnow().isoformat(),
        })

    return result


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    notes: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Acknowledge an emergency alert and create audit log entry."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    patient = db.query(Patient).filter(Patient.id == alert.patient_id).first()
    p_name = patient.full_name if patient else f"Patient #{alert.patient_id}"

    alert.is_acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    if notes:
        alert.resolution_notes = f"Acknowledged by {current_user.full_name}: {notes}"
    db.commit()

    # Log to audit trail
    log_audit_event(
        db=db,
        action=AuditAction.ACKNOWLEDGE_ALERT,
        entity_type="alert",
        entity_id=alert.id,
        user=current_user,
        description=f"Alert #{alert.id} ({alert.title}) ACKNOWLEDGED by {current_user.full_name} ({current_user.role.value}) for {p_name}. Notes: {notes or 'Under active clinical evaluation'}",
        new_value={"alert_id": alert.id, "acknowledged_by": current_user.id, "acknowledged_at": alert.acknowledged_at.isoformat()},
    )

    # Broadcast acknowledgment update
    trigger_background_broadcast("alert_acknowledged", {
        "id": alert.id,
        "patient_id": alert.patient_id,
        "is_acknowledged": True,
        "acknowledged_by_name": current_user.full_name,
        "acknowledged_at": alert.acknowledged_at.isoformat(),
    })

    return {"message": "Alert acknowledged successfully", "alert_id": alert.id}


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    resolution_notes: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark an alert as clinically resolved and record clinical actions taken."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    patient = db.query(Patient).filter(Patient.id == alert.patient_id).first()
    p_name = patient.full_name if patient else f"Patient #{alert.patient_id}"

    alert.is_resolved = True
    alert.is_acknowledged = True
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = f"RESOLVED by {current_user.full_name}: {resolution_notes or 'Patient stabilized under protocol.'}"
    db.commit()

    # Log to audit trail
    log_audit_event(
        db=db,
        action=AuditAction.RESOLVE_ALERT,
        entity_type="alert",
        entity_id=alert.id,
        user=current_user,
        description=f"Alert #{alert.id} ({alert.title}) RESOLVED for {p_name} by {current_user.full_name}. Resolution: {resolution_notes or 'Patient stabilized.'}",
    )

    # Broadcast resolution update
    trigger_background_broadcast("alert_resolved", {
        "id": alert.id,
        "patient_id": alert.patient_id,
        "is_resolved": True,
        "resolved_at": alert.resolved_at.isoformat(),
        "resolved_by_name": current_user.full_name,
    })

    return {"message": "Alert resolved successfully", "alert_id": alert.id}


@router.post("/alerts/{alert_id}/escalate")
def trigger_alert_escalation(
    alert_id: int,
    reason: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Escalate an unacknowledged or deterioriating patient alert to chief cardiologist & admin."""
    alert = service_escalate_alert(db, alert_id, current_user, reason)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert escalated to senior emergency tier", "alert_id": alert.id}


@router.post("/alerts/panic")
def trigger_panic_button(
    patient_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger bedside panic button alarm."""
    alert = create_emergency_button_alert(db, patient_id)
    return {"message": "Emergency broadcast triggered", "alert_id": alert.id}
