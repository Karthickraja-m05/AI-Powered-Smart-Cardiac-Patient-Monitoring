# -*- coding: utf-8 -*-
"""
Audit Log Router
=================
View and search audit logs (admin-only).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.audit_log import AuditLog, AuditAction
from ..schemas.hip_schemas import AuditLogResponse
from ..services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


@router.get("", response_model=list[AuditLogResponse])
def get_audit_logs(
    action: str = Query(None),
    entity_type: str = Query(None),
    user_id: int = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
):
    """Get audit logs with filtering and pagination."""
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == AuditAction(action))
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return [AuditLogResponse.model_validate(log) for log in logs]


def create_audit_log(
    db: Session,
    user: User,
    action: AuditAction,
    entity_type: str,
    entity_id: int = None,
    description: str = None,
    old_value: dict = None,
    new_value: dict = None,
    ip_address: str = None,
):
    """Utility function to create an audit log entry."""
    log = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(log)
    # Don't commit here — let the caller handle the transaction
    return log
