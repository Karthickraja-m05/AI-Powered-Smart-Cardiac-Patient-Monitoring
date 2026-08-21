# -*- coding: utf-8 -*-
"""
Auth Router
===========
JWT authentication, registration, profile management, and security audit logging.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.audit_log import AuditAction
from ..schemas.user_schema import (
    LoginRequest, TokenResponse, RegisterRequest,
    UserResponse, UserUpdate, PasswordChangeRequest,
)
from ..services.auth_service import (
    hash_password, verify_password, create_access_token,
    authenticate_user, get_current_user, require_roles,
    validate_password_strength,
)
from ..services.audit_service import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """Authenticate user, return JWT token, and record secure audit log with anti-brute-force rate limiting."""
    client_ip = req.client.host if req and req.client else "127.0.0.1"
    # Forwarded IP check if behind proxy / load balancer
    forwarded = req.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    user = authenticate_user(db, request.username, request.password, client_ip=client_ip)
    if not user:
        # Log failed attempt in tamper-evident audit logs
        log_audit_event(
            db=db,
            action=AuditAction.LOGIN,
            entity_type="security",
            username=request.username,
            description=f"Failed login attempt for username: {request.username} from IP: {client_ip}",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    db.commit()

    # Log successful login
    log_audit_event(
        db=db,
        action=AuditAction.LOGIN,
        entity_type="user",
        entity_id=user.id,
        user=user,
        description=f"User {user.full_name} ({user.role.value}) logged in successfully.",
        ip_address=client_ip,
    )

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new user (admin only) with strong password enforcement."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can register users")

    # Enforce strong password complexity policy
    is_valid, error_msg = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Weak password: {error_msg}")

    # Check duplicates
    existing = db.query(User).filter(
        (User.username == request.username) | (User.email == request.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        username=request.username,
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        role=UserRole(request.role),
        phone=request.phone,
        specialization=request.specialization,
        department=request.department,
        license_number=request.license_number,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action=AuditAction.USER_MANAGE,
        entity_type="user",
        entity_id=user.id,
        user=current_user,
        description=f"Admin {current_user.full_name} created new staff account: {user.full_name} (Role: {user.role.value}, Dept: {user.department or 'N/A'}).",
        new_value={"username": user.username, "role": user.role.value, "department": user.department},
    )

    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile."""
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
def update_profile(
    update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's profile."""
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)

    log_audit_event(
        db=db,
        action=AuditAction.UPDATE,
        entity_type="user",
        entity_id=current_user.id,
        user=current_user,
        description=f"User {current_user.full_name} updated their profile settings.",
        new_value=update_data,
    )

    return UserResponse.model_validate(current_user)


@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change current user's password with old-password verification and strong password enforcement."""
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    is_valid, error_msg = validate_password_strength(request.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Weak new password: {error_msg}")

    current_user.hashed_password = hash_password(request.new_password)
    db.commit()

    log_audit_event(
        db=db,
        action=AuditAction.UPDATE,
        entity_type="security",
        entity_id=current_user.id,
        user=current_user,
        description=f"Password changed for user {current_user.username}.",
    )

    return {"message": "Password updated successfully"}


@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
):
    """List all users (admin only). Optionally filter by role."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == UserRole(role))
    return [UserResponse.model_validate(u) for u in query.all()]
