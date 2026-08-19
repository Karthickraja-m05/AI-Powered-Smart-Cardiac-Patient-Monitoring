# -*- coding: utf-8 -*-
"""
Care Team Chat Router
======================
Real-time messaging attached to patient records.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.chat import ChatMessage, MessageType
from ..schemas.hip_schemas import ChatMessageCreate, ChatMessageResponse
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Care Team Chat"])


@router.post("/messages", response_model=ChatMessageResponse)
def send_message(
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message in a patient's care team chat."""
    msg = ChatMessage(
        patient_id=data.patient_id,
        sender_id=current_user.id,
        message=data.message,
        message_type=MessageType(data.message_type),
        is_urgent=data.is_urgent,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return ChatMessageResponse(
        id=msg.id,
        patient_id=msg.patient_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        sender_role=current_user.role.value,
        message=msg.message,
        message_type=msg.message_type.value,
        is_urgent=msg.is_urgent,
        created_at=msg.created_at,
    )


@router.get("/messages/{patient_id}", response_model=list[ChatMessageResponse])
def get_chat_history(
    patient_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chat history for a patient's care team."""
    messages = (
        db.query(ChatMessage, User)
        .join(User, ChatMessage.sender_id == User.id)
        .filter(
            ChatMessage.patient_id == patient_id,
            ChatMessage.is_deleted == False,
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for msg, sender in messages:
        results.append(ChatMessageResponse(
            id=msg.id,
            patient_id=msg.patient_id,
            sender_id=msg.sender_id,
            sender_name=sender.full_name,
            sender_role=sender.role.value,
            message=msg.message,
            message_type=msg.message_type.value,
            is_urgent=msg.is_urgent,
            created_at=msg.created_at,
        ))

    results.reverse()  # chronological order
    return results
