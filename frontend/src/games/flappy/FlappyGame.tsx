import { useEffect, useRef, useCallback } from 'react';

const W = 800;
const H = 500;
const GRAVITY = 0.5;
const JUMP_FORCE = -8.5;
const BIRD_RAD = 16;
const PIPE_W = 60;
const SPEED = 3.5;
const GAP_SIZE = 150;
const SPAWN_INTERVAL = 110;

interface FlappyGameProps {
  onGameEnd: (result: { pipes_cleared: number }) => void;
  onScoreChange?: (score: number) => void;
}

interface Pipe {
  x: number;
  gapY: number; // Center of the gap
  passed: boolean;
}

export default function FlappyGame({ onGameEnd, onScoreChange }: FlappyGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const stateRef = useRef({
    birdY: H / 2,
    velY: 0,
    pipes: [] as Pipe[],
    score: 0,
    alive: true,
    frameCount: 0,
    started: false,
  });
  
  const rafRef = useRef<number>();

  const drawBird = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Body
    ctx.fillStyle = '#fceabb'; 
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RAD, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcf00';
    ctx.beginPath();
    ctx.arc(-2, 2, BIRD_RAD - 4, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff7b00';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(24, 4);
    ctx.lineTo(10, 8);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-6, 2, 8, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    // Sky Background
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#70c5ce');
    gradient.addColorStop(1, '#e0f6f5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    
    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 4; i++) {
      const cx = (i * 240 + s.frameCount * 0.5) % (W + 200) - 100;
      ctx.beginPath();
      ctx.arc(cx, 80 + (i * 30 % 50), 30, 0, Math.PI * 2);
      ctx.arc(cx + 25, 60 + (i * 30 % 50), 40, 0, Math.PI * 2);
      ctx.arc(cx + 50, 80 + (i * 30 % 50), 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pipes
    ctx.fillStyle = '#5cba47';
    ctx.strokeStyle = '#39782c';
    ctx.lineWidth = 4;
    s.pipes.forEach(p => {
      // Top pipe
      const topHeight = p.gapY - GAP_SIZE / 2;
      ctx.fillRect(p.x, 0, PIPE_W, topHeight);
      ctx.strokeRect(p.x, 0, PIPE_W, topHeight);
      // Top pipe lip
      ctx.fillRect(p.x - 4, topHeight - 20, PIPE_W + 8, 20);
      ctx.strokeRect(p.x - 4, topHeight - 20, PIPE_W + 8, 20);

      // Bottom pipe
      const bottomHeight = H - (p.gapY + GAP_SIZE / 2);
      const bottomY = p.gapY + GAP_SIZE / 2;
      ctx.fillRect(p.x, bottomY, PIPE_W, bottomHeight);
      ctx.strokeRect(p.x, bottomY, PIPE_W, bottomHeight);
      // Bottom pipe lip
      ctx.fillRect(p.x - 4, bottomY, PIPE_W + 8, 20);
      ctx.strokeRect(p.x - 4, bottomY, PIPE_W + 8, 20);
    });

    // Bird
    let angle = 0;
    if (s.started) {
      angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (s.velY * 0.1)));
    }
    drawBird(ctx, 100, s.birdY, angle);

    // Score / Instructions 
    if (!s.started && s.alive) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '24px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Space or Click to Flap', W / 2, H / 2 - 40);
    } else {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.font = '900 48px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(`${s.score}`, W / 2, 80);
      ctx.fillText(`${s.score}`, W / 2, 80);
    }
    ctx.textAlign = 'left';
  }, []);


  const jump = () => {
    const s = stateRef.current;
    if (!s.alive) return;
    if (!s.started) {
      s.started = true;
    }
    s.velY = JUMP_FORCE;
  };

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;

    if (s.started) {
      s.velY += GRAVITY;
      s.birdY += s.velY;
      s.frameCount++;

      // Pipe generation
      if (s.frameCount % SPAWN_INTERVAL === 0) {
        // limit gap center between 100 and H - 100
        const minGapCenter = GAP_SIZE / 2 + 50;
        const maxGapCenter = H - GAP_SIZE / 2 - 50;
        const gapY = Math.random() * (maxGapCenter - minGapCenter) + minGapCenter;
        s.pipes.push({ x: W, gapY, passed: false });
      }

      // Move pipes and check score + collision
      const birdBox = {
        left: 100 - BIRD_RAD + 4,
        right: 100 + BIRD_RAD - 4,
        top: s.birdY - BIRD_RAD + 4,
        bottom: s.birdY + BIRD_RAD - 4,
      };

      for (let i = s.pipes.length - 1; i >= 0; i--) {
        const p = s.pipes[i];
        p.x -= SPEED;

        // Check horizontal pass for score
        if (!p.passed && p.x + PIPE_W < 100) {
          p.passed = true;
          s.score++;
          onScoreChange?.(s.score);
        }

        // Check collision bounding box
        const hitTop = (birdBox.top < p.gapY - GAP_SIZE / 2);
        const hitBottom = (birdBox.bottom > p.gapY + GAP_SIZE / 2);
        const hitHorizontal = (birdBox.right > p.x && birdBox.left < p.x + PIPE_W);

        if (hitHorizontal && (hitTop || hitBottom)) {
           // We died
           s.alive = false;
        }

        // Cleanup out of bounds
        if (p.x + PIPE_W < -50) {
          s.pipes.splice(i, 1);
        }
      }

      // Check Floor or Ceiling collision
      if (s.birdY + BIRD_RAD > H || s.birdY - BIRD_RAD < 0) {
        s.alive = false;
      }
    }

    draw();

    if (!s.alive) {
      onGameEnd({ pipes_cleared: s.score });
    } else {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
  }, [draw, onGameEnd, onScoreChange]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        jump();
      }
    };
    const handleTouch = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      jump();
    };

    window.addEventListener('keydown', handleKey);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', handleTouch, { passive: false });
      canvas.addEventListener('touchstart', handleTouch, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKey);
      if (canvas) {
        canvas.removeEventListener('mousedown', handleTouch);
        canvas.removeEventListener('touchstart', handleTouch);
      }
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          touchAction: 'none'
        }}
      />
    </div>
  );
}
