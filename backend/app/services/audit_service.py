# -*- coding: utf-8 -*-
"""
Audit Service
=============
Unified audit logging helper ensuring every critical hospital transaction
and security event is recorded with complete metadata.
"""

from datetime import datetime
from typing import Optional, Dict, Any, Union
from sqlalchemy.orm import Session

from ..models.user import User
from ..models.audit_log import AuditLog, AuditAction
from .websocket_manager import trigger_background_broadcast


def log_audit_event(
    db: Session,
    action: Union[AuditAction, str],
    entity_type: str,
    entity_id: Optional[int] = None,
    user: Optional[User] = None,
    username: Optional[str] = None,
    user_id: Optional[int] = None,
    description: Optional[str] = None,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    commit: bool = True,
) -> Optional[AuditLog]:
    """Create and persist an immutable audit log record."""
    try:
        # Convert string to enum if needed
        if isinstance(action, str):
            try:
                action_enum = AuditAction(action)
            except ValueError:
                action_enum = AuditAction.STATUS_CHANGE
        else:
            action_enum = action

        uid = user.id if user else user_id
        uname = user.username if user else (username or ("System" if not uid else f"User #{uid}"))

        log_entry = AuditLog(
            user_id=uid,
            username=uname,
            action=action_enum,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address or "127.0.0.1 (Internal)",
            user_agent=user_agent or "CardioSense System Gateway",
            created_at=datetime.utcnow(),
        )
        db.add(log_entry)
        if commit:
            db.commit()
            db.refresh(log_entry)

        # Broadcast live audit event over WebSocket
        trigger_background_broadcast("audit_logged", {
            "id": log_entry.id,
            "username": log_entry.username,
            "action": log_entry.action.value if hasattr(log_entry.action, "value") else str(log_entry.action),
            "entity_type": log_entry.entity_type,
            "entity_id": log_entry.entity_id,
            "description": log_entry.description,
            "created_at": log_entry.created_at.isoformat() if log_entry.created_at else datetime.utcnow().isoformat(),
        })

        return log_entry
    except Exception as e:
        print(f"[AUDIT] Failed to write audit log: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        return None
