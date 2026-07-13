# -*- coding: utf-8 -*-
"""Alert Schemas."""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: int
    patient_id: int
    alert_type: str
    severity: str
    title: str
    message: str
    vitals_snapshot: Optional[Dict[str, Any]] = None
    trigger_value: Optional[float] = None
    threshold: Optional[float] = None
    risk_score: Optional[float] = None
    is_acknowledged: bool
    acknowledged_by: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    triggered_at: datetime

    class Config:
        from_attributes = True


class AlertAcknowledge(BaseModel):
    resolution_notes: Optional[str] = None
