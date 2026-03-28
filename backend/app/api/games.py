"""Games API — lists catalog, syncs registry to DB."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.games.base import GameRegistry
from app.models import Game
from app.schemas import GameOut

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameOut])
async def list_games(db: AsyncSession = Depends(get_db)):
    """List all active games."""
    result = await db.execute(select(Game).where(Game.is_active == True))
    games = result.scalars().all()
    return games


@router.get("/{game_id}", response_model=GameOut)
async def get_game(game_id: str, db: AsyncSession = Depends(get_db)):
    """Get details for a single game."""
    result = await db.execute(select(Game).where(Game.id == game_id, Game.is_active == True))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game
