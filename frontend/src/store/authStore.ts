/**
 * Auth store — talks only to our FastAPI backend.
 * No Supabase SDK on the frontend.
 *
 * Tokens are stored in localStorage so sessions survive page refresh.
 * The axios interceptor in api.ts reads ACCESS_TOKEN_KEY automatically.
 */
import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ACCESS_TOKEN_KEY = 'arcade_access_token';
export const REFRESH_TOKEN_KEY = 'arcade_refresh_token';

/** Decode the JWT payload without verifying (safe — backend verifies). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

export interface ArcadeUser {
  id: string;
  email: string;
}

interface AuthState {
  user: ArcadeUser | null;
  loading: boolean;

  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  signIn: async (email, password) => {
    try {
      const resp = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const { access_token, refresh_token, user } = resp.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      set({ user: { id: user.id, email: user.email } });
      return { error: null };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Login failed';
      return { error: msg };
    }
  },

  signUp: async (email, password, displayName) => {
    try {
      await axios.post(`${API_BASE}/auth/register`, { email, password, display_name: displayName });
      return { error: null };
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Registration failed';
      return { error: msg };
    }
  },

  signOut: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      try { await axios.post(`${API_BASE}/auth/logout`, { access_token: token }); } catch { /* ignore */ }
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null });
  },

  refreshSession: async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    try {
      const resp = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
      const { access_token, refresh_token, user } = resp.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
      set({ user: { id: user.id, email: user.email } });
      return true;
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return false;
    }
  },

  init: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      set({ loading: false });
      return;
    }

    // Check if token is still valid by decoding expiry
    const payload = decodeJwtPayload(token);
    const exp = payload.exp as number | undefined;
    const isExpired = exp ? Date.now() / 1000 > exp : false;

    if (isExpired) {
      // Try refresh
      const refreshed = await get().refreshSession();
      if (!refreshed) { set({ loading: false }); return; }
    } else {
      const sub = payload.sub as string;
      const email = payload.email as string;
      if (sub && email) set({ user: { id: sub, email } });
    }

    set({ loading: false });
  },
}));
