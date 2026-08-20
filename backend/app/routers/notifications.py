# -*- coding: utf-8 -*-
"""
Notifications Router
====================
Real-time in-app clinical alerts, appointments, transfers, and system notifications.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models.user import User
from ..models.notification import Notification, NotificationChannel
from ..models.patient import Patient
from ..models.alert import Alert
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
@router.get("/", include_in_schema=False)
def get_user_notifications(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the active user's notifications stream."""
    q = db.query(Notification).filter(Notification.recipient_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)

    notifications = q.order_by(desc(Notification.created_at)).limit(limit).all()
    unread_count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False,
    ).count()

    results = []
    for n in notifications:
        patient = db.query(Patient).filter(Patient.id == n.patient_id).first() if n.patient_id else None
        results.append({
            "id": n.id,
            "recipient_id": n.recipient_id,
            "title": n.title,
            "message": n.message,
            "channel": n.channel.value if hasattr(n.channel, "value") else str(n.channel),
            "patient_id": n.patient_id,
            "patient_name": patient.full_name if patient else None,
            "patient_uid": patient.patient_uid if patient else None,
            "alert_id": n.alert_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else datetime.utcnow().isoformat(),
        })

    return {
        "notifications": results,
        "unread_count": unread_count,
        "total": len(results),
    }


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get fast count of unread notifications for badge."""
    count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"unread_count": count}


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Marked as read", "id": notification_id}


@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all active user notifications as read."""
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted", "id": notification_id}
