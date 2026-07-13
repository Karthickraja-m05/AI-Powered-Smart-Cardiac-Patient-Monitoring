# -*- coding: utf-8 -*-
"""
Database Configuration
======================
SQLAlchemy engine, session factory, and base model class.
"""

# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, event
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings


# Handle SQLite-specific connect args
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Enable WAL mode for SQLite (better concurrent read performance)
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (called on application startup)."""
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
