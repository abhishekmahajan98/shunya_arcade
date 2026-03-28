# Shunya Arcade 🎮

An employee gaming platform featuring multiple arcade games with per-game leaderboards.

**Stack**: FastAPI · React + TypeScript + Vite · Supabase (PostgreSQL + Auth) · Railway

---

## Quick Start (Local Dev)

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/schema.sql`
3. Note your credentials: **Settings → API**:
   - Project URL
   - Anon key
   - JWT secret (Settings → API → JWT Settings)
4. Note your DB URL: **Settings → Database → Connection string (Session mode)**

### 2. Backend

```bash
cd backend

# Create .env from template
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, DATABASE_URL

# Install dependencies
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .

# Run
uvicorn app.main:app --reload
```

API running at `http://localhost:8000` — Docs at `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend

cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL=http://localhost:8000

npm install
npm run dev
```

Frontend at `http://localhost:5173`

---

## Adding a New Game

### Backend (1 file)
Create `backend/app/games/<your_game>/__init__.py`:

```python
from app.games.base import BaseGame, GameMeta

class MyNewGame(BaseGame):
    @property
    def meta(self) -> GameMeta:
        return GameMeta(
            id="my_game",
            name="My Game",
            description="...",
            thumbnail_emoji="🚀",
            tags=["solo", "arcade"],
            score_label="Points",
            score_order="desc",
        )

    def calculate_score(self, raw_result):
        return int(raw_result.get("score", 0))

    def validate_result(self, raw_result):
        return raw_result.get("score", 0) >= 0
```

That's it — the game is auto-registered on next backend restart.

### Frontend (1 folder)
1. Create `frontend/src/games/my_game/MyGame.tsx`
2. Export a component matching `{ onGameEnd, onScoreChange }` props
3. Add it to `GAME_COMPONENTS` and `GAME_LABELS` in `GameRoomPage.tsx`

---

## Deployment (Railway)

### Backend
1. Push code to GitHub
2. Create Railway project → Deploy from GitHub → select `backend/` folder
3. Set env vars in Railway dashboard (same as `.env`)
4. Railway auto-detects `railway.toml` and deploys

### Frontend
Deploy to Vercel or Railway:
- Set `VITE_API_BASE_URL` to your Railway backend URL

---

## Project Structure

```
shunya_arcade/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + lifespan
│   │   ├── models.py           # SQLAlchemy ORM
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── core/               # config, db, auth
│   │   ├── games/              # 🔌 Game plugins (auto-discovered)
│   │   │   ├── base.py         # BaseGame + GameRegistry
│   │   │   ├── snake/
│   │   │   ├── memory/
│   │   │   └── dino/
│   │   └── api/                # REST routes
│   └── railway.toml
├── frontend/
│   └── src/
│       ├── pages/              # Lobby, GameRoom, Leaderboard, Profile
│       ├── games/              # 🕹️ Snake, Memory, Dino (canvas games)
│       ├── store/              # Zustand auth store
│       ├── api/                # Typed API client
│       └── lib/                # Supabase + Axios setup
└── supabase/
    └── schema.sql              # DB schema + RLS policies
```
