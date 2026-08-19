# -*- coding: utf-8 -*-
"""
Care Team Chat Model
=====================
Real-time messaging attached to patient records.
Participants: doctor, nurse, receptionist, caregiver, patient (limited).
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey, Boolean
)
from ..database import Base


class MessageType(str, enum.Enum):
    TEXT = "text"
    ALERT = "alert"
    SYSTEM = "system"
    IMAGE = "image"
    FILE = "file"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # ── Content ──
    message = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    attachment_path = Column(String(500), nullable=True)

    # ── Status ──
    is_urgent = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f"<ChatMessage patient={self.patient_id} sender={self.sender_id}>"
