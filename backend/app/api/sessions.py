"""Sessions API — create and manage game sessions."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models import Game, GameSession
from app.schemas import SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=201)
async def create_session(
    body: SessionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new game session for the current user."""
    # Verify the game exists
    game = (await db.execute(select(Game).where(Game.id == body.game_id, Game.is_active == True))).scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    session = GameSession(
        id=uuid.uuid4(),
        game_id=body.game_id,
        player_id=current_user.user_id,
        status="active",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GameSession).where(GameSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/finish", response_model=SessionOut)
async def finish_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GameSession).where(GameSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.player_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not your session")

    session.status = "finished"
    session.ended_at = datetime.now(timezone.utc)
    return session
