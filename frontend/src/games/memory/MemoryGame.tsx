import { useState, useEffect, useCallback, useRef } from 'react';

const EMOJIS = ['🦁','🐯','🦊','🐻','🐼','🦄','🐸','🦋'];
const PAIRS = [...EMOJIS, ...EMOJIS];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

interface GameResult {
  pairs_total: number;
  pairs_matched: number;
  moves: number;
  time_s: number;
}

interface MemoryGameProps {
  onGameEnd: (result: GameResult) => void;
  onScoreChange?: (score: number) => void;
}

export default function MemoryGame({ onGameEnd, onScoreChange }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[]>(() =>
    shuffle(PAIRS).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleFlip = useCallback((id: number) => {
    if (locked || done) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newSelected = [...selected, id];

    setCards(newCards);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected;
      setMoves(m => m + 1);
      setLocked(true);

      if (newCards[a].emoji === newCards[b].emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(c => newSelected.includes(c.id) ? { ...c, matched: true } : c));
          const newMatched = matchedCount + 1;
          setMatchedCount(newMatched);
          onScoreChange?.(newMatched * 50);
          setSelected([]);
          setLocked(false);

          if (newMatched === EMOJIS.length) {
            clearInterval(timerRef.current);
            setDone(true);
            const timeS = (Date.now() - startRef.current) / 1000;
            onGameEnd({
              pairs_total: EMOJIS.length,
              pairs_matched: newMatched,
              moves: moves + 1,
              time_s: timeS,
            });
          }
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(prev => prev.map(c => newSelected.includes(c.id) ? { ...c, flipped: false } : c));
          setSelected([]);
          setLocked(false);
        }, 900);
      }
    }
  }, [cards, selected, locked, done, matchedCount, moves, onGameEnd, onScoreChange]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'Moves', value: moves },
          { label: 'Pairs', value: `${matchedCount}/${EMOJIS.length}` },
          { label: 'Time', value: fmtTime(elapsed) },
        ].map(({ label, value }) => (
          <div key={label} style={{
            textAlign: 'center', padding: '10px 20px',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-2)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 80px)',
        gap: 10,
      }}>
        {cards.map(card => (
          <MemoryCard key={card.id} card={card} onClick={() => handleFlip(card.id)} />
        ))}
      </div>
    </div>
  );
}

function MemoryCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const flipped = card.flipped || card.matched;

  return (
    <button
      onClick={onClick}
      style={{
        width: 80, height: 80,
        border: `2px solid ${card.matched ? 'rgba(78,205,196,0.4)' : flipped ? 'rgba(124,111,247,0.4)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        background: card.matched
          ? 'rgba(78,205,196,0.08)'
          : flipped
          ? 'rgba(124,111,247,0.08)'
          : 'var(--bg-elevated)',
        cursor: card.matched ? 'default' : 'pointer',
        fontSize: flipped ? 36 : 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'scale(1)' : 'scale(0.95)',
        boxShadow: card.matched ? '0 0 16px rgba(78,205,196,0.2)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {flipped ? card.emoji : (
        <div style={{
          width: 24, height: 24,
          background: 'var(--bg-card)',
          borderRadius: 6,
          boxShadow: '0 0 0 2px var(--border)',
        }} />
      )}
    </button>
  );
}
