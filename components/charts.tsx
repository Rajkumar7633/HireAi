"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  LineChart,
  Line,
  ComposedChart,
  AreaChart,
  Area,
} from "recharts"

interface ChartProps {
  data: any[]
  type: "bar" | "pie" | "line" | "spark" | "composed"
  dataKey: string
  nameKey?: string
  barKey?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  showDots?: boolean
  xTickFormatter?: (v: any) => any
  yTickFormatter?: (v: any) => any
  primaryColor?: string
  accentColor?: string
  yDomain?: any
  yTickCount?: number
  softFill?: boolean
  animate?: boolean
  animationDuration?: number
  xInterval?: number | "preserveStartEnd"
  themeVariant?: "default" | "neon"
  itemColors?: Record<string, string>
  showBarLabels?: boolean
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
} as const

const defaultMargin = { top: 8, right: 16, bottom: 16, left: 0 }

const formatNumber = (n: any) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return n
  if (Math.abs(v) >= 1000) return new Intl.NumberFormat(undefined, { notation: "compact" }).format(v)
  return String(Math.round(v))
}

const defaultColors = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#a78bfa", // violet-400
  "#22d3ee", // cyan-400
  "#fb7185", // rose-400
  "#f472b6", // pink-400
]

export function CustomChart({
  data,
  type,
  dataKey,
  nameKey = "name",
  barKey,
  height = 300,
  showLegend = false,
  showGrid = true,
  showDots = false,
  xTickFormatter,
  yTickFormatter,
  primaryColor = "var(--primary)",
  accentColor = "var(--primary)",
  yDomain,
  yTickCount,
  softFill = false,
  animate = true,
  animationDuration = 600,
  xInterval,
  themeVariant = "default",
  itemColors,
  showBarLabels,
}: ChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center" style={{ height }}><span className="text-sm text-muted-foreground">No data available</span></div>
  }

  switch (type) {
    case "line":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={defaultMargin}>
            {themeVariant === "neon" && (
              <defs>
                <linearGradient id="neonLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="neonFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
              </defs>
            )}
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />}
            <XAxis
              dataKey={nameKey}
              stroke={themeVariant === "neon" ? "#a3a3a3" : "var(--muted-foreground)"}
              tickMargin={8}
              style={{ fontSize: "12px" }}
              tickFormatter={xTickFormatter}
              axisLine={false}
              tickLine={false}
              interval={xInterval as any}
            />
            <YAxis
              stroke={themeVariant === "neon" ? "#a3a3a3" : "var(--muted-foreground)"}
              tickMargin={6}
              width={36}
              style={{ fontSize: "12px" }}
              tickFormatter={yTickFormatter || formatNumber}
              allowDecimals={false}
              domain={yDomain ?? [0, 'dataMax + 1']}
              tickCount={yTickCount}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{...tooltipStyle, backgroundColor: themeVariant === "neon" ? "#111827" : "var(--card)", color: "#fff"}} labelStyle={{ color: themeVariant === "neon" ? "#e5e7eb" : "var(--foreground)" }} formatter={(value) => [formatNumber(value as any), dataKey]} />
            {softFill && (
              // light area under the line for readability
              <Area type="monotone" dataKey={dataKey} fill={themeVariant === "neon" ? "url(#neonFill)" : "var(--primary)"} fillOpacity={themeVariant === "neon" ? 1 : 0.06} strokeOpacity={0} isAnimationActive={false} />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={themeVariant === "neon" ? "url(#neonLine)" : primaryColor}
              dot={showDots}
              strokeWidth={2.25}
              isAnimationActive={animate}
              animationDuration={animationDuration}
              animationEasing="ease-in-out"
              activeDot={{ r: 3 }}
            />
            {showLegend && <Legend />}
          </LineChart>
        </ResponsiveContainer>
      )

    case "bar":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={defaultMargin}>
            {themeVariant === "neon" && (
              <defs>
                <linearGradient id="neonBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
                </linearGradient>
              </defs>
            )}
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />}
            <XAxis
              dataKey={nameKey}
              stroke={themeVariant === "neon" ? "#a3a3a3" : "var(--muted-foreground)"}
              tickMargin={8}
              style={{ fontSize: "12px" }}
              tickFormatter={xTickFormatter}
              axisLine={false}
              tickLine={false}
              interval={xInterval as any}
            />
            <YAxis
              stroke={themeVariant === "neon" ? "#a3a3a3" : "var(--muted-foreground)"}
              tickMargin={6}
              width={36}
              style={{ fontSize: "12px" }}
              tickFormatter={yTickFormatter || formatNumber}
              allowDecimals={false}
              domain={yDomain ?? [0, 'dataMax + 1']}
              tickCount={yTickCount}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{...tooltipStyle, backgroundColor: themeVariant === "neon" ? "#111827" : "var(--card)", color: "#fff"}} labelStyle={{ color: themeVariant === "neon" ? "#e5e7eb" : "var(--foreground)" }} formatter={(value) => [formatNumber(value as any), dataKey]} />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} isAnimationActive={animate} animationDuration={animationDuration} animationEasing="ease-in-out" fill={themeVariant === "neon" ? undefined : primaryColor}>
              {data.map((d, i) => (
                <Cell key={`cell-${i}`} fill={itemColors?.[d[nameKey]] || defaultColors[i % defaultColors.length]} />
              ))}
              {showBarLabels && (
                // precise labels above bars
                <LabelList dataKey={dataKey} position="top" formatter={(v: any)=>formatNumber(v)} fill="var(--foreground)" style={{ fontSize: 12 }} />
              )}
            </Bar>
            {showLegend && (
              <Legend
                verticalAlign="top"
                align="left"
                wrapperStyle={{ paddingBottom: 8 }}
                payload={data.map((d, i) => ({
                  value: String(d[nameKey]),
                  id: String(i),
                  type: 'square',
                  color: itemColors?.[d[nameKey]] || defaultColors[i % defaultColors.length],
                }))}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      )

    case "composed":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={defaultMargin}>
            {themeVariant === "neon" && (
              <defs>
                <linearGradient id="neonLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="neonBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
                </linearGradient>
              </defs>
            )}
            {showGrid && <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />}
            <XAxis
              dataKey={nameKey}
              stroke={themeVariant === "neon" ? "#a3a3a3" : "var(--muted-foreground)"}
              tickMargin={8}
              style={{ fontSize: "12px" }}
              tickFormatter={xTickFormatter}
              axisLine={false}
              tickLine={false}
              interval={xInterval as any}
            />
            <YAxis
              stroke={themeVariant === "neon" ? "#a3a3a3" : "var(--muted-foreground)"}
              tickMargin={6}
              width={36}
              style={{ fontSize: "12px" }}
              tickFormatter={yTickFormatter || formatNumber}
              allowDecimals={false}
              domain={yDomain ?? [0, 'dataMax + 1']}
              tickCount={yTickCount}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{...tooltipStyle, backgroundColor: themeVariant === "neon" ? "#111827" : "var(--card)", color: "#fff"}} labelStyle={{ color: themeVariant === "neon" ? "#e5e7eb" : "var(--foreground)" }} formatter={(value) => [formatNumber(value as any), undefined]} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={themeVariant === "neon" ? "url(#neonLine)" : primaryColor}
              dot={showDots}
              strokeWidth={2.25}
              isAnimationActive={animate}
              animationDuration={animationDuration}
              animationEasing="ease-in-out"
            />
            {barKey && <Bar dataKey={barKey} fill={themeVariant === "neon" ? "url(#neonBar)" : accentColor} radius={[6, 6, 0, 0]} isAnimationActive={animate} animationDuration={animationDuration} animationEasing="ease-in-out" />}
          </ComposedChart>
        </ResponsiveContainer>
      )

    case "spark":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              {themeVariant === "neon" ? (
                <linearGradient id="sparkGradientNeon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.06} />
                </linearGradient>
              ) : (
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              )}
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={themeVariant === "neon" ? "url(#neonLine)" : primaryColor}
              fill={themeVariant === "neon" ? "url(#sparkGradientNeon)" : "url(#sparkGradient)"}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={animate}
              animationDuration={animationDuration}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      )

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} outerRadius={100} label>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )

    default:
      return <div className="text-muted-foreground">Unknown chart type</div>
  }
}
