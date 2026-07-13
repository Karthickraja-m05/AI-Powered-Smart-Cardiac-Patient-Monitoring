# -*- coding: utf-8 -*-
"""
Alert Service
=============
Monitors vital signs against clinical thresholds and triggers emergency alerts.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from ..config import settings
from ..models.alert import Alert, AlertType, AlertSeverity
from ..models.patient import Patient
from ..models.vitals import VitalSign


def check_vitals_and_alert(
    db: Session,
    patient_id: int,
    vitals: VitalSign,
) -> List[Alert]:
    """Check vital signs against thresholds and create alerts if needed."""
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
            alerts_created.append(_create_alert(
                db, patient_id, AlertType.HEART_RATE, AlertSeverity.CRITICAL,
                "Bradycardia Detected",
                f"Heart rate critically low: {vitals.heart_rate} bpm (threshold: <{settings.ALERT_HR_LOW} bpm)",
                vitals_snapshot, vitals.heart_rate, float(settings.ALERT_HR_LOW),
            ))
        elif vitals.heart_rate > settings.ALERT_HR_HIGH:
            alerts_created.append(_create_alert(
                db, patient_id, AlertType.HEART_RATE, AlertSeverity.CRITICAL,
                "Tachycardia Detected",
                f"Heart rate critically high: {vitals.heart_rate} bpm (threshold: >{settings.ALERT_HR_HIGH} bpm)",
                vitals_snapshot, vitals.heart_rate, float(settings.ALERT_HR_HIGH),
            ))

    # ── SpO₂ ──
    if vitals.spo2 is not None and vitals.spo2 < settings.ALERT_SPO2_LOW:
        severity = AlertSeverity.EMERGENCY if vitals.spo2 < 85 else AlertSeverity.CRITICAL
        alerts_created.append(_create_alert(
            db, patient_id, AlertType.SPO2, severity,
            "Hypoxemia Detected",
            f"SpO₂ dangerously low: {vitals.spo2}% (threshold: <{settings.ALERT_SPO2_LOW}%)",
            vitals_snapshot, vitals.spo2, float(settings.ALERT_SPO2_LOW),
        ))

    # ── Temperature ──
    if vitals.temperature is not None and vitals.temperature > settings.ALERT_TEMP_HIGH:
        severity = AlertSeverity.CRITICAL if vitals.temperature > 40.5 else AlertSeverity.WARNING
        alerts_created.append(_create_alert(
            db, patient_id, AlertType.TEMPERATURE, severity,
            "Hyperthermia Detected",
            f"Temperature elevated: {vitals.temperature}°C (threshold: >{settings.ALERT_TEMP_HIGH}°C)",
            vitals_snapshot, vitals.temperature, settings.ALERT_TEMP_HIGH,
        ))

    # ── Blood Pressure ──
    if vitals.bp_systolic is not None:
        if vitals.bp_systolic > settings.ALERT_BP_SYS_HIGH:
            alerts_created.append(_create_alert(
                db, patient_id, AlertType.BLOOD_PRESSURE, AlertSeverity.CRITICAL,
                "Hypertensive Crisis",
                f"Systolic BP critically high: {vitals.bp_systolic}/{vitals.bp_diastolic or '?'} mmHg",
                vitals_snapshot, float(vitals.bp_systolic), float(settings.ALERT_BP_SYS_HIGH),
            ))
        elif vitals.bp_systolic < settings.ALERT_BP_SYS_LOW:
            alerts_created.append(_create_alert(
                db, patient_id, AlertType.BLOOD_PRESSURE, AlertSeverity.CRITICAL,
                "Hypotension Detected",
                f"Systolic BP dangerously low: {vitals.bp_systolic}/{vitals.bp_diastolic or '?'} mmHg",
                vitals_snapshot, float(vitals.bp_systolic), float(settings.ALERT_BP_SYS_LOW),
            ))

    # ── Respiratory Rate ──
    if vitals.respiratory_rate is not None:
        if vitals.respiratory_rate < settings.ALERT_RESP_LOW:
            alerts_created.append(_create_alert(
                db, patient_id, AlertType.RESPIRATORY, AlertSeverity.CRITICAL,
                "Bradypnea Detected",
                f"Respiratory rate critically low: {vitals.respiratory_rate} breaths/min",
                vitals_snapshot, vitals.respiratory_rate, float(settings.ALERT_RESP_LOW),
            ))
        elif vitals.respiratory_rate > settings.ALERT_RESP_HIGH:
            alerts_created.append(_create_alert(
                db, patient_id, AlertType.RESPIRATORY, AlertSeverity.WARNING,
                "Tachypnea Detected",
                f"Respiratory rate elevated: {vitals.respiratory_rate} breaths/min",
                vitals_snapshot, vitals.respiratory_rate, float(settings.ALERT_RESP_HIGH),
            ))

    return alerts_created


def create_ai_risk_alert(
    db: Session,
    patient_id: int,
    risk_score: float,
    risk_level: str,
) -> Optional[Alert]:
    """Create alert for high AI risk score."""
    if risk_score >= 75:
        return _create_alert(
            db, patient_id, AlertType.AI_RISK, AlertSeverity.CRITICAL,
            "Critical Cardiovascular Risk",
            f"AI model predicts critical cardiovascular risk: {risk_score}% — Immediate clinical review recommended.",
            None, risk_score, 75.0, risk_score,
        )
    elif risk_score >= 50:
        return _create_alert(
            db, patient_id, AlertType.AI_RISK, AlertSeverity.WARNING,
            "Elevated Cardiovascular Risk",
            f"AI model predicts elevated cardiovascular risk: {risk_score}% — Clinical review recommended.",
            None, risk_score, 50.0, risk_score,
        )
    return None


def create_emergency_button_alert(db: Session, patient_id: int) -> Alert:
    """Create alert when emergency button is pressed."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    name = patient.full_name if patient else f"Patient #{patient_id}"
    ward = patient.ward or "Unknown"
    bed = patient.bed_number or "Unknown"

    return _create_alert(
        db, patient_id, AlertType.EMERGENCY_BUTTON, AlertSeverity.EMERGENCY,
        "🚨 Emergency Button Pressed",
        f"Emergency button pressed by {name} — Ward: {ward}, Bed: {bed}. Immediate response required!",
        None, None, None,
    )


def _create_alert(
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
    """Create and persist an alert."""
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
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
