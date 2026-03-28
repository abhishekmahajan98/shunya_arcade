from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.games.base import GameRegistry
from app.models import Profile, Score, GameSession
from app.schemas import ScoreOut, ScoreSubmit

router = APIRouter(prefix="/scores", tags=["scores"])


@router.post("", response_model=ScoreOut, status_code=201)
async def submit_score(
    body: ScoreSubmit,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a game result. The server calculates the canonical score
    using the game's registered scorer — clients never send a score directly.
    """
    game_plugin = GameRegistry.get(body.game_id)
    if not game_plugin:
        raise HTTPException(status_code=404, detail="Game not found")

    # 1. Fetch and validate session (Anti-cheat/No-replay)
    session = (
        await db.execute(
            select(GameSession).where(
                GameSession.id == body.session_id,
                GameSession.player_id == current_user.user_id,
                GameSession.game_id == body.game_id
            )
        )
    ).scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Valid game session not found")
    
    if session.status != "active":
        raise HTTPException(status_code=400, detail="This session is no longer active or has already been scored")

    # 2. Timing check (Anti-cheat)
    # Ensure reported time_survived_s is not longer than actual wall-clock elapsed time
    now = datetime.now(timezone.utc)
    elapsed = (now - session.started_at).total_seconds()
    
    # We allow a small 3s buffer for network jitter
    reported_time = float(body.raw_result.get("time_survived_s") or body.raw_result.get("time_s") or 0)
    if reported_time > (elapsed + 3):
        raise HTTPException(
            status_code=400, 
            detail=f"Time mismatch: survived {reported_time}s but session only lasted {elapsed:.1f}s — submission rejected"
        )

    # 3. Game-specific validation
    if not game_plugin.validate_result(body.raw_result):
        raise HTTPException(status_code=400, detail="Invalid game result — submission rejected")

    # 4. Calculate score
    canonical_score = game_plugin.calculate_score(body.raw_result)

    # 5. Ensure profile exists (upsert on first score)
    profile = (
        await db.execute(select(Profile).where(Profile.id == current_user.user_id))
    ).scalar_one_or_none()
    if not profile:
        profile = Profile(
            id=current_user.user_id,
            display_name=current_user.email.split("@")[0],
        )
        db.add(profile)
        await db.flush()

    # 6. Save score and update session
    score = Score(
        id=uuid.uuid4(),
        user_id=current_user.user_id,
        game_id=body.game_id,
        session_id=body.session_id,
        score=canonical_score,
        raw_result=body.raw_result,
    )
    db.add(score)
    
    # Mark session as used
    session.status = "finished"
    session.ended_at = now
    
    await db.flush()
    await db.refresh(score)
    return score
