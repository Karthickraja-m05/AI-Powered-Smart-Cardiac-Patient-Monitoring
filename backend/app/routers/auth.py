# -*- coding: utf-8 -*-
"""
Auth Router
===========
JWT authentication, registration, profile management.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..schemas.user_schema import (
    LoginRequest, TokenResponse, RegisterRequest,
    UserResponse, UserUpdate, PasswordChangeRequest,
)
from ..services.auth_service import (
    hash_password, verify_password, create_access_token,
    authenticate_user, get_current_user, require_roles,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

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
    """Register a new user (admin/doctor only)."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can register users")

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
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change current user's password."""
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(request.new_password)
    db.commit()
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
