from typing import Optional, List
from pydantic import BaseModel


class SignupRequest(BaseModel):
    name: str
    password: str


class LoginRequest(BaseModel):
    name: str
    password: str


class TokenResponse(BaseModel):
    token: str
    status: str  # "pending" | "approved" | "rejected" (always "approved" for coach tokens)
    role: str    # "user" | "coach"
    name: str


class MeResponse(BaseModel):
    name: str
    role: str
    status: str


class UserSummary(BaseModel):
    id: str
    name: str
    status: str
    created_at: str
    activity_count: int
    last_activity: Optional[str] = None


class ActivityLogRequest(BaseModel):
    type: str   # "workout" | "checkin" | "lift_check" | "diet"
    date: str
    summary: str


class ActivityItem(BaseModel):
    type: str
    date: str
    summary: str
