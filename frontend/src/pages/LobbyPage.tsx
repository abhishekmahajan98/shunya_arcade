import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi, type Game } from '../api';
import { Trophy, Play, Zap } from 'lucide-react';
import './LobbyPage.css';

const EMOJI_COLORS: Record<string, string> = {
  snake:  'var(--accent-3)',
  memory: 'var(--accent-2)',
  dino:   'var(--accent-4)',
};

const TAG_GRADIENTS: Record<string, string> = {
  snake:  'linear-gradient(135deg, #4ecdc4, #2ea8a0)',
  memory: 'linear-gradient(135deg, #f7706f, #e85555)',
  dino:   'linear-gradient(135deg, #ffd166, #f5a623)',
};

export default function LobbyPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    gamesApi.list()
      .then(setGames)
      .catch(() => {/* handled below */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="lobby-page">
      <div className="container">
        {/* Header */}
        <header className="lobby-header fade-up">
          <div className="lobby-header-text">
            <div className="lobby-eyebrow"><Zap size={14} /> Game Lobby</div>
            <h1 className="lobby-title">Pick Your Game</h1>
            <p className="lobby-desc">Compete with your colleagues. Climb the leaderboard. Be legendary.</p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/leaderboard')}>
            <Trophy size={16} />
            View Leaderboard
          </button>
        </header>

        {/* Grid */}
        {loading ? (
          <div className="games-grid">
            {[1,2,3].map(i => <div key={i} className="game-card-skeleton skeleton" />)}
          </div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 48 }}>🎮</span>
            <p>No games loaded yet. Make sure the backend is running.</p>
          </div>
        ) : (
          <div className="games-grid">
            {games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                gradient={TAG_GRADIENTS[game.id] || 'linear-gradient(135deg, var(--accent-1), #a78bfa)'}
                accentColor={EMOJI_COLORS[game.id] || 'var(--accent-1)'}
                delay={i * 80}
                onPlay={() => navigate(`/game/${game.id}`)}
                onLeaderboard={() => navigate(`/leaderboard/${game.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function GameCard({
  game, gradient, accentColor, delay, onPlay, onLeaderboard,
}: {
  game: Game;
  gradient: string;
  accentColor: string;
  delay: number;
  onPlay: () => void;
  onLeaderboard: () => void;
}) {
  return (
    <div
      className="game-card card fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Emoji hero */}
      <div
        className="game-card-hero"
        style={{ background: gradient }}
      >
        <span className="game-emoji">{game.thumbnail_emoji}</span>
        <div className="game-card-glow" style={{ background: accentColor }} />
      </div>

      {/* Content */}
      <div className="game-card-body">
        <div className="game-card-tags">
          {game.tags.slice(0, 3).map(tag => (
            <span key={tag} className={`badge ${tag}`}>{tag}</span>
          ))}
        </div>

        <h2 className="game-card-title">{game.name}</h2>
        <p className="game-card-desc">{game.description}</p>

        <div className="game-card-meta">
          <span className="meta-item">📊 {game.score_label}</span>
          <span className="meta-item">👥 {game.min_players === game.max_players ? `${game.min_players}P` : `${game.min_players}–${game.max_players}P`}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="game-card-actions">
        <button
          id={`play-${game.id}`}
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={onPlay}
        >
          <Play size={15} />
          Play Now
        </button>
        <button
          id={`lb-${game.id}`}
          className="btn btn-ghost"
          onClick={onLeaderboard}
          title="Leaderboard"
        >
          <Trophy size={15} />
        </button>
      </div>
    </div>
  );
}
