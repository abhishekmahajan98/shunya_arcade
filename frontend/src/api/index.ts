import api from '../lib/api';

export interface Game {
  id: string;
  name: string;
  description: string;
  thumbnail_emoji: string;
  tags: string[];
  score_label: string;
  score_order: 'asc' | 'desc';
  min_players: number;
  max_players: number;
  config: Record<string, unknown>;
  is_active: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  achieved_at: string;
}

export interface LeaderboardData {
  game_id: string;
  game_name: string;
  score_label: string;
  score_order: 'asc' | 'desc';
  entries: LeaderboardEntry[];
  my_rank: number | null;
  my_best_score: number | null;
}



export interface ScoreSubmitPayload {
  game_id: string;
  session_id?: string;
  raw_result: Record<string, unknown>;
}

export interface ScoreResult {
  id: string;
  score: number;
  achieved_at: string;
}

export const gamesApi = {
  list: () => api.get<Game[]>('/games').then((r) => r.data),
  get: (id: string) => api.get<Game>(`/games/${id}`).then((r) => r.data),
};

export const leaderboardApi = {
  getForGame: (gameId: string) =>
    api.get<LeaderboardData>(`/leaderboards/${gameId}`).then((r) => r.data),
};

export const scoresApi = {
  submit: (payload: ScoreSubmitPayload) =>
    api.post<ScoreResult>('/scores', payload).then((r) => r.data),
};

export const sessionsApi = {
  create: (gameId: string) =>
    api.post('/sessions', { game_id: gameId }).then((r) => r.data),
  finish: (sessionId: string) =>
    api.post(`/sessions/${sessionId}/finish`).then((r) => r.data),
};

export const profileApi = {
  getMe: () => api.get('/profile/me').then((r) => r.data),
  create: (displayName: string) =>
    api.post('/profile/me', { display_name: displayName }).then((r) => r.data),
  update: (data: { display_name?: string; avatar_url?: string }) =>
    api.patch('/profile/me', data).then((r) => r.data),
};
