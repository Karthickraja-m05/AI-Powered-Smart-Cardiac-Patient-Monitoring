# -*- coding: utf-8 -*-
"""
Vitals Router
=============
Record, query vital signs, and broadcast real-time telemetry over WebSockets.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.vitals import VitalSign, VitalSource
from ..models.patient import Patient
from ..schemas.vitals_schema import VitalSignCreate, VitalSignResponse, IoTDataPayload
from ..services.auth_service import get_current_user
from ..services.alert_service import check_vitals_and_alert
from ..services.websocket_manager import ws_manager, trigger_background_broadcast

router = APIRouter(prefix="/api/vitals", tags=["Vital Signs"])


@router.post("", response_model=VitalSignResponse, status_code=201)
@router.post("/", response_model=VitalSignResponse, status_code=201, include_in_schema=False)
def record_vitals(
    data: VitalSignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a new vital sign reading and check for alerts."""
    vital = VitalSign(
        patient_id=data.patient_id,
        heart_rate=data.heart_rate,
        spo2=data.spo2,
        temperature=data.temperature,
        bp_systolic=data.bp_systolic,
        bp_diastolic=data.bp_diastolic,
        respiratory_rate=data.respiratory_rate,
        pulse=data.pulse,
        ecg_data=data.ecg_data,
        ecg_interpretation=data.ecg_interpretation,
        activity_level=data.activity_level,
        sleep_status=data.sleep_status,
        stress_level=data.stress_level,
        pain_level=data.pain_level,
        source=VitalSource(data.source) if data.source else VitalSource.MANUAL,
        device_id=data.device_id or "CLINICAL-STATION",
        recorded_by=current_user.id,
        notes=data.notes,
        recorded_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)

    # Check for alert conditions and intelligently route
    alerts = check_vitals_and_alert(db, data.patient_id, vital)

    vital_resp = VitalSignResponse.model_validate(vital)
    # Broadcast live update to subscribers
    trigger_background_broadcast("vital_update", {
        "patient_id": data.patient_id,
        "vital": vital_resp.model_dump(mode="json"),
    })

    return vital_resp


@router.get("/{patient_id}", response_model=List[VitalSignResponse])
def get_vitals(
    patient_id: int,
    hours: Optional[int] = Query(24, description="Hours of history to return"),
    limit: Optional[int] = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get vital sign history for a patient."""
    q = db.query(VitalSign).filter(VitalSign.patient_id == patient_id)

    if hours:
        since = datetime.utcnow() - timedelta(hours=hours)
        q = q.filter(VitalSign.recorded_at >= since)

    vitals = q.order_by(VitalSign.recorded_at.desc()).limit(limit).all()
    return [VitalSignResponse.model_validate(v) for v in vitals]


@router.get("/{patient_id}/latest", response_model=Optional[VitalSignResponse])
def get_latest_vitals(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent vital sign reading for a patient."""
    vital = (
        db.query(VitalSign)
        .filter(VitalSign.patient_id == patient_id)
        .order_by(VitalSign.recorded_at.desc())
        .first()
    )
    if not vital:
        return None
    return VitalSignResponse.model_validate(vital)


@router.post("/iot", status_code=201)
async def ingest_iot_data(
    data: IoTDataPayload,
    db: Session = Depends(get_db),
):
    """Ingest vital sign telemetry from medical instruments or IoT prototype nodes."""
    vital = VitalSign(
        patient_id=data.patient_id,
        heart_rate=data.heart_rate,
        spo2=data.spo2,
        temperature=data.temperature,
        bp_systolic=data.bp_systolic,
        bp_diastolic=data.bp_diastolic,
        respiratory_rate=data.respiratory_rate,
        ecg_data=data.ecg_data,
        source=VitalSource.IOT_ESP32,
        device_id=data.device_id,
        recorded_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)

    # Check for alerts & route
    alerts = check_vitals_and_alert(db, data.patient_id, vital)

    vital_resp = VitalSignResponse.model_validate(vital)
    # Broadcast to patient and global listeners
    await ws_manager.broadcast_patient_vitals(data.patient_id, vital_resp.model_dump(mode="json"))
    await ws_manager.broadcast_json("vital_stream", {
        "patient_id": data.patient_id,
        "heart_rate": vital.heart_rate,
        "spo2": vital.spo2,
        "bp_systolic": vital.bp_systolic,
        "bp_diastolic": vital.bp_diastolic,
        "temperature": vital.temperature,
        "timestamp": vital.recorded_at.isoformat(),
    })

    return {
        "status": "ok",
        "vital_id": vital.id,
        "alerts_triggered": len(alerts),
    }


@router.websocket("/ws/{patient_id}")
async def vitals_websocket(websocket: WebSocket, patient_id: int):
    """WebSocket endpoint for real-time vital sign streaming per patient."""
    await ws_manager.connect_patient(websocket, patient_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_patient(websocket, patient_id)
