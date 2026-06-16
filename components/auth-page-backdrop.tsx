"use client"

/**
 * Lightweight auth page backdrop — CSS only, no Three.js.
 * Uses GPU-friendly transforms and a small optional 2D canvas.
 */

import { useEffect, useRef } from "react"

type AuthPageBackdropProps = {
  brandColor?: string
  /** Fewer particles = better performance on low-end devices */
  particleCount?: number
  /** Particles gently follow cursor */
  interactive?: boolean
}

export function AuthPageBackdrop({
  brandColor = "#5b21b6",
  particleCount = 48,
  interactive = false,
}: AuthPageBackdropProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0614]">
      {/* Animated gradient blobs — CSS only */}
      <div
        className="absolute -left-[20%] top-[10%] h-[55vh] w-[55vh] rounded-full opacity-40 blur-3xl animate-auth-blob-1"
        style={{ background: `radial-gradient(circle, ${brandColor}99 0%, transparent 70%)` }}
      />
      <div
        className="absolute -right-[15%] top-[35%] h-[45vh] w-[45vh] rounded-full opacity-30 blur-3xl animate-auth-blob-2"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.55) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[5%] left-[30%] h-[40vh] w-[40vh] rounded-full opacity-25 blur-3xl animate-auth-blob-3"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)" }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:44px_44px]" />

      {/* Diagonal shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-violet-500/[0.06]" />

      {/* Light 2D particles */}
      <AuthParticles brandColor={brandColor} count={particleCount} interactive={interactive} />

      {/* Decorative SVG rings — static, zero JS cost */}
      <svg className="absolute left-[8%] top-[22%] h-40 w-40 text-violet-500/10" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" />
      </svg>
      <svg className="absolute right-[12%] bottom-[18%] h-32 w-32 text-fuchsia-400/10" viewBox="0 0 100 100" fill="none">
        <rect x="10" y="10" width="80" height="80" rx="16" stroke="currentColor" strokeWidth="0.5" transform="rotate(12 50 50)" />
      </svg>

      <style jsx>{`
        @keyframes auth-blob-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(3%, 5%) scale(1.08); }
        }
        @keyframes auth-blob-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-4%, -3%) scale(1.05); }
        }
        @keyframes auth-blob-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(2%, -4%) scale(1.06); }
        }
        .animate-auth-blob-1 { animation: auth-blob-1 18s ease-in-out infinite; }
        .animate-auth-blob-2 { animation: auth-blob-2 22s ease-in-out infinite; }
        .animate-auth-blob-3 { animation: auth-blob-3 20s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

function AuthParticles({
  brandColor,
  count,
  interactive,
}: {
  brandColor: string
  count: number
  interactive?: boolean
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let w = 0
    let h = 0
    let raf = 0

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / w - 0.5) * 2
      mouse.current.y = (e.clientY / h - 0.5) * 2
    }

    const hex = brandColor.replace("#", "")
    const hr = parseInt(hex.substring(0, 2) || "5b", 16)
    const hg = parseInt(hex.substring(2, 4) || "21", 16)
    const hb = parseInt(hex.substring(4, 6) || "b6", 16)

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 1.5,
      a: 0.15 + Math.random() * 0.35,
    }))

    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        if (interactive) {
          p.vx += mouse.current.x * 0.008
          p.vy += mouse.current.y * 0.008
          p.vx *= 0.98
          p.vy *= 0.98
        }
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hr},${hg},${hb},${p.a})`
        ctx.fill()
      }

      if (interactive && count <= 80) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i]
            const b = particles[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const d2 = dx * dx + dy * dy
            if (d2 < 120 * 120) {
              const alpha = (1 - d2 / (120 * 120)) * 0.15
              ctx.strokeStyle = `rgba(255,255,255,${alpha})`
              ctx.lineWidth = 0.5
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.stroke()
            }
          }
        }
      }
    }

    const onResize = () => resize()
    window.addEventListener("resize", onResize)
    if (interactive) window.addEventListener("mousemove", onMouseMove)
    raf = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", onResize)
      if (interactive) window.removeEventListener("mousemove", onMouseMove)
      cancelAnimationFrame(raf)
    }
  }, [brandColor, count, interactive])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-80" />
}
