# -*- coding: utf-8 -*-
"""
Doctor Rating Model
====================
Post-discharge patient ratings for doctors across multiple dimensions.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, DateTime, Text, ForeignKey
)
from ..database import Base


class DoctorRating(Base):
    __tablename__ = "doctor_ratings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)

    # ── Rating Dimensions (1-5 scale) ──
    communication = Column(Float, nullable=False)   # 1.0 – 5.0
    treatment = Column(Float, nullable=False)        # 1.0 – 5.0
    availability = Column(Float, nullable=False)     # 1.0 – 5.0
    kindness = Column(Float, nullable=False)         # 1.0 – 5.0
    overall = Column(Float, nullable=False)          # 1.0 – 5.0

    # ── Feedback ──
    comment = Column(Text, nullable=True)
    is_anonymous = Column(Integer, default=0)  # 0 = named, 1 = anonymous

    # ── Timestamps ──
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<DoctorRating doctor={self.doctor_id} overall={self.overall}>"
