from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.games.base import GameRegistry
from app.models import Base, Game

# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Discovery and sync logic remains...
    GameRegistry.discover()
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

# ── API Routers ──────────────────────────────────────────────────────────────────
# All internal API routes are now prefixed with /api
from app.api.auth import router as auth_router
from app.api.games import router as games_router
from app.api.leaderboards import router as leaderboards_router
from app.api.profile import router as profile_router
from app.api.scores import router as scores_router
from app.api.sessions import router as sessions_router

app.include_router(auth_router, prefix="/api")
app.include_router(games_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(scores_router, prefix="/api")
app.include_router(leaderboards_router, prefix="/api")
app.include_router(profile_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# ── Frontend Static Serving ────────────────────────────────────────────────────

# Serve frontend static files at root path
# This must be LAST so API routes take precedence
frontend_dist = Path(__file__).parent / "static"

if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")

    # Catch-all route for any non-API routes to serve index.html (React Router)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # If the path is under /api, return 404
        if full_path.startswith("api"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")
        return FileResponse(frontend_dist / "index.html")
