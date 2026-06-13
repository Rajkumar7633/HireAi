"use client"

// ── Shared SVG Chart Components ─────────────────────────────────────────────
// Pure SVG, zero dependencies. Import what you need.

// ── ScoreRing ────────────────────────────────────────────────────────────────
interface ScoreRingProps {
  value?: number
  /** Alias for `value` (legacy usage across recruiter pages) */
  score?: number
  max?: number
  size?: number
  stroke?: number
  color?: string
  /** Alias for `color` */
  ringColor?: string
  label?: string
  sublabel?: string
  showValue?: boolean
}

function toSafeScore(raw: unknown, max: number): number {
  if (raw == null) return 0
  const n = typeof raw === "number" ? raw : parseFloat(String(raw))
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(0, n))
}

export function ScoreRing({
  value,
  score,
  max = 100,
  size = 80,
  stroke = 8,
  color,
  ringColor,
  label,
  sublabel,
  showValue = true,
}: ScoreRingProps) {
  const safeValue = toSafeScore(score ?? value, max)
  const pct = max > 0 ? Math.min(100, Math.max(0, (safeValue / max) * 100)) : 0
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const c = size / 2
  const resolvedColor = ringColor ?? color
  const autoColor = resolvedColor ?? (pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444")
  const displayValue = Math.round(safeValue)
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          <circle
            cx={c} cy={c} r={r} fill="none"
            stroke={autoColor} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition: "stroke-dashoffset 0.9s ease" }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold leading-none" style={{ color: autoColor }}>
              {displayValue}{max === 100 ? "%" : ""}
            </span>
            {sublabel && <span className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">{sublabel}</span>}
          </div>
        )}
      </div>
      {label && <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{label}</span>}
    </div>
  )
}

// ── HalfGauge ────────────────────────────────────────────────────────────────
interface HalfGaugeProps {
  value: number
  max?: number
  size?: number
  color?: string
  label?: string
}
export function HalfGauge({ value, max = 100, size = 120, color, label }: HalfGaugeProps) {
  const pct = Math.min(1, Math.max(0, value / max))
  const w = size, h = size * 0.6
  const cx = w / 2, cy = h - 4
  const r = (w - 24) / 2
  const startAngle = Math.PI
  const endAngle = 2 * Math.PI
  const sweepAngle = (endAngle - startAngle) * pct + startAngle
  const toXY = (a: number, rr: number) => ({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) })
  const s = toXY(startAngle, r), e = toXY(sweepAngle, r)
  const autoColor = color ?? (pct >= 0.7 ? "#10b981" : pct >= 0.5 ? "#f59e0b" : "#ef4444")
  const largeArc = sweepAngle - startAngle > Math.PI ? 1 : 0
  const bgE = toXY(endAngle, r)
  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h + 10}>
        <path
          d={`M ${s.x} ${s.y} A ${r} ${r} 0 1 1 ${bgE.x} ${bgE.y}`}
          fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`}
            fill="none" stroke={autoColor} strokeWidth="10" strokeLinecap="round"
          />
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="bold" fill={autoColor}>
          {Math.round(value)}{max === 100 ? "%" : ""}
        </text>
        {label && (
          <text x={cx} y={h + 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
            {label.toUpperCase()}
          </text>
        )}
      </svg>
    </div>
  )
}

// ── DonutChart ───────────────────────────────────────────────────────────────
interface DonutSlice { label: string; value: number; color: string }
interface DonutChartProps {
  slices: DonutSlice[]
  size?: number
  innerLabel?: string
  innerSub?: string
}
export function DonutChart({ slices, size = 120, innerLabel, innerSub }: DonutChartProps) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const cx = size / 2, cy = size / 2, r = size * 0.36, ir = size * 0.22
  let currentAngle = -Math.PI / 2
  const paths: JSX.Element[] = []
  for (const slice of slices) {
    const angle = (slice.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(currentAngle)
    const y1 = cy + r * Math.sin(currentAngle)
    const x2 = cx + r * Math.cos(currentAngle + angle)
    const y2 = cy + r * Math.sin(currentAngle + angle)
    const largeArc = angle > Math.PI ? 1 : 0
    const ix1 = cx + ir * Math.cos(currentAngle)
    const iy1 = cy + ir * Math.sin(currentAngle)
    const ix2 = cx + ir * Math.cos(currentAngle + angle)
    const iy2 = cy + ir * Math.sin(currentAngle + angle)
    paths.push(
      <path
        key={slice.label}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${largeArc} 0 ${ix1} ${iy1} Z`}
        fill={slice.color}
        opacity={0.92}
      />
    )
    currentAngle += angle
  }
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="shrink-0">
        {paths}
        {innerLabel && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">{innerLabel}</text>
            {innerSub && <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">{innerSub}</text>}
          </>
        )}
      </svg>
      <div className="space-y-1.5">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-slate-600">{s.label}</span>
            <span className="text-[10px] font-semibold text-slate-800 ml-auto pl-2">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MiniBarChart ─────────────────────────────────────────────────────────────
interface MiniBarChartProps {
  values: number[]
  color?: string
  height?: number
  width?: number
}
export function MiniBarChart({ values, color = "#8b5cf6", height = 32, width = 80 }: MiniBarChartProps) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const barW = width / values.length - 2
  return (
    <svg width={width} height={height}>
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * (height - 2))
        return (
          <rect
            key={i}
            x={i * (barW + 2)}
            y={height - bh}
            width={barW}
            height={bh}
            rx={2}
            fill={color}
            opacity={0.7 + 0.3 * (i / values.length)}
          />
        )
      })}
    </svg>
  )
}

// ── TrendLine ────────────────────────────────────────────────────────────────
interface TrendLineProps {
  values: number[]
  color?: string
  height?: number
  width?: number
  filled?: boolean
}
export function TrendLine({ values, color = "#8b5cf6", height = 36, width = 90, filled = true }: TrendLineProps) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 4 - ((v - min) / range) * (height - 8),
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`
  return (
    <svg width={width} height={height}>
      {filled && <path d={fillPath} fill={color} opacity={0.12} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
    </svg>
  )
}

// ── SkillBar ─────────────────────────────────────────────────────────────────
interface SkillBarProps {
  label: string
  value: number
  max?: number
  color?: string
}
export function SkillBar({ label, value, max = 100, color = "#8b5cf6" }: SkillBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-600 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-slate-500 w-7 text-right shrink-0">{Math.round(value)}</span>
    </div>
  )
}

// ── PipelineStages ────────────────────────────────────────────────────────────
interface PipelineStage { label: string; count?: number; active?: boolean; done?: boolean }
interface PipelineStagesProps { stages: PipelineStage[]; activeIndex?: number }
export function PipelineStages({ stages, activeIndex = 0 }: PipelineStagesProps) {
  return (
    <div className="flex items-center w-full overflow-x-auto pb-1">
      {stages.map((stage, i) => {
        const done = i < activeIndex
        const active = i === activeIndex
        return (
          <div key={stage.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-violet-600 text-white ring-2 ring-violet-300"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] mt-1 font-medium text-center leading-tight truncate w-full px-0.5 ${active ? "text-violet-700" : done ? "text-emerald-600" : "text-slate-400"}`}>
                {stage.label}
              </span>
              {stage.count !== undefined && (
                <span className={`text-[9px] font-semibold ${active ? "text-violet-500" : done ? "text-emerald-500" : "text-slate-300"}`}>
                  {stage.count}
                </span>
              )}
            </div>
            {i < stages.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 shrink-0 transition-all ${done ? "bg-emerald-300" : "bg-slate-200"}`} style={{ minWidth: 8 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── FunnelBar ────────────────────────────────────────────────────────────────
interface FunnelStep { label: string; value: number; color: string }
interface FunnelBarProps { steps: FunnelStep[]; maxWidth?: number }
export function FunnelBar({ steps, maxWidth = 240 }: FunnelBarProps) {
  const max = Math.max(...steps.map(s => s.value), 1)
  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const w = Math.max(8, (step.value / max) * maxWidth)
        return (
          <div key={step.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-20 shrink-0 truncate text-right">{step.label}</span>
            <div className="h-5 rounded-md flex items-center px-2 transition-all duration-700" style={{ width: w, background: step.color }}>
              <span className="text-[10px] font-semibold text-white truncate">{step.value}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── StatRing (large ring with center text) ───────────────────────────────────
interface StatRingProps {
  value: number | string
  label: string
  sublabel?: string
  color?: string
  size?: number
  pct?: number
}
export function StatRing({ value, label, sublabel, color = "#8b5cf6", size = 100, pct }: StatRingProps) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const p = typeof pct === "number" ? Math.min(100, Math.max(0, pct)) : 75
  const offset = circ - (p / 100) * circ
  const c = size / 2
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle
            cx={c} cy={c} r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold leading-none" style={{ color }}>{value}</span>
          {sublabel && <span className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">{sublabel}</span>}
        </div>
      </div>
      <span className="text-[10px] text-slate-500 font-medium text-center">{label}</span>
    </div>
  )
}
