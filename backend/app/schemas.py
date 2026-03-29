import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Profile ────────────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=64)
    avatar_url: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, min_length=2, max_length=64)
    avatar_url: str | None = None


class ProfileOut(BaseModel):
    id: uuid.UUID
    display_name: str
    avatar_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Game ───────────────────────────────────────────────────────────────────────

class GameOut(BaseModel):
    id: str
    name: str
    description: str | None
    thumbnail_emoji: str
    tags: list[str]
    score_label: str
    score_order: str
    min_players: int
    max_players: int
    config: dict[str, Any]
    is_active: bool

    model_config = {"from_attributes": True}


# ── Session ────────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    game_id: str


class SessionOut(BaseModel):
    id: uuid.UUID
    game_id: str
    player_id: uuid.UUID
    status: str
    started_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}


# ── Score ──────────────────────────────────────────────────────────────────────

class ScoreSubmit(BaseModel):
    game_id: str
    session_id: uuid.UUID
    raw_result: dict[str, Any] = Field(default_factory=dict)


class ScoreOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    game_id: str
    score: int
    achieved_at: datetime

    model_config = {"from_attributes": True}


class ScoreSubmissionResult(BaseModel):
    id: uuid.UUID
    score: int
    is_high_score: bool
    percentile_vs_self: float | None = None
    percentile_vs_others: float | None = None
    achieved_at: datetime


# ── Leaderboard ────────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None
    score: int
    achieved_at: datetime


class LeaderboardOut(BaseModel):
    game_id: str
    game_name: str
    score_label: str
    score_order: str
    entries: list[LeaderboardEntry]
    my_rank: int | None = None
    my_best_score: int | None = None
    my_percentile: float | None = None



