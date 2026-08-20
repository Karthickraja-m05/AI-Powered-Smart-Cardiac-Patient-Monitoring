# -*- coding: utf-8 -*-
"""
WebSocket Connection & Real-Time Broadcast Manager
===================================================
Manages persistent WebSocket connections for live vitals, emergency alerts,
appointment synchronization, and real-time dashboard notifications.
"""

import json
import asyncio
from typing import Dict, List, Set, Any, Optional
# pyrefly: ignore [missing-import]
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # General hospital-wide live broadcast connections
        self.active_connections: List[WebSocket] = []
        # Patient-specific telemetry stream connections: patient_id -> list of WebSockets
        self.patient_connections: Dict[int, List[WebSocket]] = {}
        # User-specific notification connections: user_id -> list of WebSockets
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        """Accept general hospital-wide live broadcast connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        """Disconnect general broadcast connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)

    async def connect_patient(self, websocket: WebSocket, patient_id: int):
        """Accept patient-specific telemetry stream connection."""
        await websocket.accept()
        if patient_id not in self.patient_connections:
            self.patient_connections[patient_id] = []
        self.patient_connections[patient_id].append(websocket)

    def disconnect_patient(self, websocket: WebSocket, patient_id: int):
        """Disconnect patient stream connection."""
        if patient_id in self.patient_connections:
            if websocket in self.patient_connections[patient_id]:
                self.patient_connections[patient_id].remove(websocket)

    async def broadcast_json(self, event_type: str, data: Any):
        """Broadcast an event to all connected dashboard clients."""
        payload = json.dumps({"event": event_type, "data": data}, default=str)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

    async def send_to_user(self, user_id: int, event_type: str, data: Any):
        """Send a real-time event to a specific user's active connections."""
        payload = json.dumps({"event": event_type, "data": data}, default=str)
        if user_id in self.user_connections:
            dead_connections = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                if dead in self.user_connections[user_id]:
                    self.user_connections[user_id].remove(dead)

    async def broadcast_patient_vitals(self, patient_id: int, data: Any):
        """Broadcast live telemetry data to subscribers of a specific patient."""
        payload = json.dumps({"event": "vitals_update", "patient_id": patient_id, "data": data}, default=str)
        if patient_id in self.patient_connections:
            dead_connections = []
            for connection in self.patient_connections[patient_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                if dead in self.patient_connections[patient_id]:
                    self.patient_connections[patient_id].remove(dead)


# Global singleton instance
ws_manager = ConnectionManager()


def trigger_background_broadcast(event_type: str, data: Any):
    """Safely fire an async broadcast from synchronous router or service functions."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ws_manager.broadcast_json(event_type, data))
        else:
            loop.run_until_complete(ws_manager.broadcast_json(event_type, data))
    except RuntimeError:
        pass
    except Exception as e:
        print(f"[WS] Broadcast error: {e}")


def trigger_user_broadcast(user_id: int, event_type: str, data: Any):
    """Safely fire an async user-specific notification."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ws_manager.send_to_user(user_id, event_type, data))
        else:
            loop.run_until_complete(ws_manager.send_to_user(user_id, event_type, data))
    except RuntimeError:
        pass
    except Exception as e:
        print(f"[WS] User broadcast error: {e}")


def trigger_patient_vitals_broadcast(patient_id: int, data: Any):
    """Safely fire live vitals telemetry to subscribed patient monitors."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ws_manager.broadcast_patient_vitals(patient_id, data))
        else:
            loop.run_until_complete(ws_manager.broadcast_patient_vitals(patient_id, data))
    except RuntimeError:
        pass
    except Exception as e:
        print(f"[WS] Patient vitals broadcast error: {e}")

