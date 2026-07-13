# -*- coding: utf-8 -*-
"""
Notification Model
==================
Multi-channel notification records (email, SMS, push).
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey
)
from ..database import Base


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ── Recipient ──
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.IN_APP)

    # ── Content ──
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(Text, nullable=True)  # JSON payload

    # ── Related Entities ──
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)

    # ── Status ──
    is_sent = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Notification to={self.recipient_id} channel={self.channel.value} sent={self.is_sent}>"
