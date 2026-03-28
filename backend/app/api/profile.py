"""Profile API — get and update the current user's profile."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models import Profile, Score
from app.schemas import ProfileCreate, ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    profile = (
        await db.execute(select(Profile).where(Profile.id == current_user.user_id))
    ).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Submit a score first to auto-create.")
    return profile


@router.post("/me", response_model=ProfileOut, status_code=201)
async def create_my_profile(
    body: ProfileCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    existing = (
        await db.execute(select(Profile).where(Profile.id == current_user.user_id))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Profile already exists")

    profile = Profile(
        id=current_user.user_id,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
    )
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile


@router.patch("/me", response_model=ProfileOut)
async def update_my_profile(
    body: ProfileUpdate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    profile = (
        await db.execute(select(Profile).where(Profile.id == current_user.user_id))
    ).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if body.display_name is not None:
        profile.display_name = body.display_name
    if body.avatar_url is not None:
        profile.avatar_url = body.avatar_url

    return profile
