import { useEffect, useRef, useCallback } from 'react';

const W = 800;
const H = 300;
const GROUND_Y = 240;
const GRAVITY = 0.7;
const JUMP_FORCE = -14;
const DINO_W = 44;
const DINO_H = 52;
const CACTUS_W = 24;
const CACTUS_MIN_H = 40;
const CACTUS_MAX_H = 70;
const INITIAL_SPEED = 5;

interface DinoGameProps {
  onGameEnd: (result: { distance: number; time_s: number }) => void;
  onScoreChange?: (score: number) => void;
}

interface Cactus {
  x: number;
  h: number;
}

export default function DinoGame({ onGameEnd, onScoreChange }: DinoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    dinoY: GROUND_Y - DINO_H,
    velY: 0,
    onGround: true,
    cacti: [] as Cactus[],
    distance: 0,
    speed: INITIAL_SPEED,
    alive: true,
    startTime: Date.now(),
    frame: 0,
    nextCactus: 120,
  });
  const rafRef = useRef<number>();

  const drawPixelDino = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) => {
    ctx.fillStyle = '#4ecdc4';
    // Body
    ctx.fillRect(x + 8, y, DINO_W - 8, DINO_H - 10);
    // Head
    ctx.fillRect(x + 16, y - 14, 26, 18);
    // Eye
    ctx.fillStyle = '#0d0f17';
    ctx.fillRect(x + 34, y - 10, 5, 5);
    // Tail
    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(x, y + 16, 12, 8);
    // Legs (animate)
    const leg = frame % 20 < 10;
    ctx.fillRect(x + 12, y + DINO_H - 10, 10, 10);
    ctx.fillRect(x + 26, y + DINO_H - 10 + (leg ? 0 : 6), 10, 10 - (leg ? 0 : 6));
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    ctx.fillStyle = '#0d0f17';
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, GROUND_Y, W, 2);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(((i * 137 + s.distance * 0.1) % W), 30 + ((i * 83) % 80), 2, 2);
    }

    // Cacti
    s.cacti.forEach(c => {
      // Cactus body
      ctx.fillStyle = '#f7706f';
      ctx.fillRect(c.x, GROUND_Y - c.h, CACTUS_W, c.h);
      // Arms
      ctx.fillRect(c.x - 10, GROUND_Y - c.h * 0.65, 10, 8);
      ctx.fillRect(c.x + CACTUS_W, GROUND_Y - c.h * 0.65, 10, 8);
      // Glow
      ctx.shadowColor = '#f7706f';
      ctx.shadowBlur = 8;
      ctx.fillRect(c.x, GROUND_Y - c.h, CACTUS_W, c.h);
      ctx.shadowBlur = 0;
    });

    // Dino
    drawPixelDino(ctx, 80, s.dinoY, s.frame);

    // Score
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '700 18px Space Grotesk, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(s.distance)}`, W - 24, 36);
    ctx.textAlign = 'left';
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;

    // Physics
    s.velY += GRAVITY;
    s.dinoY += s.velY;
    s.frame++;

    if (s.dinoY >= GROUND_Y - DINO_H) {
      s.dinoY = GROUND_Y - DINO_H;
      s.velY = 0;
      s.onGround = true;
    } else {
      s.onGround = false;
    }

    // Move + spawn cacti
    s.distance += s.speed;
    s.speed = INITIAL_SPEED + s.distance / 2000;

    s.cacti = s.cacti
      .map(c => ({ ...c, x: c.x - s.speed }))
      .filter(c => c.x > -50);

    s.nextCactus--;
    if (s.nextCactus <= 0) {
      const h = CACTUS_MIN_H + Math.random() * (CACTUS_MAX_H - CACTUS_MIN_H);
      s.cacti.push({ x: W + 20, h });
      s.nextCactus = 80 + Math.floor(Math.random() * 80) - Math.floor(s.speed * 4);
    }

    // Collision
    for (const c of s.cacti) {
      if (
        80 + 8 < c.x + CACTUS_W &&
        80 + DINO_W - 8 > c.x &&
        s.dinoY + 10 < GROUND_Y &&
        s.dinoY + DINO_H > GROUND_Y - c.h
      ) {
        s.alive = false;
        draw();
        const timeS = (Date.now() - s.startTime) / 1000;
        onGameEnd({ distance: Math.floor(s.distance), time_s: timeS });
        return;
      }
    }

    onScoreChange?.(Math.floor(s.distance));
    draw();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, onGameEnd, onScoreChange]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w') && s.onGround && s.alive) {
        e.preventDefault();
        s.velY = JUMP_FORCE;
      }
    };
    const handleTouch = () => {
      const s = stateRef.current;
      if (s.onGround && s.alive) s.velY = JUMP_FORCE;
    };

    window.addEventListener('keydown', handleKey);
    canvasRef.current?.addEventListener('click', handleTouch);
    return () => {
      window.removeEventListener('keydown', handleKey);
      canvasRef.current?.removeEventListener('click', handleTouch);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

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
          cursor: 'pointer',
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Space / ↑ / Click canvas to jump</p>
    </div>
  );
}
