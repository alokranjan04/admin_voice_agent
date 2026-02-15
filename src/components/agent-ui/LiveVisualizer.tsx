import React, { useEffect, useRef } from 'react';

interface LiveVisualizerProps {
  volume: number; // 0 to 1
  isActive: boolean;
}

const LiveVisualizer: React.FC<LiveVisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let currentVolume = 0;

    const render = () => {
      // Smooth volume transition
      currentVolume += (volume - currentVolume) * 0.1;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (isActive) {
        // Base circle
        ctx.beginPath();
        const baseRadius = 50 + (currentVolume * 100);
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(13, 148, 136, 0.2)'; // Teal-600 with opacity
        ctx.fill();

        // Core circle
        ctx.beginPath();
        const coreRadius = 40 + (currentVolume * 50);
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(13, 148, 136, 0.6)';
        ctx.fill();

        // Inner solid
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#0f766e'; // Teal-700
        ctx.fill();

        // Ripple effect lines
        ctx.strokeStyle = 'rgba(13, 148, 136, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          const r = 30 + (i * 15) + (Math.sin(Date.now() / 200 + i) * 5);
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
        }

      } else {
        // Inactive state
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1'; // Slate-300
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [volume, isActive]);

  return (
    <div className="relative w-full h-48 sm:h-64 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="w-full h-full"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400 font-medium">Agent Offline</p>
        </div>
      )}
    </div>
  );
};

export default LiveVisualizer;
