"use client";
import React, { useEffect, useRef } from "react";

/**
 * BackgroundTech
 * Lightweight canvas network with subtle connections and hiring-themed glyphs.
 * Designed for light dashboards. Runs at low opacity and low CPU.
 */
export default function BackgroundTech() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const req = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    const N = Math.min(120, Math.floor((w * h) / 18000));
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    for (let i = 0; i < N; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 1.5,
      });
    }

    const glyphs = ["\uD83D\uDCBC", "\u270D\uFE0F", "\uD83D\uDCC8", "\uD83D\uDCDD"]; // briefcase, writing hand, chart, memo
    const glyphPts = Array.from({ length: 6 }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      t: Math.random() * 1000,
      s: 12 + Math.random() * 8,
      g: glyphs[Math.floor(Math.random() * glyphs.length)],
    }));

    const loop = () => {
      req.current = requestAnimationFrame(loop);
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // connections
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -10) a.x = w + 10; if (a.x > w + 10) a.x = -10;
        if (a.y < -10) a.y = h + 10; if (a.y > h + 10) a.y = -10;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x; const dy = a.y - b.y; const d2 = dx*dx + dy*dy;
          if (d2 < 120*120) {
            const alpha = 1 - d2 / (120*120);
            ctx.strokeStyle = `rgba(17,24,39,${0.08 * alpha})`; // gray-900 at low opacity
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(79,70,229,0.12)"; // indigo-600 faint
        ctx.fill();
      }

      // hiring glyphs slow float
      glyphPts.forEach(p => {
        p.t += 0.0035;
        p.x += Math.sin(p.t) * 0.1;
        p.y += Math.cos(p.t*0.8) * 0.1;
        ctx.font = `${p.s}px ui-sans-serif, system-ui, -apple-system`;
        ctx.fillStyle = "rgba(55,65,81,0.28)"; // gray-700 faint
        ctx.fillText(p.g, p.x, p.y);
      });
    };

    req.current = requestAnimationFrame(loop);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(req.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}
