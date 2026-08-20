# -*- coding: utf-8 -*-
"""
Emergency Alert Service & Intelligent Clinical Routing Engine
=============================================================
Monitors vital signs and AI risk scores, evaluates clinical thresholds,
and automatically routes emergency alerts to assigned doctors, nurses,
duty cardiologists, and shift supervisors in real-time.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..config import settings
from ..models.alert import Alert, AlertType, AlertSeverity
from ..models.patient import Patient
from ..models.user import User, UserRole
from ..models.vitals import VitalSign
from ..models.notification import Notification, NotificationChannel
from ..models.audit_log import AuditAction
from .audit_service import log_audit_event
from .websocket_manager import trigger_background_broadcast


def check_vitals_and_alert(
    db: Session,
    patient_id: int,
    vitals: VitalSign,
) -> List[Alert]:
    """Check vital signs against thresholds and route alerts if needed."""
    alerts_created = []

    vitals_snapshot = {
        "heart_rate": vitals.heart_rate,
        "spo2": vitals.spo2,
        "temperature": vitals.temperature,
        "bp_systolic": vitals.bp_systolic,
        "bp_diastolic": vitals.bp_diastolic,
        "respiratory_rate": vitals.respiratory_rate,
    }

    # ── Heart Rate ──
    if vitals.heart_rate is not None:
        if vitals.heart_rate < settings.ALERT_HR_LOW:
            alerts_created.append(_create_and_route_alert(
                db, patient_id, AlertType.HEART_RATE, AlertSeverity.CRITICAL,
                "Bradycardia Detected",
                f"Heart rate critically low: {vitals.heart_rate:.1f} bpm (threshold: <{settings.ALERT_HR_LOW} bpm)",
                vitals_snapshot, float(vitals.heart_rate), float(settings.ALERT_HR_LOW),
            ))
        elif vitals.heart_rate > settings.ALERT_HR_HIGH:
            alerts_created.append(_create_and_route_alert(
                db, patient_id, AlertType.HEART_RATE, AlertSeverity.CRITICAL,
                "Tachycardia Detected",
                f"Heart rate critically high: {vitals.heart_rate:.1f} bpm (threshold: >{settings.ALERT_HR_HIGH} bpm)",
                vitals_snapshot, float(vitals.heart_rate), float(settings.ALERT_HR_HIGH),
            ))

    # ── SpO₂ ──
    if vitals.spo2 is not None and vitals.spo2 < settings.ALERT_SPO2_LOW:
        severity = AlertSeverity.EMERGENCY if vitals.spo2 < 85 else AlertSeverity.CRITICAL
        alerts_created.append(_create_and_route_alert(
            db, patient_id, AlertType.SPO2, severity,
            "Hypoxemia Detected",
            f"SpO₂ dangerously low: {vitals.spo2:.1f}% (threshold: <{settings.ALERT_SPO2_LOW}%)",
            vitals_snapshot, float(vitals.spo2), float(settings.ALERT_SPO2_LOW),
        ))

    # ── Temperature ──
    if vitals.temperature is not None and vitals.temperature > settings.ALERT_TEMP_HIGH:
        severity = AlertSeverity.CRITICAL if vitals.temperature > 40.5 else AlertSeverity.WARNING
        alerts_created.append(_create_and_route_alert(
            db, patient_id, AlertType.TEMPERATURE, severity,
            "Hyperthermia Detected",
            f"Temperature elevated: {vitals.temperature:.1f}°C (threshold: >{settings.ALERT_TEMP_HIGH}°C)",
            vitals_snapshot, float(vitals.temperature), settings.ALERT_TEMP_HIGH,
        ))

    # ── Blood Pressure ──
    if vitals.bp_systolic is not None:
        if vitals.bp_systolic > settings.ALERT_BP_SYS_HIGH:
            alerts_created.append(_create_and_route_alert(
                db, patient_id, AlertType.BLOOD_PRESSURE, AlertSeverity.CRITICAL,
                "Hypertensive Crisis",
                f"Systolic BP critically high: {vitals.bp_systolic}/{vitals.bp_diastolic or '?'} mmHg (threshold: >{settings.ALERT_BP_SYS_HIGH})",
                vitals_snapshot, float(vitals.bp_systolic), float(settings.ALERT_BP_SYS_HIGH),
            ))
        elif vitals.bp_systolic < settings.ALERT_BP_SYS_LOW:
            alerts_created.append(_create_and_route_alert(
                db, patient_id, AlertType.BLOOD_PRESSURE, AlertSeverity.CRITICAL,
                "Hypotension Detected",
                f"Systolic BP dangerously low: {vitals.bp_systolic}/{vitals.bp_diastolic or '?'} mmHg (threshold: <{settings.ALERT_BP_SYS_LOW})",
                vitals_snapshot, float(vitals.bp_systolic), float(settings.ALERT_BP_SYS_LOW),
            ))

    # ── Respiratory Rate ──
    if vitals.respiratory_rate is not None:
        if vitals.respiratory_rate < settings.ALERT_RESP_LOW:
            alerts_created.append(_create_and_route_alert(
                db, patient_id, AlertType.RESPIRATORY, AlertSeverity.CRITICAL,
                "Bradypnea Detected",
                f"Respiratory rate critically low: {vitals.respiratory_rate:.1f} breaths/min (threshold: <{settings.ALERT_RESP_LOW})",
                vitals_snapshot, float(vitals.respiratory_rate), float(settings.ALERT_RESP_LOW),
            ))
        elif vitals.respiratory_rate > settings.ALERT_RESP_HIGH:
            alerts_created.append(_create_and_route_alert(
                db, patient_id, AlertType.RESPIRATORY, AlertSeverity.WARNING,
                "Tachypnea Detected",
                f"Respiratory rate elevated: {vitals.respiratory_rate:.1f} breaths/min (threshold: >{settings.ALERT_RESP_HIGH})",
                vitals_snapshot, float(vitals.respiratory_rate), float(settings.ALERT_RESP_HIGH),
            ))

    return [a for a in alerts_created if a is not None]


def create_ai_risk_alert(
    db: Session,
    patient_id: int,
    risk_score: float,
    risk_level: str,
) -> Optional[Alert]:
    """Create and automatically route alert for elevated AI risk score."""
    if risk_score >= 75:
        return _create_and_route_alert(
            db, patient_id, AlertType.AI_RISK, AlertSeverity.CRITICAL,
            "Critical Cardiovascular Risk",
            f"AI model predicts critical cardiovascular risk: {risk_score:.1f}% — Immediate physician review required.",
            None, risk_score, 75.0, risk_score,
        )
    elif risk_score >= 50:
        return _create_and_route_alert(
            db, patient_id, AlertType.AI_RISK, AlertSeverity.WARNING,
            "Elevated Cardiovascular Risk",
            f"AI model predicts elevated cardiovascular risk: {risk_score:.1f}% — Clinical review recommended.",
            None, risk_score, 50.0, risk_score,
        )
    return None


def create_emergency_button_alert(db: Session, patient_id: int) -> Alert:
    """Create and broadcast alert when emergency button is pressed."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    name = patient.full_name if patient else f"Patient #{patient_id}"
    ward = patient.ward or "ICU"
    bed = patient.bed_number or "Bed 1"

    return _create_and_route_alert(
        db, patient_id, AlertType.EMERGENCY_BUTTON, AlertSeverity.EMERGENCY,
        "🚨 Bedside Emergency Panic Button",
        f"Emergency button pressed by {name} in {ward} ({bed}). Immediate bedside code response required!",
        None, None, None,
    )


def _create_and_route_alert(
    db: Session,
    patient_id: int,
    alert_type: AlertType,
    severity: AlertSeverity,
    title: str,
    message: str,
    vitals_snapshot: Optional[Dict[str, Any]] = None,
    trigger_value: Optional[float] = None,
    threshold: Optional[float] = None,
    risk_score: Optional[float] = None,
) -> Alert:
    """Create, persist, intelligently route, and broadcast an emergency alert."""
    # 1. Create and persist Alert record
    alert = Alert(
        patient_id=patient_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        vitals_snapshot=vitals_snapshot,
        trigger_value=trigger_value,
        threshold=threshold,
        risk_score=risk_score,
        is_acknowledged=False,
        is_resolved=False,
        triggered_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # 2. Identify clinical recipients based on role, assignment, and severity
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    patient_name = patient.full_name if patient else f"Patient #{patient_id}"
    ward = patient.ward if patient else "Ward"
    bed = patient.bed_number if patient else "Bed"

    recipient_ids: Set[int] = set()

    if patient:
        if patient.assigned_doctor_id:
            recipient_ids.add(patient.assigned_doctor_id)
        if patient.assigned_nurse_id:
            recipient_ids.add(patient.assigned_nurse_id)

    # For Critical or Emergency: also alert on-duty cardiologists & supervisors
    if severity in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY]:
        # Duty cardiologists
        cardiologists = db.query(User).filter(
            User.role == UserRole.DOCTOR,
            User.is_active == True,
            or_(
                User.department.ilike("%cardio%"),
                User.specialization.ilike("%cardio%"),
            )
        ).all()
        for doc in cardiologists:
            recipient_ids.add(doc.id)

        # Supervisors and Admins
        admins = db.query(User).filter(
            User.role.in_([UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN]),
            User.is_active == True,
        ).all()
        for adm in admins:
            recipient_ids.add(adm.id)

    # 3. Create persistent Notification records for all recipients
    for user_id in recipient_ids:
        notification = Notification(
            recipient_id=user_id,
            channel=NotificationChannel.IN_APP,
            title=f"🚨 {severity.value.upper()}: {title}",
            message=f"{patient_name} ({ward} / {bed}): {message}",
            patient_id=patient_id,
            alert_id=alert.id,
            is_sent=True,
            is_read=False,
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(notification)

    db.commit()

    # 4. Audit Log entry
    log_audit_event(
        db=db,
        action=AuditAction.EMERGENCY_ALERT,
        entity_type="alert",
        entity_id=alert.id,
        description=f"[{severity.value.upper()}] {title} triggered for {patient_name} ({ward}/{bed}): {message}",
        new_value={
            "patient_id": patient_id,
            "patient_name": patient_name,
            "severity": severity.value,
            "alert_type": alert_type.value,
            "trigger_value": trigger_value,
            "threshold": threshold,
            "recipients_count": len(recipient_ids),
        },
    )

    # 5. Broadcast in real time to connected WebSocket dashboards
    alert_payload = {
        "id": alert.id,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "patient_uid": patient.patient_uid if patient else f"PAT-{patient_id}",
        "ward": ward,
        "bed": bed,
        "alert_type": alert.alert_type.value,
        "severity": alert.severity.value,
        "title": alert.title,
        "message": alert.message,
        "trigger_value": trigger_value,
        "threshold": threshold,
        "risk_score": risk_score,
        "vitals_snapshot": vitals_snapshot,
        "triggered_at": alert.triggered_at.isoformat(),
        "is_acknowledged": False,
        "is_resolved": False,
    }
    trigger_background_broadcast("emergency_alert", alert_payload)

    return alert


def escalate_alert(
    db: Session,
    alert_id: int,
    user: User,
    escalation_reason: Optional[str] = None,
) -> Optional[Alert]:
    """Escalate an unacknowledged or severe alert to head cardiologist and hospital admins."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None

    patient = db.query(Patient).filter(Patient.id == alert.patient_id).first()
    patient_name = patient.full_name if patient else f"Patient #{alert.patient_id}"

    alert.severity = AlertSeverity.EMERGENCY
    alert.resolution_notes = f"ESCALATED by {user.full_name} ({user.role.value}): {escalation_reason or 'Urgent supervisor intervention required.'}"
    db.commit()
    db.refresh(alert)

    # Create notifications for all admins and cardiologists
    supervisors = db.query(User).filter(
        User.role.in_([UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR]),
        User.is_active == True,
    ).all()

    for sup in supervisors:
        notif = Notification(
            recipient_id=sup.id,
            channel=NotificationChannel.IN_APP,
            title=f"🚨 ESCALATED EMERGENCY: {alert.title}",
            message=f"{patient_name} in {patient.ward or 'Ward'} needs immediate escalation. Reason: {escalation_reason or 'No response within timeout'}",
            patient_id=alert.patient_id,
            alert_id=alert.id,
            is_sent=True,
            is_read=False,
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.add(notif)
    db.commit()

    # Log escalation
    log_audit_event(
        db=db,
        action=AuditAction.ESCALATE_ALERT,
        entity_type="alert",
        entity_id=alert.id,
        user=user,
        description=f"Alert #{alert.id} ESCALATED for {patient_name} by {user.full_name}: {escalation_reason or 'Emergency escalation'}",
    )

    # Broadcast escalation event
    trigger_background_broadcast("alert_escalated", {
        "id": alert.id,
        "patient_id": alert.patient_id,
        "patient_name": patient_name,
        "severity": "emergency",
        "title": f"🚨 ESCALATED: {alert.title}",
        "message": alert.resolution_notes,
        "escalated_by": user.full_name,
        "triggered_at": datetime.utcnow().isoformat(),
    })

    return alert


# For backwards compatibility with other modules
_create_alert = _create_and_route_alert
