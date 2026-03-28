"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.games.base import GameRegistry
from app.models import Base, Game


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    # 1. Discover game plugins
    GameRegistry.discover()
    print(f"[Arcade] Loaded games: {GameRegistry.ids()}")

    # 2. Sync game registry to DB (upsert)
    async with AsyncSessionLocal() as db:
        for game in GameRegistry.all():
            stmt = pg_insert(Game).values(
                id=game.meta.id,
                name=game.meta.name,
                description=game.meta.description,
                thumbnail_emoji=game.meta.thumbnail_emoji,
                tags=game.meta.tags,
                score_label=game.meta.score_label,
                score_order=game.meta.score_order,
                min_players=game.meta.min_players,
                max_players=game.meta.max_players,
                config=game.meta.config,
                is_active=True,
            ).on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": game.meta.name,
                    "description": game.meta.description,
                    "thumbnail_emoji": game.meta.thumbnail_emoji,
                    "tags": game.meta.tags,
                    "score_label": game.meta.score_label,
                    "score_order": game.meta.score_order,
                    "config": game.meta.config,
                    "is_active": True,
                },
            )
            await db.execute(stmt)
        await db.commit()

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    await engine.dispose()


app = FastAPI(
    title="Shunya Arcade API",
    version="1.0.0",
    description="Backend API for the Shunya Arcade employee gaming platform.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.games import router as games_router
from app.api.leaderboards import router as leaderboards_router
from app.api.profile import router as profile_router
from app.api.scores import router as scores_router
from app.api.sessions import router as sessions_router

app.include_router(auth_router)
app.include_router(games_router)
app.include_router(sessions_router)
app.include_router(scores_router)
app.include_router(leaderboards_router)
app.include_router(profile_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
