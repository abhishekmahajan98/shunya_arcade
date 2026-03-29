from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.games.base import GameRegistry
from app.models import Profile, Score, GameSession, Game
from app.schemas import ScoreOut, ScoreSubmit, ScoreSubmissionResult

router = APIRouter(prefix="/scores", tags=["scores"])


@router.post("", response_model=ScoreSubmissionResult, status_code=201)
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
    now = datetime.now(timezone.utc)
    elapsed = (now - session.started_at).total_seconds()
    reported_time = float(body.raw_result.get("time_survived_s") or body.raw_result.get("time_s") or 0)
    if reported_time > (elapsed + 3):
        raise HTTPException(status_code=400, detail="Time mismatch — submission rejected")

    # 3. Game-specific validation
    if not game_plugin.validate_result(body.raw_result):
        raise HTTPException(status_code=400, detail="Invalid game result — submission rejected")

    # 4. Calculate score
    canonical_score = game_plugin.calculate_score(body.raw_result)

    # 5. Calculate statistics
    game_obj = (await db.execute(select(Game).where(Game.id == body.game_id))).scalar_one()
    order_dir = "DESC" if game_obj.score_order == "desc" else "ASC"

    # My stats
    my_past_scores = (await db.execute(
        select(Score.score).where(Score.user_id == current_user.user_id, Score.game_id == body.game_id)
    )).scalars().all()
    
    total_past = len(my_past_scores)
    
    if total_past == 0:
        is_high_score = True
        percentile_vs_self = 100.0
    else:
        # Check high score
        my_best = max(my_past_scores) if order_dir == "DESC" else min(my_past_scores)
        is_high_score = (canonical_score > my_best) if order_dir == "DESC" else (canonical_score < my_best)
        
        # Percentile vs self
        if order_dir == "DESC":
            beaten_self = len([s for s in my_past_scores if s < canonical_score])
        else:
            beaten_self = len([s for s in my_past_scores if s > canonical_score])
        percentile_vs_self = round((beaten_self / total_past) * 100, 1)

    # 6. Ensure profile exists
    profile = (await db.execute(select(Profile).where(Profile.id == current_user.user_id))).scalar_one_or_none()
    if not profile:
        profile = Profile(id=current_user.user_id, display_name=current_user.email.split("@")[0])
        db.add(profile)
        await db.flush()

    # 7. Save score and update session
    score = Score(
        id=uuid.uuid4(),
        user_id=current_user.user_id,
        game_id=body.game_id,
        session_id=body.session_id,
        score=canonical_score,
        raw_result=body.raw_result,
    )
    db.add(score)
    session.status = "finished"
    session.ended_at = now
    
    await db.flush()

    # 8. Calculate percentile vs others (After saving)
    total_players = (await db.execute(select(func.count(func.distinct(Score.user_id))).where(Score.game_id == body.game_id))).scalar() or 0
    
    rank_query = text(f"""
        WITH best AS (
            SELECT user_id, {"MAX" if order_dir == "DESC" else "MIN"}(score) as top_score
            FROM scores
            WHERE game_id = :game_id
            GROUP BY user_id
        )
        SELECT COUNT(*) + 1 FROM best 
        WHERE top_score {" > " if order_dir == "DESC" else " < "} :my_score
    """)
    my_best_now = (await db.execute(select(func.max(Score.score) if order_dir == "DESC" else func.min(Score.score)).where(Score.game_id == body.game_id, Score.user_id == current_user.user_id))).scalar()
    my_rank = (await db.execute(rank_query, {"game_id": body.game_id, "my_score": my_best_now})).scalar()

    percentile_vs_others = 100.0
    if total_players > 1:
        percentile_vs_others = round(((total_players - my_rank) / (total_players - 1)) * 100, 1)

    return ScoreSubmissionResult(
        id=score.id,
        score=score.score,
        is_high_score=is_high_score,
        percentile_vs_self=percentile_vs_self,
        percentile_vs_others=percentile_vs_others,
        achieved_at=score.achieved_at
    )


@router.get("/history/{game_id}", response_model=list[ScoreOut])
async def get_score_history(
    game_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Fetch the full score history for the current user for a specific game."""
    result = await db.execute(
        select(Score)
        .where(Score.game_id == game_id, Score.user_id == current_user.user_id)
        .order_by(Score.achieved_at.desc())
    )
    return result.scalars().all()
