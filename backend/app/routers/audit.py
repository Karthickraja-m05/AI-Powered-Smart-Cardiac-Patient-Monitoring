# -*- coding: utf-8 -*-
"""
Audit Log Router
=================
View, search, summarize, and export tamper-evident audit logs (admin and authorized staff).
"""

import io
import csv
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from ..database import get_db
from ..models.user import User, UserRole
from ..models.audit_log import AuditLog, AuditAction
from ..schemas.hip_schemas import AuditLogResponse
from ..services.auth_service import get_current_user, require_roles
from ..services.audit_service import log_audit_event

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
@router.get("/", response_model=List[AuditLogResponse], include_in_schema=False)
def get_audit_logs(
    search: Optional[str] = Query(None, description="Search keyword in description, username, or entity"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (patient, vitals, alert, etc.)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    days: Optional[int] = Query(None, description="Filter records within last N days"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR)),
):
    """Get audit logs with comprehensive search, filtering and pagination."""
    q = db.query(AuditLog)

    if action:
        try:
            action_enum = AuditAction(action)
            q = q.filter(AuditLog.action == action_enum)
        except ValueError:
            q = q.filter(func.lower(AuditLog.action).like(f"%{action.lower()}%"))

    if entity_type:
        q = q.filter(func.lower(AuditLog.entity_type) == entity_type.lower())

    if user_id:
        q = q.filter(AuditLog.user_id == user_id)

    if days:
        since = datetime.utcnow() - timedelta(days=days)
        q = q.filter(AuditLog.created_at >= since)

    if search:
        search_pattern = f"%{search.strip()}%"
        q = q.filter(
            or_(
                AuditLog.description.ilike(search_pattern),
                AuditLog.username.ilike(search_pattern),
                AuditLog.entity_type.ilike(search_pattern),
                AuditLog.ip_address.ilike(search_pattern),
            )
        )

    logs = q.order_by(desc(AuditLog.created_at)).offset((page - 1) * per_page).limit(per_page).all()
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.get("/summary")
def get_audit_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
):
    """Get high-level summary statistics of audit entries."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_logs = db.query(AuditLog).count()
    today_logs = db.query(AuditLog).filter(AuditLog.created_at >= today_start).count()
    login_events = db.query(AuditLog).filter(AuditLog.action.in_([AuditAction.LOGIN, AuditAction.LOGOUT])).count()
    emergency_events = db.query(AuditLog).filter(
        AuditLog.action.in_([AuditAction.EMERGENCY_ALERT, AuditAction.ACKNOWLEDGE_ALERT, AuditAction.RESOLVE_ALERT, AuditAction.ESCALATE_ALERT])
    ).count()
    patient_actions = db.query(AuditLog).filter(AuditLog.entity_type == "patient").count()

    # Recent 5 entries
    recent = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(5).all()

    return {
        "total_audit_logs": total_logs,
        "today_activity_count": today_logs,
        "security_auth_count": login_events,
        "emergency_dispatch_count": emergency_events,
        "patient_lifecycle_actions": patient_actions,
        "recent_logs": [AuditLogResponse.model_validate(r) for r in recent],
    }


@router.get("/export")
def export_audit_logs_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
):
    """Export all audit logs to a downloadable CSV spreadsheet."""
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp (UTC)", "User", "Action", "Entity Type", "Entity ID", "Description", "IP Address"])

    for log in logs:
        action_val = log.action.value if hasattr(log.action, "value") else str(log.action)
        writer.writerow([
            log.id,
            log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
            log.username or f"User #{log.user_id or 'System'}",
            action_val,
            log.entity_type,
            log.entity_id or "",
            log.description or "",
            log.ip_address or "",
        ])

    output.seek(0)
    filename = f"cardiosense_audit_trail_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# Retain backwards compatibility for any direct router imports
create_audit_log = log_audit_event
