-- ============================================================
-- Shunya Arcade — Supabase Database Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Profiles (extends auth.users)
-- ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Player',
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Games catalog
-- ─────────────────
CREATE TABLE IF NOT EXISTS public.games (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    thumbnail_emoji TEXT NOT NULL DEFAULT '🎮',
    tags            JSONB NOT NULL DEFAULT '[]',
    score_label     TEXT NOT NULL DEFAULT 'Points',
    score_order     TEXT NOT NULL DEFAULT 'desc' CHECK (score_order IN ('asc', 'desc')),
    min_players     INT NOT NULL DEFAULT 1,
    max_players     INT NOT NULL DEFAULT 1,
    config          JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Game Sessions
-- ──────────────────
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id     TEXT NOT NULL REFERENCES public.games(id),
    player_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ
);

-- 4. Scores (append-only, never mutated)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id     TEXT NOT NULL REFERENCES public.games(id),
    session_id  UUID REFERENCES public.game_sessions(id),
    score       INT NOT NULL,
    raw_result  JSONB NOT NULL DEFAULT '{}',
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for leaderboard performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scores_game_score     ON public.scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user           ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_game      ON public.scores(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_player_game  ON public.game_sessions(player_id, game_id);

-- 6. Row Level Security (RLS)
-- ────────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games        ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Games: public read
CREATE POLICY "games_select" ON public.games FOR SELECT USING (TRUE);

-- Scores: public read (leaderboards), only insert your own
CREATE POLICY "scores_select" ON public.scores FOR SELECT USING (TRUE);
CREATE POLICY "scores_insert" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sessions: only your own
CREATE POLICY "sessions_select" ON public.game_sessions FOR SELECT USING (auth.uid() = player_id);
CREATE POLICY "sessions_insert" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "sessions_update" ON public.game_sessions FOR UPDATE USING (auth.uid() = player_id);

-- NOTE: The FastAPI backend connects with the service role key (bypasses RLS).
-- RLS protects direct Supabase client access from the browser.
