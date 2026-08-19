# -*- coding: utf-8 -*-
"""
Audit Log Model
================
Records every significant action for compliance, traceability, and security.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey, JSON
)
from ..database import Base


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    VIEW = "view"
    DISCHARGE = "discharge"
    TRANSFER = "transfer"
    REASSIGN = "reassign"
    ADMINISTER_MED = "administer_med"
    ACKNOWLEDGE_ALERT = "acknowledge_alert"
    UPLOAD = "upload"
    STATUS_CHANGE = "status_change"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username = Column(String(100), nullable=True)  # denormalized for quick display

    # ── Action ──
    action = Column(Enum(AuditAction), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)   # "patient", "vitals", "medication", etc.
    entity_id = Column(Integer, nullable=True)

    # ── Details ──
    description = Column(Text, nullable=True)
    old_value = Column(JSON, nullable=True)  # snapshot before change
    new_value = Column(JSON, nullable=True)  # snapshot after change

    # ── Security ──
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog user={self.user_id} action={self.action.value} entity={self.entity_type}:{self.entity_id}>"
