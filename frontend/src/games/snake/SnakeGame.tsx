import { useEffect, useRef, useCallback } from 'react';

const CELL = 22;
const COLS = 20;
const ROWS = 20;
const W = CELL * COLS;
const H = CELL * ROWS;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };

interface GameResult {
  pellets_eaten: number;
  time_survived_s: number;
}

interface SnakeGameProps {
  onGameEnd: (result: GameResult) => void;
  onScoreChange?: (score: number) => void;
}

function randPos(snake: Pos[]): Pos {
  let pos: Pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function SnakeGame({ onGameEnd, onScoreChange }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pos[],
    dir: 'RIGHT' as Dir,
    nextDir: 'RIGHT' as Dir,
    pellet: { x: 15, y: 10 } as Pos,
    pellets: 0,
    startTime: Date.now(),
    alive: true,
    speed: 140,
    tickCount: 0,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    ctx.fillStyle = '#0d0f17';
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    // Pellet
    const px = s.pellet.x * CELL + CELL / 2;
    const py = s.pellet.y * CELL + CELL / 2;
    const grd = ctx.createRadialGradient(px, py, 0, px, py, CELL * 0.4);
    grd.addColorStop(0, '#f7706f');
    grd.addColorStop(1, '#e85555');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(px, py, CELL * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Pellet glow
    ctx.shadowColor = '#f7706f';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    s.snake.forEach((seg, i) => {
      const t = 1 - i / s.snake.length;
      const r = CELL * 0.42;
      const cx = seg.x * CELL + CELL / 2;
      const cy = seg.y * CELL + CELL / 2;

      if (i === 0) {
        // Head
        const headGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        headGrd.addColorStop(0, '#a5f3fc');
        headGrd.addColorStop(1, '#4ecdc4');
        ctx.fillStyle = headGrd;
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = `rgba(78, 205, 196, ${0.35 + t * 0.65})`;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, [i === 0 ? 8 : 5]);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const dx = s.dir === 'RIGHT' ? 1 : s.dir === 'LEFT' ? -1 : 0;
    const dy = s.dir === 'DOWN' ? 1 : s.dir === 'UP' ? -1 : 0;
    const newHead: Pos = { x: head.x + dx, y: head.y + dy };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      s.alive = false;
      draw();
      const timeSurvivedS = Math.floor((Date.now() - s.startTime) / 1000);
      onGameEnd({ pellets_eaten: s.pellets, time_survived_s: timeSurvivedS });
      return;
    }

    // Self-collision
    if (s.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      s.alive = false;
      draw();
      const timeSurvivedS = Math.floor((Date.now() - s.startTime) / 1000);
      onGameEnd({ pellets_eaten: s.pellets, time_survived_s: timeSurvivedS });
      return;
    }

    const atePellet = newHead.x === s.pellet.x && newHead.y === s.pellet.y;
    s.snake = [newHead, ...s.snake.slice(0, atePellet ? undefined : -1)];

    if (atePellet) {
      s.pellets++;
      s.pellet = randPos(s.snake);
      // Speed up every 5 pellets
      if (s.pellets % 5 === 0) s.speed = Math.max(60, s.speed - 8);
      onScoreChange?.(s.pellets * 10);
    }

    s.tickCount++;
    draw();

    timerRef.current = setTimeout(tick, s.speed);
  }, [draw, onGameEnd, onScoreChange]);

  useEffect(() => {
    draw();
    timerRef.current = setTimeout(tick, stateRef.current.speed);

    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
      };
      const newDir = map[e.key];
      if (!newDir) return;
      e.preventDefault();
      // Prevent 180 reversal
      const opposite: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      if (newDir !== opposite[s.dir]) s.nextDir = newDir;
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(timerRef.current);
    };
  }, [draw, tick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'block',
          maxWidth: '100%',
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Arrow keys or WASD to move</p>
    </div>
  );
}
