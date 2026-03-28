"""
Auth API — proxies login/register/logout/refresh to Supabase Auth REST API.
Frontend only needs to know about our FastAPI URL — no Supabase credentials exposed.
"""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# Supabase Auth REST base URL
AUTH_URL = f"{settings.SUPABASE_URL}/auth/v1"

# Headers required for every Supabase Auth API call
def _supabase_headers(access_token: str | None = None) -> dict:
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


# ── Schemas ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    access_token: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Sign in with email + password. Returns JWT tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_URL}/token?grant_type=password",
            headers=_supabase_headers(),
            json={"email": body.email, "password": body.password},
        )

    if resp.status_code != 200:
        data = resp.json()
        msg = data.get("error_description") or data.get("msg") or "Invalid credentials"
        raise HTTPException(status_code=401, detail=msg)

    data = resp.json()
    return AuthResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_in=data.get("expires_in", 3600),
        user={
            "id": data["user"]["id"],
            "email": data["user"]["email"],
        },
    )


@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Create a new account. Returns a confirmation message."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_URL}/signup",
            headers=_supabase_headers(),
            json={
                "email": body.email,
                "password": body.password,
                "data": {"display_name": body.display_name},
            },
        )

    if resp.status_code not in (200, 201):
        data = resp.json()
        msg = data.get("error_description") or data.get("msg") or "Registration failed"
        raise HTTPException(status_code=400, detail=msg)

    return {"message": "Account created! Check your email to confirm, then log in."}


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_URL}/token?grant_type=refresh_token",
            headers=_supabase_headers(),
            json={"refresh_token": body.refresh_token},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

    data = resp.json()
    return AuthResponse(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_in=data.get("expires_in", 3600),
        user={
            "id": data["user"]["id"],
            "email": data["user"]["email"],
        },
    )


@router.post("/logout")
async def logout(body: LogoutRequest):
    """Invalidate the current session on Supabase."""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{AUTH_URL}/logout",
            headers=_supabase_headers(access_token=body.access_token),
        )
    return {"message": "Logged out"}
