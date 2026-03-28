import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GameRoomPage from './pages/GameRoomPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function FullPageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid var(--bg-elevated)',
        borderTopColor: 'var(--accent-1)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const { loading } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) return <FullPageLoader />;

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Navbar />
            <LobbyPage />
          </ProtectedRoute>
        } />
        <Route path="/game/:gameId" element={
          <ProtectedRoute>
            <Navbar />
            <GameRoomPage />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard/:gameId?" element={
          <ProtectedRoute>
            <Navbar />
            <LeaderboardPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Navbar />
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
