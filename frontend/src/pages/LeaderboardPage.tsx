import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leaderboardApi, gamesApi, scoresApi, type LeaderboardData, type Game, type ScoreOut } from '../api';
import { Trophy, History, Globe } from 'lucide-react';
import './LeaderboardPage.css';

type SubTab = 'global' | 'history';

export default function LeaderboardPage() {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [activeGame, setActiveGame] = useState<string>(gameId ?? '');
  const [gameData, setGameData] = useState<LeaderboardData | null>(null);
  const [history, setHistory] = useState<ScoreOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('global');

  useEffect(() => {
    gamesApi.list().then(g => {
      setGames(g);
      // If we landed on /leaderboard without a gameId, pick the first one
      if (!gameId && g.length > 0) {
        setActiveGame(g[0].id);
        navigate(`/leaderboard/${g[0].id}`, { replace: true });
      }
    });
  }, [gameId, navigate]);

  useEffect(() => {
    if (gameId) {
      setActiveGame(gameId);
      setLoading(true);
      
      if (subTab === 'global') {
        leaderboardApi.getForGame(gameId)
          .then(setGameData)
          .catch(() => setGameData(null))
          .finally(() => setLoading(false));
      } else {
        scoresApi.getHistory(gameId)
          .then(setHistory)
          .catch(() => setHistory([]))
          .finally(() => setLoading(false));
      }
    }
  }, [gameId, subTab]);

  const medal = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <main className="lb-page">
      <div className="container">
        <header className="lb-header fade-up">
          <div>
            <div className="lb-eyebrow"><Trophy size={14} /> Leaderboards</div>
            <h1 className="lb-title">Hall of Fame</h1>
          </div>
        </header>

        {/* Game Tabs */}
        <div className="lb-tabs fade-up" style={{ animationDelay: '60ms' }}>
          {games.map(g => (
            <button
              key={g.id}
              className={`lb-tab ${activeGame === g.id ? 'active' : ''}`}
              onClick={() => navigate(`/leaderboard/${g.id}`)}
            >
              {g.thumbnail_emoji} {g.name}
            </button>
          ))}
        </div>

        <div className="lb-content fade-up" style={{ animationDelay: '120ms' }}>
          {/* Sub Tabs */}
          {gameId && (
            <div className="lb-subtabs">
              <button 
                className={`lb-subtab ${subTab === 'global' ? 'active' : ''}`}
                onClick={() => setSubTab('global')}
              >
                <Globe size={14} /> Global Rankings
              </button>
              <button 
                className={`lb-subtab ${subTab === 'history' ? 'active' : ''}`}
                onClick={() => setSubTab('history')}
              >
                <History size={14} /> My History
              </button>
            </div>
          )}

          {loading ? (
            <div className="lb-loading">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton lb-row-skeleton" />)}
            </div>
          ) : subTab === 'global' ? (
            gameData ? (
              <>
                {gameData.my_rank && (
                  <div className="my-rank-banner">
                    Your best: <strong>{gameData.my_best_score?.toLocaleString()} {gameData.score_label}</strong> 
                    {' — '} Rank <strong>#{gameData.my_rank}</strong>
                    {gameData.my_percentile !== null && (
                      <span className="percentile-tag">
                        Better than <strong>{gameData.my_percentile}%</strong> of players
                      </span>
                    )}
                  </div>
                )}
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>{gameData.score_label}</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameData.entries.map(entry => (
                      <tr key={entry.user_id} className={entry.rank <= 3 ? 'top-row' : ''}>
                        <td className="rank-cell">
                          <span className={`rank-${entry.rank}`}>
                            {medal(entry.rank) ?? `#${entry.rank}`}
                          </span>
                        </td>
                        <td>
                          <div className="player-cell">
                            <div className="player-avatar">{entry.display_name[0]?.toUpperCase()}</div>
                            <span className="player-name">{entry.display_name}</span>
                          </div>
                        </td>
                        <td className="score-cell">{entry.score.toLocaleString()}</td>
                        <td className="muted-cell">
                          {new Date(entry.achieved_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {gameData.entries.length === 0 && (
                      <tr><td colSpan={4} className="empty-cell">No scores yet. Be the first! 🏆</td></tr>
                    )}
                  </tbody>
                </table>
              </>
            ) : null
          ) : (
            <>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => (
                    <tr key={entry.id}>
                      <td className="score-cell">{entry.score.toLocaleString()}</td>
                      <td className="muted-cell">
                        {new Date(entry.achieved_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={2} className="empty-cell">You haven't played this game yet. 🎮</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {!gameId && !loading && (
            <div className="empty-cell" style={{ textAlign: 'center', padding: '80px' }}>
               Select a game to view the leaderboard.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
