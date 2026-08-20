# -*- coding: utf-8 -*-
"""
CardioSense AI — Main Application
==================================
AI-Powered Smart Cardiac Patient Monitoring & Clinical Decision Support System.

⚕️ DISCLAIMER: This is a clinical decision support tool.
   It does NOT diagnose medical conditions.
   All results must be reviewed by licensed clinicians.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from typing import Optional

from .config import settings
from .database import init_db
from .services.websocket_manager import ws_manager
from .routers import (
    auth, patients, vitals, predictions, symptoms, medications, dashboard,
    hospitals, doctor_availability, shifts, transfers, chat, visitors,
    ratings, audit, documents, timeline, role_dashboards, load_balancer,
    appointments, clinical_intelligence, notifications,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # ── Startup ──
    print("=" * 60)
    print(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
    print("  Hospital Intelligence Platform")
    print("=" * 60)
    print()

    # Initialize database
    init_db()
    print("[OK] Database initialized")

    # Seed demo data if database is empty or missing auxiliary tables
    from .seed import seed_demo_data
    seed_demo_data()

    print()
    print(f"[OK] Server starting at http://{settings.HOST}:{settings.PORT}")
    print(f"[OK] API docs at http://localhost:{settings.PORT}/docs")
    print()
    print("   DISCLAIMER: Clinical decision support tool only.")
    print("   Results must be reviewed by licensed clinicians.")
    print()

    yield

    # ── Shutdown ──
    print("[INFO] Server shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "CardioSense AI — AI-Powered Smart Cardiac Patient Monitoring "
        "& Clinical Decision Support System.\n\n"
        "**⚕️ MEDICAL DISCLAIMER**: This is a clinical decision support tool. "
        "It does NOT diagnose medical conditions or replace professional medical judgment. "
        "All AI predictions and risk assessments must be reviewed and validated by licensed healthcare professionals. "
        "Do NOT make treatment decisions based solely on this system's outputs."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Static Files ──
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Frontend and Dashboard directory paths
workspace_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dist_dir = os.path.join(workspace_dir, "frontend", "dist")
dashboard_dir = os.path.join(workspace_dir, "dashboard")

# Mount assets if they exist
assets_dir = os.path.join(frontend_dist_dir, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Mount offline dashboard at /cardiotrack
if os.path.exists(dashboard_dir):
    app.mount("/cardiotrack", StaticFiles(directory=dashboard_dir, html=True), name="cardiotrack")

# ── Include Routers — Core & Hospital Intelligence ──
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(vitals.router)
app.include_router(predictions.router)
app.include_router(symptoms.router)
app.include_router(medications.router)
app.include_router(dashboard.router)
app.include_router(hospitals.router)
app.include_router(doctor_availability.router)
app.include_router(shifts.router)
app.include_router(transfers.router)
app.include_router(chat.router)
app.include_router(visitors.router)
app.include_router(ratings.router)
app.include_router(audit.router)
app.include_router(documents.router)
app.include_router(timeline.router)
app.include_router(role_dashboards.router)
app.include_router(load_balancer.router)
app.include_router(appointments.router)
app.include_router(clinical_intelligence.router)
app.include_router(notifications.router)


# ── Global Live Broadcast WebSocket Endpoints ──
@app.websocket("/api/ws/live")
@app.websocket("/ws/live")
async def live_broadcast_websocket(websocket: WebSocket, user_id: Optional[int] = Query(None)):
    """Global WebSocket endpoint for real-time emergency alerts and multi-role dashboard synchronization."""
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            # Handle client heartbeats / messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)
    except Exception:
        ws_manager.disconnect(websocket, user_id)


@app.websocket("/api/vitals/ws/{patient_id}")
@app.websocket("/vitals/ws/{patient_id}")
async def patient_vitals_websocket(websocket: WebSocket, patient_id: int):
    """Patient-specific telemetry WebSocket stream."""
    await ws_manager.connect_patient(websocket, patient_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_patient(websocket, patient_id)
    except Exception:
        ws_manager.disconnect_patient(websocket, patient_id)



# ── Root Endpoint & SPA Fallback ──
@app.get("/", tags=["Frontend"])
def read_root():
    index_file = os.path.join(frontend_dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "disclaimer": (
            "This is an AI-assisted clinical decision support tool. "
            "It does NOT diagnose medical conditions. "
            "All results must be reviewed by licensed clinicians."
        ),
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


# SPA Fallback for other frontend routes
@app.get("/{catchall:path}", tags=["Frontend"])
def read_fallback(catchall: str):
    if catchall.startswith("api/") or catchall in ("docs", "redoc", "openapi.json"):
        return {"detail": "Not Found"}
    
    index_file = os.path.join(frontend_dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    return {"detail": "Not Found"}
