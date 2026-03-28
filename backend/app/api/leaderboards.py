"""Leaderboards API — per-game and global rankings using PostgreSQL window functions."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models import Game, Profile, Score
from app.schemas import LeaderboardEntry, LeaderboardOut

router = APIRouter(prefix="/leaderboards", tags=["leaderboards"])



@router.get("/{game_id}", response_model=LeaderboardOut)
async def game_leaderboard(
    game_id: str,
    current_user: CurrentUser,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Per-game leaderboard — best score per player, ranked."""
    game = (await db.execute(select(Game).where(Game.id == game_id))).scalar_one_or_none()
    if not game:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Game not found")

    order_dir = "DESC" if game.score_order == "desc" else "ASC"

    query = text(f"""
        WITH best AS (
            SELECT DISTINCT ON (user_id)
                user_id,
                score,
                achieved_at
            FROM scores
            WHERE game_id = :game_id
            ORDER BY user_id, score {order_dir}
        )
        SELECT
            RANK() OVER (ORDER BY score {order_dir})::int AS rank,
            b.user_id,
            p.display_name,
            p.avatar_url,
            b.score,
            b.achieved_at
        FROM best b
        JOIN profiles p ON p.id = b.user_id
        ORDER BY score {order_dir}
        LIMIT :limit
    """)
    rows = (await db.execute(query, {"game_id": game_id, "limit": limit})).mappings().all()

    entries = [
        LeaderboardEntry(
            rank=row["rank"],
            user_id=row["user_id"],
            display_name=row["display_name"],
            avatar_url=row["avatar_url"],
            score=row["score"],
            achieved_at=row["achieved_at"],
        )
        for row in rows
    ]

    # Fetch caller's own best score + rank
    my_rank = None
    my_best_score = None
    my_entry = next((e for e in entries if e.user_id == current_user.user_id), None)
    if my_entry:
        my_rank = my_entry.rank
        my_best_score = my_entry.score
    else:
        my_score_row = (
            await db.execute(
                select(func.max(Score.score) if order_dir == "DESC" else func.min(Score.score))
                .where(Score.game_id == game_id, Score.user_id == current_user.user_id)
            )
        ).scalar_one_or_none()
        if my_score_row:
            my_best_score = my_score_row

    return LeaderboardOut(
        game_id=game_id,
        game_name=game.name,
        score_label=game.score_label,
        score_order=game.score_order,
        entries=entries,
        my_rank=my_rank,
        my_best_score=my_best_score,
    )
