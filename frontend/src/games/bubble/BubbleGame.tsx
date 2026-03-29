import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BubbleGame.css';

const GAME_DURATION = 60;

const NORMAL_WORDS = [
  'LLM', 'RAG', 'Prompt', 'Context', 'Tokens', 'Embeddings',
  'Agent', 'Fine-Tuning', 'Vector DB', 'Few-Shot', 'LoRA', 'Diffuser',
];
const GOLDEN_WORDS = ['AGI', 'SOTA', 'Compute', 'Transformers'];
const HALLUCINATION_WORDS = ['Sentience', 'Nukes', 'Oops', 'Glitch', 'Spaghetti', '404 AI'];

type BubbleType = 'normal' | 'golden' | 'hallucination';

interface Bubble {
  id: string;
  word: string;
  type: BubbleType;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

interface BubbleGameProps {
  onGameEnd: (result: { score: number }) => void;
  onScoreChange?: (score: number) => void;
}

export default function BubbleGame({ onGameEnd, onScoreChange }: BubbleGameProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [shake, setShake] = useState(false);

  const bubbleIdCounter = useRef(0);
  // Use refs so callbacks don't go stale and intervals don't reset every second
  const timeLeftRef = useRef(GAME_DURATION);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<'idle' | 'playing' | 'ended'>('idle');

  // Keep refs in sync
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const spawnBubble = useCallback(() => {
    const id = `b-${Date.now()}-${bubbleIdCounter.current++}`;
    const roll = Math.random();
    let type: BubbleType = 'normal';
    let wordList = NORMAL_WORDS;

    const timeProgress = 1 - (timeLeftRef.current / GAME_DURATION);
    // Hallucination scales from 10% → 40% by end
    const hallucinationChance = 0.10 + (timeProgress * 0.30);

    if (roll < hallucinationChance) {
      type = 'hallucination';
      wordList = HALLUCINATION_WORDS;
    } else if (roll > 0.85) {
      type = 'golden';
      wordList = GOLDEN_WORDS;
    }

    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const size = type === 'golden' ? 90 : (type === 'hallucination' ? 100 : 80 + Math.random() * 40);
    // Start at 11s, ramp aggressively to 2s minimum by end
    const baseDuration = type === 'golden' ? 8 : (type === 'hallucination' ? 9 : 11);
    const duration = Math.max(2, baseDuration - (timeProgress * 9) + (Math.random() * 1.5));
    const x = 5 + Math.random() * 85;

    const newBubble: Bubble = { id, word, type, x, size, duration, delay: 0 };
    setBubbles((prev) => [...prev, newBubble]);
  }, []); // stable — reads refs, no re-creation on each tick

  // Spawn loop: self-scheduling timeout so changing timeLeft doesn't reset the interval
  useEffect(() => {
    if (gameState !== 'playing') return;

    const getSpawnRate = () => {
      const progress = 1 - (timeLeftRef.current / GAME_DURATION);
      // 1200ms → 200ms over the full 60s
      return Math.max(200, 1200 - (progress * 1000));
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        if (gameStateRef.current === 'playing') {
          spawnBubble();
          scheduleNext();
        }
      }, getSpawnRate());
    };

    spawnBubble(); // spawn one immediately when game starts
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [gameState, spawnBubble]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tick);
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [gameState]);

  // Game over
  useEffect(() => {
    if (gameState === 'ended') {
      onGameEnd({ score });
    }
  }, [gameState, score, onGameEnd]);

  const handlePop = (id: string, type: BubbleType) => {
    if (gameState !== 'playing') return;
    setBubbles((prev) => prev.filter((b) => b.id !== id));

    let points = 0;
    if (type === 'normal') points = 10;
    if (type === 'golden') points = 50;
    if (type === 'hallucination') {
      points = -20;
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }

    const newScore = Math.max(0, scoreRef.current + points);
    setScore(newScore);
    onScoreChange?.(newScore);
  };

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(GAME_DURATION);
    timeLeftRef.current = GAME_DURATION;
    setScore(0);
    scoreRef.current = 0;
    setBubbles([]);
    onScoreChange?.(0);
  };

  return (
    <div className={`bubble-game-container ${shake ? 'shake-screen' : ''}`}>
      <div className="bubble-particles" />

      {/* HUD */}
      <div className="bubble-game-hud">
        <div className="bubble-score">Score: {score}</div>
        <div className={`bubble-timer ${timeLeft <= 10 ? 'hurry' : ''}`}>
          ⏰ {timeLeft}s
        </div>
      </div>

      {/* Start Screen */}
      {gameState === 'idle' && (
        <div className="bubble-start-screen">
          <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Pop the AI Bubble</h2>
          <p style={{ maxWidth: 400, marginBottom: '24px', opacity: 0.8 }}>
            Pop the buzzwords before they escape! <br />
            🟦 Normal (+10) &nbsp; 🟨 Golden (+50) <br />
            🟥 <i>Hallucination (-20)</i>
          </p>
          <button className="bubble-btn" onClick={startGame}>Start Popping</button>
        </div>
      )}

      {/* Bubbles */}
      {gameState === 'playing' && (
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              className={`ai-bubble bubble-${b.type}`}
              initial={{ top: 520, x: '-50%', scale: 0.5, opacity: 0 }}
              animate={{
                top: -120,
                x: ['-50%', '-60%', '-40%', '-50%'],
                scale: 1,
                opacity: 1,
              }}
              exit={{ scale: 1.6, opacity: 0, filter: 'brightness(2.5)' }}
              transition={{
                top: { duration: b.duration, ease: 'linear' },
                x: { duration: b.duration / 2, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                width: b.size,
                height: b.size,
                fontSize: b.size > 90 ? '16px' : '14px',
              }}
              onClick={() => handlePop(b.id, b.type)}
              onAnimationComplete={(definition: any) => {
                if (definition.top === -120) {
                  setBubbles((prev) => prev.filter((bub) => bub.id !== b.id));
                }
              }}
            >
              {b.word}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
