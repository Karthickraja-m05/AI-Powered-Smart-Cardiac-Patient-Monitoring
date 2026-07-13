# -*- coding: utf-8 -*-
"""
Vitals Router
=============
Record, query vital signs. WebSocket for real-time streaming.
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import json

from ..database import get_db
from ..models.user import User
from ..models.vitals import VitalSign, VitalSource
from ..schemas.vitals_schema import VitalSignCreate, VitalSignResponse, IoTDataPayload
from ..services.auth_service import get_current_user
from ..services.alert_service import check_vitals_and_alert

router = APIRouter(prefix="/api/vitals", tags=["Vital Signs"])

# WebSocket connections for real-time monitoring
active_connections: dict[int, list[WebSocket]] = {}


@router.post("", response_model=VitalSignResponse, status_code=201)
def record_vitals(
    data: VitalSignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a new vital sign reading."""
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
        device_id=data.device_id,
        recorded_by=current_user.id,
        notes=data.notes,
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)

    # Check for alert conditions
    check_vitals_and_alert(db, data.patient_id, vital)

    return VitalSignResponse.model_validate(vital)


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
    """Ingest vital sign data from ESP32 IoT devices (no auth required for devices)."""
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
    )
    db.add(vital)
    db.commit()
    db.refresh(vital)

    # Check for alerts
    alerts = check_vitals_and_alert(db, data.patient_id, vital)

    # Broadcast to WebSocket clients
    await _broadcast_vital(data.patient_id, VitalSignResponse.model_validate(vital))

    return {
        "status": "ok",
        "vital_id": vital.id,
        "alerts_triggered": len(alerts),
    }


async def _broadcast_vital(patient_id: int, vital_data: VitalSignResponse):
    """Broadcast vital sign update to WebSocket clients."""
    if patient_id in active_connections:
        message = json.dumps(vital_data.model_dump(mode="json"), default=str)
        disconnected = []
        for ws in active_connections[patient_id]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            active_connections[patient_id].remove(ws)


@router.websocket("/ws/{patient_id}")
async def vitals_websocket(websocket: WebSocket, patient_id: int):
    """WebSocket endpoint for real-time vital sign streaming."""
    await websocket.accept()

    if patient_id not in active_connections:
        active_connections[patient_id] = []
    active_connections[patient_id].append(websocket)

    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await websocket.receive_text()
            # Client can send "ping" to keep alive
    except WebSocketDisconnect:
        if patient_id in active_connections:
            active_connections[patient_id].remove(websocket)
