# -*- coding: utf-8 -*-
"""User Schemas — Auth, registration, profile management."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(default="patient")
    phone: Optional[str] = None
    specialization: Optional[str] = None
    department: Optional[str] = None
    license_number: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    specialization: Optional[str] = None
    department: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    department: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: str


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)
