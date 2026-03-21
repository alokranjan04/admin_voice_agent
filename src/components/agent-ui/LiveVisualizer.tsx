import React, { useEffect, useRef } from 'react';

interface LiveVisualizerProps {
  volumeRef: React.RefObject<number>; // Accept a ref instead of a value
  isActive: boolean;
}

const LiveVisualizer: React.FC<LiveVisualizerProps> = ({ volumeRef, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<{ x: number, y: number, r: number, vx: number, vy: number, alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
        for (let i = 0; i < 20; i++) {
            particlesRef.current.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 1,
                vx: Math.random() * 0.5 - 0.25,
                vy: Math.random() * 0.5 - 0.25,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
    }

    let animationId: number;
    let currentVolume = 0;

    const render = () => {
      // Smooth volume transition using ref
      const targetVolume = volumeRef.current || 0;
      currentVolume += (targetVolume - currentVolume) * 0.15;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (isActive) {
        // Advanced Glow Orb
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80 + currentVolume * 150);
        gradient.addColorStop(0, 'rgba(20, 184, 166, 0.9)'); // Teal 500
        gradient.addColorStop(0.2, 'rgba(45, 212, 191, 0.4)'); // Teal 400
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.1)'); // Indigo 500
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, 100 + currentVolume * 120, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pulsing Core
        const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40 + currentVolume * 40);
        coreGradient.addColorStop(0, '#115e59'); // Teal 800
        coreGradient.addColorStop(1, '#0d9488'); // Teal 600

        ctx.beginPath();
        ctx.arc(centerX, centerY, 35 + currentVolume * 30, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.shadowBlur = 20 + currentVolume * 40;
        ctx.shadowColor = 'rgba(20, 184, 166, 0.6)';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Dynamic Ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const r = 50 + currentVolume * 80 + Math.sin(Date.now() / 300) * 5;
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        // Particles
        particlesRef.current.forEach(p => {
            p.x += p.vx * (1 + currentVolume * 5);
            p.y += p.vy * (1 + currentVolume * 5);
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * (0.5 + currentVolume)})`;
            ctx.fill();
        });

      } else {
        // Inactive state - Gentle pulse
        const inactivePulse = Math.sin(Date.now() / 1000) * 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30 + inactivePulse, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0'; // Slate 200
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive]); // Only depend on isActive

  return (
    <div className="relative w-full h-48 sm:h-64 flex items-center justify-center overflow-hidden rounded-3xl group">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/10 pointer-events-none" />
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="w-full h-full relative z-10"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="px-4 py-2 bg-white/60 backdrop-blur-md rounded-full shadow-sm border border-white">
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Awaiting Audio</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveVisualizer;
