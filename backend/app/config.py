# -*- coding: utf-8 -*-
"""
Application Configuration
=========================
Pydantic Settings for the Cardiac Monitoring Platform.
Loads from environment variables / .env file.
"""

import os
from typing import List, Union

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──
    APP_NAME: str = "CardioSense AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Database ──
    DATABASE_URL: str = Field(
        default="sqlite:///./cardiosense.db",
        description="SQLAlchemy database URL. Use postgresql://user:pass@host/db for production.",
    )

    # ── JWT ──
    JWT_SECRET_KEY: str = "cardiosense-super-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # ── CORS ──
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"]

    # ── File Uploads ──
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── MQTT (IoT) ──
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "cardiosense/devices"

    # ── Notifications ──
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "alerts@cardiosense.ai"

    # ── Alert Thresholds ──
    ALERT_HR_LOW: int = 40
    ALERT_HR_HIGH: int = 150
    ALERT_SPO2_LOW: int = 90
    ALERT_TEMP_HIGH: float = 39.5
    ALERT_BP_SYS_HIGH: int = 180
    ALERT_BP_SYS_LOW: int = 80
    ALERT_BP_DIA_HIGH: int = 120
    ALERT_RESP_LOW: int = 8
    ALERT_RESP_HIGH: int = 30

    # ── Hourly Logger ──
    HOURLY_LOG_ENABLED: bool = True
    HOURLY_LOG_INTERVAL_MINUTES: int = 60

    # ── ML Model ──
    MODEL_PATH: str = "ml/models/best_model.pkl"
    SCALER_PATH: str = "ml/models/scaler.pkl"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
