"use client"

import { useEffect, useRef } from "react"

interface RadarChartProps {
  skillsRequired: string[]
  skillsMatched: string[]
  size?: number
}

export function RadarChart({ skillsRequired = [], skillsMatched = [], size = 280 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Setup High DPI scale for crisp text and lines
    const dpi = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    canvas.width = size * dpi
    canvas.height = size * dpi
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpi, dpi)

    // Clear Canvas
    ctx.clearRect(0, 0, size, size)

    // Filter down to unique non-empty skills, limit to max 7 skills for neat display
    const skills = Array.from(new Set(skillsRequired.map(s => s.trim()).filter(Boolean))).slice(0, 7)
    if (skills.length < 3) {
      // Draw simple bar list placeholder if too few coordinates
      ctx.font = "12px sans-serif"
      ctx.fillStyle = "#64748b"
      ctx.fillText("Requires 3+ skills for Radar view.", 15, size / 2)
      return
    }

    const center = size / 2
    const radius = size * 0.35
    const totalAxes = skills.length

    // Helper to calculate coordinates
    const getCoordinates = (index: number, valPercent: number) => {
      const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2
      const r = radius * valPercent
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      }
    }

    // 1. Draw Grid concentric polygons (concentric concentric webs)
    const levels = [0.25, 0.5, 0.75, 1.0]
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1

    levels.forEach((level) => {
      ctx.beginPath()
      for (let i = 0; i < totalAxes; i++) {
        const { x, y } = getCoordinates(i, level)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    })

    // 2. Draw Axis Lines
    ctx.beginPath()
    for (let i = 0; i < totalAxes; i++) {
      const { x, y } = getCoordinates(i, 1.0)
      ctx.moveTo(center, center)
      ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 3. Draw Target Required Polygon (Violet Theme)
    ctx.beginPath()
    for (let i = 0; i < totalAxes; i++) {
      const { x, y } = getCoordinates(i, 1.0)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = "rgba(139, 92, 246, 0.12)" // Semi-transparent Violet
    ctx.fill()
    ctx.strokeStyle = "#8b5cf6" // Violet border
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 4. Draw Candidate Score Polygon (Fuchsia Theme)
    // Matched skills get 1.0 radius, unmatched get 0.15 radius
    ctx.beginPath()
    for (let i = 0; i < totalAxes; i++) {
      const skillName = skills[i].toLowerCase()
      const isMatched = skillsMatched.some((m) => m.toLowerCase().includes(skillName) || skillName.includes(m.toLowerCase()))
      const percent = isMatched ? 1.0 : 0.15
      const { x, y } = getCoordinates(i, percent)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = "rgba(217, 70, 239, 0.28)" // Fuchsia fill
    ctx.fill()
    ctx.strokeStyle = "#d946ef" // Fuchsia border
    ctx.lineWidth = 2
    ctx.stroke()

    // 5. Draw Candidate points
    for (let i = 0; i < totalAxes; i++) {
      const skillName = skills[i].toLowerCase()
      const isMatched = skillsMatched.some((m) => m.toLowerCase().includes(skillName) || skillName.includes(m.toLowerCase()))
      const percent = isMatched ? 1.0 : 0.15
      const { x, y } = getCoordinates(i, percent)

      ctx.beginPath()
      ctx.arc(x, y, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = isMatched ? "#d946ef" : "#cbd5e1"
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 6. Draw Text Labels
    ctx.font = "bold 9px sans-serif"
    ctx.fillStyle = "#1e293b"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    for (let i = 0; i < totalAxes; i++) {
      const { x, y } = getCoordinates(i, 1.18) // position slightly outside
      const skill = skills[i]
      ctx.fillText(skill, x, y)
    }
  }, [skillsRequired, skillsMatched, size])

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-xl border border-slate-100">
      <canvas ref={canvasRef} />
      <div className="flex gap-4 mt-2 text-[10px] font-semibold">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-muted-foreground">Required Profile</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
          <span className="text-muted-foreground">Candidate Profile</span>
        </div>
      </div>
    </div>
  )
}
