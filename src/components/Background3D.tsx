import { useEffect, useRef } from 'react';

/**
 * 3D BACKGROUND LOCATION:
 * Replace the <canvas> below with your own Spline <iframe>, Three.js canvas,
 * or WebGL scene anytime—it is fixed at z-0 behind the entire dashboard.
 */
export function Background3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Floating 3D particles (Saffron-Gold & Emerald)
    const particles = Array.from({ length: 70 }, (_, i) => ({
      x: (Math.random() - 0.5) * 1400,
      y: (Math.random() - 0.5) * 900,
      z: Math.random() * 1200 + 100,
      color: i % 3 === 0 ? '16, 185, 129' : '245, 158, 11',
    }));

    let gridOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Warm Obsidian Radial Ambient Glows (No Blue)
      const glowLeft = ctx.createRadialGradient(
        width * 0.18,
        height * 0.2,
        10,
        width * 0.18,
        height * 0.2,
        width * 0.45
      );
      glowLeft.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      glowLeft.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = glowLeft;
      ctx.fillRect(0, 0, width, height);

      const glowRight = ctx.createRadialGradient(
        width * 0.85,
        height * 0.75,
        10,
        width * 0.85,
        height * 0.75,
        width * 0.4
      );
      glowRight.addColorStop(0, 'rgba(16, 185, 129, 0.10)');
      glowRight.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = glowRight;
      ctx.fillRect(0, 0, width, height);

      // 3D Moving Perspective Floor Grid
      const horizonY = height * 0.58;
      const centerX = width * 0.5;
      gridOffset = (gridOffset + 0.65) % 48;

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.10)';
      ctx.lineWidth = 1;

      // Vertical perspective lines
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * 55, horizonY);
        ctx.lineTo(centerX + i * 240, height + 40);
        ctx.stroke();
      }

      // Horizontal depth lines moving toward viewer
      for (let z = 1; z <= 14; z++) {
        const depth = (z * 48 - gridOffset) / 672;
        if (depth <= 0.02) continue;
        const y = horizonY + Math.pow(depth, 1.9) * (height - horizonY + 80);
        ctx.strokeStyle = `rgba(245, 158, 11, ${(depth * 0.18).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3D Starfield / Counter Nodes moving forward in Z-space
      for (const p of particles) {
        p.z -= 1.4;
        if (p.z <= 40) {
          p.z = 1200;
          p.x = (Math.random() - 0.5) * 1400;
          p.y = (Math.random() - 0.5) * 900;
        }

        const scale = 420 / p.z;
        const sx = centerX + p.x * scale;
        const sy = height * 0.45 + p.y * scale;
        const radius = Math.max(0.8, scale * 2.4);
        const alpha = Math.min(0.75, (1200 - p.z) / 1000);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color}, ${alpha.toFixed(2)})`;
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#09090B]">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}