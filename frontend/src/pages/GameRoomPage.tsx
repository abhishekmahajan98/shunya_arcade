import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { scoresApi, sessionsApi, type ScoreResult } from '../api';
import SnakeGame from '../games/snake/SnakeGame';
import MemoryGame from '../games/memory/MemoryGame';
import DinoGame from '../games/dino/DinoGame';
import FlappyGame from '../games/flappy/FlappyGame';
import BubbleGame from '../games/bubble/BubbleGame';
import { Trophy, ArrowLeft, RotateCcw, Star, Award, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import './GameRoomPage.css';

type GameState = 'playing' | 'submitting' | 'done';

type AnyGameComponent = React.ComponentType<{
  onGameEnd: (result: Record<string, unknown>) => void;
  onScoreChange?: (score: number) => void;
}>;

const GAME_COMPONENTS: Record<string, AnyGameComponent> = {
  snake: SnakeGame as unknown as AnyGameComponent,
  memory: MemoryGame as unknown as AnyGameComponent,
  dino: DinoGame as unknown as AnyGameComponent,
  flappy: FlappyGame as unknown as AnyGameComponent,
  bubble: BubbleGame as unknown as AnyGameComponent,
};

const GAME_LABELS: Record<string, { name: string; emoji: string }> = {
  snake:  { name: 'Snake',        emoji: '🐍' },
  memory: { name: 'Memory Match', emoji: '🃏' },
  dino:   { name: 'Dino Run',     emoji: '🦕' },
  flappy: { name: 'Flappy Bird',  emoji: '🐦' },
  bubble: { name: 'Pop the AI Bubble', emoji: '🫧' },
};

export default function GameRoomPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>('playing');
  const [liveScore, setLiveScore] = useState(0);
  const [submissionResult, setSubmissionResult] = useState<ScoreResult | null>(null);
  const [key, setKey] = useState(0); // remount to restart
  const [sessionId, setSessionId] = useState<string | null>(null);

  const GameComponent = gameId ? GAME_COMPONENTS[gameId] : null;
  const info = gameId ? GAME_LABELS[gameId] : null;

  // 1. Create a server-side session before every game start
  useEffect(() => {
    if (gameId && gameState === 'playing') {
      sessionsApi.create(gameId)
        .then(session => setSessionId(session.id))
        .catch(() => {
          toast.error('Failed to initialize game session. Please refresh.');
        });
    }
  }, [gameId, key, gameState]);

  const handleGameEnd = useCallback(async (rawResult: Record<string, unknown>) => {
    if (!gameId || !sessionId) {
      toast.error('Session not initialized correctly.');
      return;
    }
    
    setGameState('submitting');
    try {
      // Send the session ID back with the results for "Proof of Time" verification
      const result = await scoresApi.submit({ 
        game_id: gameId, 
        session_id: sessionId, 
        raw_result: rawResult 
      });
      setSubmissionResult(result);
      setGameState('done');
      
      if (result.is_high_score) {
        toast.success(`🎉 NEW PERSONAL BEST! ${result.score} points!`);
      } else {
        toast.success(`Score submitted! You got ${result.score} points.`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to submit score.';
      toast.error(msg);
      setGameState('playing');
    }
  }, [gameId, sessionId]);

  const handleRestart = () => {
    setGameState('playing');
    setLiveScore(0);
    setSubmissionResult(null);
    setSessionId(null); // Force new session
    setKey(k => k + 1);
  };

  if (!GameComponent || !info) {
    return (
      <div className="game-room-error">
        <span>🎮</span>
        <p>Game not found</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  return (
    <main className="game-room">
      <div className="container">
        {/* Top bar */}
        <div className="game-room-topbar fade-up">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            <ArrowLeft size={15} />
            Lobby
          </button>
          <div className="game-room-title">
            <span className="game-room-emoji">{info.emoji}</span>
            <h1 className="game-room-name">{info.name}</h1>
          </div>
          <div className="game-room-score-badge">
            <Star size={14} />
            <span>{liveScore}</span>
          </div>
        </div>

        {/* Game area */}
        <div className="game-area fade-up" style={{ animationDelay: '80ms' }}>
          {gameState === 'done' && submissionResult ? (
            <ScoreScreen
              result={submissionResult}
              emoji={info.emoji}
              gameName={info.name}
              onRestart={handleRestart}
              onLeaderboard={() => navigate(`/leaderboard/${gameId}`)}
            />
          ) : (
            <div style={{ position: 'relative' }}>
              {gameState === 'submitting' && (
                <div className="submitting-overlay">
                  <div className="submitting-spinner" />
                  <p>Submitting score…</p>
                </div>
              )}
              <GameComponent
                key={key}
                onGameEnd={handleGameEnd}
                onScoreChange={setLiveScore}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ScoreScreen({
  result, emoji, gameName, onRestart, onLeaderboard,
}: {
  result: ScoreResult; emoji: string; gameName: string; onRestart: () => void; onLeaderboard: () => void;
}) {
  return (
    <div className="score-screen card">
      {result.is_high_score && (
        <div className="high-score-badge">
          <Award size={14} /> NEW RECORD
        </div>
      )}
      <div className="score-screen-emoji">{emoji}</div>
      <h2 className="score-screen-title">Game Over!</h2>
      <p className="score-screen-game">{gameName}</p>
      
      <div className="score-screen-score">
        <div className="score-number">{result.score.toLocaleString()}</div>
        <div className="score-label">points</div>
      </div>

      <div className="score-screen-analytics">
        {result.is_high_score ? (
          <div className="analytic-item positive">
            <TrendingUp size={14} />
            <span>Better than <strong>{result.percentile_vs_others}%</strong> of global runs!</span>
          </div>
        ) : (
          <div className="analytic-item">
            <TrendingUp size={14} />
            <span>Better than <strong>{result.percentile_vs_self}%</strong> of your previous runs</span>
          </div>
        )}
      </div>

      <div className="score-actions">
        <button id="play-again-btn" className="btn btn-primary" onClick={onRestart}>
          <RotateCcw size={15} />
          Play Again
        </button>
        <button id="view-leaderboard-btn" className="btn btn-ghost" onClick={onLeaderboard}>
          <Trophy size={15} />
          Leaderboard
        </button>
      </div>
    </div>
  );
}
