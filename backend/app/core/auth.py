"""
Auth module: verifies Supabase JWTs using JWKS (JSON Web Key Set).
Supports the new ECC P-256 signing introduced by Supabase.

Flow:
  1. On first request, fetch Supabase's public JWKS endpoint (cached in memory)
  2. Verify the JWT signature using the matching public key (ES256 or RS256)
  3. Extract user_id + email from the payload

No shared secret needed — uses asymmetric public key verification.
"""
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer()

# In-memory JWKS cache — fetched once, reused for all requests
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    """Fetch and cache Supabase's JWKS (public keys for JWT verification)."""
    global _jwks_cache
    if _jwks_cache is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient() as client:
            resp = await client.get(jwks_url, timeout=10)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


class AuthenticatedUser:
    def __init__(self, user_id: UUID, email: str, raw: dict):
        self.user_id = user_id
        self.email = email
        self.raw = raw


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> AuthenticatedUser:
    """
    FastAPI dependency: extracts + verifies the Supabase JWT.
    Supports both new ECC P-256 (ES256) and legacy HS256 tokens.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["ES256", "RS256", "HS256"],  # supports new + legacy keys
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("sub")
        email: str | None = payload.get("email")
        if user_id is None or email is None:
            raise credentials_exception
        return AuthenticatedUser(
            user_id=UUID(user_id),
            email=email,
            raw=payload,
        )
    except (JWTError, ValueError, httpx.HTTPError):
        raise credentials_exception


# Convenient type alias for routes
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
