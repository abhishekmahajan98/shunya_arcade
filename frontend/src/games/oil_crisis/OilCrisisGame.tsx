import { useEffect, useRef, useCallback } from 'react';

const W = 800;
const H = 500;
const TANKER_W = 60;
const TANKER_H = 30;
const TANKER_X = 80;
const MOVE_SPEED = 5;
const INITIAL_SCROLL = 3;
const BARREL_R = 14;
const MINE_R = 16;
const BOAT_W = 50;
const BOAT_H = 22;

interface OilCrisisGameProps {
  onGameEnd: (result: { barrels_collected: number; distance: number }) => void;
  onScoreChange?: (score: number) => void;
}

interface Barrel {
  x: number;
  y: number;
  collected: boolean;
}

interface Mine {
  x: number;
  y: number;
}

interface PatrolBoat {
  x: number;
  y: number;
  vy: number;
}

export default function OilCrisisGame({ onGameEnd, onScoreChange }: OilCrisisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    tankerY: H / 2 - TANKER_H / 2,
    barrels: [] as Barrel[],
    mines: [] as Mine[],
    boats: [] as PatrolBoat[],
    barrelsCollected: 0,
    distance: 0,
    speed: INITIAL_SCROLL,
    alive: true,
    frame: 0,
    keysDown: new Set<string>(),
    nextBarrel: 60,
    nextMine: 100,
    nextBoat: 200,
    started: false,
  });

  const rafRef = useRef<number>();

  const drawWater = (ctx: CanvasRenderingContext2D, frame: number) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a2e5c');
    grad.addColorStop(0.5, '#0d3b6e');
    grad.addColorStop(1, '#062040');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = 40 + i * 60;
      ctx.beginPath();
      for (let x = 0; x < W; x += 4) {
        const wave = Math.sin((x + frame * 2 + i * 40) / 60) * 4;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  };

  const drawTanker = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(x, y + TANKER_H / 2);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x + TANKER_W - 5, y);
    ctx.lineTo(x + TANKER_W + 10, y + TANKER_H / 2);
    ctx.lineTo(x + TANKER_W - 5, y + TANKER_H);
    ctx.lineTo(x + 10, y + TANKER_H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bridge
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x + 12, y + 4, 18, TANKER_H - 8);
    ctx.fillStyle = '#5cf';
    ctx.fillRect(x + 15, y + 6, 5, 5);
    ctx.fillRect(x + 22, y + 6, 5, 5);

    // Smokestack
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 18, y - 6, 6, 8);
    ctx.fillStyle = 'rgba(150,150,150,0.4)';
    ctx.beginPath();
    ctx.arc(x + 21, y - 10, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBarrel = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x, y, BARREL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OIL', x, y);
  };

  const drawMine = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) => {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x, y, MINE_R, 0, Math.PI * 2);
    ctx.fill();

    // Spikes
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      const sx = x + Math.cos(angle) * (MINE_R + 5);
      const sy = y + Math.sin(angle) * (MINE_R + 5);
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blinking red light
    if (frame % 40 < 20) {
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  const drawPatrolBoat = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(x, y + BOAT_H / 2);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x + BOAT_W, y);
    ctx.lineTo(x + BOAT_W + 8, y + BOAT_H / 2);
    ctx.lineTo(x + BOAT_W, y + BOAT_H);
    ctx.lineTo(x + 8, y + BOAT_H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Turret
    ctx.fillStyle = '#600';
    ctx.fillRect(x + 20, y - 4, 12, 6);
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, barrels: number, distance: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 40);

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 18px Space Grotesk, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Barrels: ${barrels}`, 16, 20);

    ctx.fillStyle = '#88ccff';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(distance)}m`, W - 16, 20);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    const score = barrels * 10 + Math.floor(distance / 100);
    ctx.fillText(`Score: ${score}`, W / 2, 20);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    drawWater(ctx, s.frame);

    // Land strips (Strait of Hormuz coasts)
    ctx.fillStyle = '#3a2e1a';
    ctx.fillRect(0, 0, W, 20);
    ctx.fillStyle = '#554430';
    ctx.fillRect(0, 14, W, 8);

    ctx.fillStyle = '#3a2e1a';
    ctx.fillRect(0, H - 20, W, 20);
    ctx.fillStyle = '#554430';
    ctx.fillRect(0, H - 22, W, 8);

    s.barrels.forEach(b => {
      if (!b.collected) drawBarrel(ctx, b.x, b.y);
    });

    s.mines.forEach(m => drawMine(ctx, m.x, m.y, s.frame));
    s.boats.forEach(b => drawPatrolBoat(ctx, b.x, b.y));

    drawTanker(ctx, TANKER_X, s.tankerY);
    drawHUD(ctx, s.barrelsCollected, s.distance);

    if (!s.started && s.alive) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OIL CRISIS: Strait Runner', W / 2, H / 2 - 50);
      ctx.font = '18px Space Grotesk, sans-serif';
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('Navigate the Strait of Hormuz blockade!', W / 2, H / 2 - 15);
      ctx.fillStyle = '#88ccff';
      ctx.fillText('Arrow Keys / WASD to move. Collect barrels, dodge mines & boats.', W / 2, H / 2 + 20);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Space Grotesk, sans-serif';
      ctx.fillText('Press any movement key to start', W / 2, H / 2 + 60);
      ctx.textAlign = 'left';
    }
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) return;

    if (s.started) {
      s.frame++;
      s.distance += s.speed;
      s.speed = INITIAL_SCROLL + s.distance / 3000;

      // Tanker movement
      const keys = s.keysDown;
      if (keys.has('ArrowUp') || keys.has('w')) s.tankerY -= MOVE_SPEED;
      if (keys.has('ArrowDown') || keys.has('s')) s.tankerY += MOVE_SPEED;
      if (keys.has('ArrowLeft') || keys.has('a')) { /* left doesn't move horizontally */ }
      if (keys.has('ArrowRight') || keys.has('d')) { /* right doesn't move horizontally */ }

      // Clamp tanker to water area
      s.tankerY = Math.max(28, Math.min(H - 28 - TANKER_H, s.tankerY));

      // Spawn barrels
      s.nextBarrel--;
      if (s.nextBarrel <= 0) {
        s.barrels.push({
          x: W + BARREL_R,
          y: 50 + Math.random() * (H - 100),
          collected: false,
        });
        s.nextBarrel = 40 + Math.floor(Math.random() * 50);
      }

      // Spawn mines
      s.nextMine--;
      if (s.nextMine <= 0) {
        s.mines.push({
          x: W + MINE_R,
          y: 50 + Math.random() * (H - 100),
        });
        s.nextMine = Math.max(30, 80 - Math.floor(s.distance / 500));
      }

      // Spawn patrol boats
      s.nextBoat--;
      if (s.nextBoat <= 0) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        s.boats.push({
          x: W + BOAT_W,
          y: 50 + Math.random() * (H - 100),
          vy: dir * (1.5 + Math.random()),
        });
        s.nextBoat = Math.max(60, 180 - Math.floor(s.distance / 400));
      }

      // Move barrels
      s.barrels = s.barrels
        .map(b => ({ ...b, x: b.x - s.speed }))
        .filter(b => b.x > -BARREL_R * 2);

      // Move mines
      s.mines = s.mines
        .map(m => ({ ...m, x: m.x - s.speed * 0.8 }))
        .filter(m => m.x > -MINE_R * 2);

      // Move patrol boats
      s.boats = s.boats.map(b => {
        let ny = b.y + b.vy;
        let nvy = b.vy;
        if (ny < 40 || ny + BOAT_H > H - 40) nvy = -nvy;
        return { ...b, x: b.x - s.speed * 1.2, y: ny, vy: nvy };
      }).filter(b => b.x > -BOAT_W * 2);

      // Tanker bounding box
      const tx1 = TANKER_X + 5;
      const ty1 = s.tankerY + 3;
      const tx2 = TANKER_X + TANKER_W + 5;
      const ty2 = s.tankerY + TANKER_H - 3;
      const tcx = (tx1 + tx2) / 2;
      const tcy = (ty1 + ty2) / 2;

      // Collect barrels
      for (const b of s.barrels) {
        if (b.collected) continue;
        const dx = b.x - tcx;
        const dy = b.y - tcy;
        if (Math.sqrt(dx * dx + dy * dy) < BARREL_R + TANKER_W / 2.5) {
          b.collected = true;
          s.barrelsCollected++;
          const score = s.barrelsCollected * 10 + Math.floor(s.distance / 100);
          onScoreChange?.(score);
        }
      }

      // Check mine collisions
      for (const m of s.mines) {
        const dx = m.x - tcx;
        const dy = m.y - tcy;
        if (Math.sqrt(dx * dx + dy * dy) < MINE_R + TANKER_W / 3) {
          s.alive = false;
          break;
        }
      }

      // Check patrol boat collisions
      for (const b of s.boats) {
        if (
          tx2 > b.x && tx1 < b.x + BOAT_W &&
          ty2 > b.y && ty1 < b.y + BOAT_H
        ) {
          s.alive = false;
          break;
        }
      }
    }

    draw();

    if (!s.alive) {
      onGameEnd({
        barrels_collected: s.barrelsCollected,
        distance: Math.floor(s.distance),
      });
    } else {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
  }, [draw, onGameEnd, onScoreChange]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);

    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        if (!s.started && s.alive) s.started = true;
        s.keysDown.add(key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      stateRef.current.keysDown.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          cursor: 'default',
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Arrow Keys / WASD to navigate</p>
    </div>
  );
}
