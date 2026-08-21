# -*- coding: utf-8 -*-
"""
Auth Service
============
JWT token generation, password hashing, user authentication,
anti-brute-force rate limiting, timing attack mitigation, and strong password validation.
"""

from datetime import datetime, timedelta
import re
import time
from typing import Optional, Dict, Tuple
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from ..config import settings
from ..database import get_db
from ..models.user import User, UserRole

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# ── Security Safeguards: Anti-Brute-Force & Lockout Tracker ──
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes
FAILED_ATTEMPTS: Dict[str, list[float]] = {}

# ── Timing-Attack Mitigation ──
# Pre-computed dummy hash to ensure constant-time response when user does not exist
_DUMMY_SALT = bcrypt.gensalt(rounds=12)
_DUMMY_HASH = bcrypt.hashpw(b"DummyPasswordForTimingImmunity_987654", _DUMMY_SALT).decode("utf-8")


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Enforces strong password complexity:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special symbol
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one numeric digit (0-9)."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=~`]", password):
        return False, "Password must contain at least one special character (!@#$%^&*...)."
    
    # Check for trivial dictionary passwords
    common_weak = {"password", "admin123", "12345678", "qwerty123", "hospital123"}
    if password.lower() in common_weak:
        return False, "Password is too common and easily guessable. Please choose a stronger password."
        
    return True, ""


def check_login_rate_limit(key: str) -> None:
    """
    Checks if an IP or username is temporarily locked out due to excessive failed attempts.
    Raises HTTPException(429) if locked.
    """
    now = time.time()
    attempts = FAILED_ATTEMPTS.get(key, [])
    # Filter attempts within the lockout window
    recent_attempts = [t for t in attempts if now - t < LOCKOUT_DURATION_SECONDS]
    FAILED_ATTEMPTS[key] = recent_attempts

    if len(recent_attempts) >= MAX_FAILED_ATTEMPTS:
        oldest_recent = min(recent_attempts)
        remaining_seconds = int(LOCKOUT_DURATION_SECONDS - (now - oldest_recent))
        minutes = max(1, remaining_seconds // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Account access temporarily restricted due to {MAX_FAILED_ATTEMPTS} consecutive failed attempts. "
                f"Please try again in {minutes} minute(s)."
            ),
        )


def record_failed_login(key: str) -> int:
    """Records a failed attempt timestamp and returns remaining allowed attempts."""
    now = time.time()
    attempts = FAILED_ATTEMPTS.get(key, [])
    recent_attempts = [t for t in attempts if now - t < LOCKOUT_DURATION_SECONDS]
    recent_attempts.append(now)
    FAILED_ATTEMPTS[key] = recent_attempts
    remaining = max(0, MAX_FAILED_ATTEMPTS - len(recent_attempts))
    return remaining


def reset_failed_logins(key: str) -> None:
    """Resets failed attempt records upon successful authentication."""
    if key in FAILED_ATTEMPTS:
        FAILED_ATTEMPTS.pop(key, None)


def hash_password(password: str, rounds: int = 12) -> str:
    """Hashes password using bcrypt with adaptive salt cost factor (default: 12 rounds)."""
    salt = bcrypt.gensalt(rounds=rounds)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def authenticate_user(db: Session, username: str, password: str, client_ip: str = "127.0.0.1") -> Optional[User]:
    """
    Authenticates user with:
    1. Anti-brute-force rate check per username and client IP.
    2. Constant-time dummy verification to eliminate timing attacks.
    3. Failed attempt recording and success reset.
    """
    ip_key = f"ip:{client_ip}"
    user_key = f"user:{username.lower().strip()}"

    # Verify neither the IP nor the username is locked
    check_login_rate_limit(ip_key)
    check_login_rate_limit(user_key)

    user = db.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user:
        # Mitigate timing attacks: perform dummy bcrypt check
        verify_password(password, _DUMMY_HASH)
        remaining = record_failed_login(ip_key)
        record_failed_login(user_key)
        return None

    if not verify_password(password, user.hashed_password):
        remaining = record_failed_login(ip_key)
        record_failed_login(user_key)
        return None

    # Clear lockout trackers on success
    reset_failed_logins(ip_key)
    reset_failed_logins(user_key)
    return user


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = None
    if str(user_id).isdigit():
        user = db.query(User).filter(User.id == int(user_id)).first()
    else:
        user = db.query(User).filter(User.username == str(user_id)).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_roles(*roles: UserRole):
    """Dependency factory: restrict endpoint to specified roles."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return role_checker

