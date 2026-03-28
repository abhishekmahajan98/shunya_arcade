import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Profile(Base):
    """Extends Supabase auth.users. Created automatically on first login."""
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )  # matches auth.users.id
    display_name: Mapped[str] = mapped_column(String(64), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    scores: Mapped[list["Score"]] = relationship("Score", back_populates="profile")


class Game(Base):
    """Game catalog — populated from GameRegistry on startup."""
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # slug e.g. "snake"
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_emoji: Mapped[str] = mapped_column(String(8), default="🎮")
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    score_label: Mapped[str] = mapped_column(String(32), default="Points")
    score_order: Mapped[str] = mapped_column(String(4), default="desc")
    min_players: Mapped[int] = mapped_column(Integer, default=1)
    max_players: Mapped[int] = mapped_column(Integer, default=1)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    scores: Mapped[list["Score"]] = relationship("Score", back_populates="game")
    sessions: Mapped[list["GameSession"]] = relationship("GameSession", back_populates="game")


class GameSession(Base):
    """Tracks a single play session."""
    __tablename__ = "game_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    game_id: Mapped[str] = mapped_column(String(64), ForeignKey("games.id"), nullable=False)
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | finished
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    game: Mapped["Game"] = relationship("Game", back_populates="sessions")


class Score(Base):
    """Append-only score record — never mutated after submission."""
    __tablename__ = "scores"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    game_id: Mapped[str] = mapped_column(String(64), ForeignKey("games.id"), nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("game_sessions.id"), nullable=True
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    profile: Mapped["Profile"] = relationship("Profile", back_populates="scores")
    game: Mapped["Game"] = relationship("Game", back_populates="scores")
