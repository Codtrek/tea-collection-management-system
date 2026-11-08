import { useId, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_AXIS, CHART_GRID, CHART_SERIES } from './palette'
import { cn } from '@/lib/cn'

/* Rounded, softly-bordered chart container (foundations §6). */
function ChartShell({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[var(--radius-md)] border border-border bg-surface p-5', className)}>
      {title && <h3 className="mb-3 text-[13px] font-semibold text-text-heading">{title}</h3>}
      {children}
    </div>
  )
}

interface Tick {
  [key: string]: string | number
}

function TooltipBox({ active, payload, label, valueFmt }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  valueFmt?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[var(--radius-md)] bg-surface p-3 shadow-[var(--shadow-3)]">
      {label && <p className="mb-1 text-xs font-medium text-text-muted">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="tabular flex items-center gap-2 text-sm text-text">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {payload.length > 1 && <span className="text-text-muted">{p.name}</span>}
          {valueFmt ? valueFmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

/** Y-axis width that fits the widest tick label (12px tabular digits ≈ 7.5px each), so labels never clip. */
function axisWidth(max: number, fmt: (v: number) => string): number {
  return Math.max(32, Math.ceil(fmt(max).length * 7.5) + 12)
}

export function AreaChartCard({
  title,
  data,
  xKey,
  yKey,
  height = 240,
  valueFmt,
  yTickFormat,
  className,
}: {
  title?: string
  data: Tick[]
  xKey: string
  yKey: string
  height?: number
  valueFmt?: (v: number) => string
  /** opt-in: tick labels (e.g. thousands separators); the axis widens to fit them */
  yTickFormat?: (v: number) => string
  className?: string
}) {
  // one gradient per chart: a shared id let a second chart on the page paint with the first one's
  const gradient = `area-${useId().replace(/:/g, '')}`
  const max = Math.max(0, ...data.map((d) => Number(d[yKey]) || 0))
  return (
    <ChartShell title={title} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: yTickFormat ? 0 : -12 }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_SERIES[0]} stopOpacity={0.24} />
              <stop offset="100%" stopColor={CHART_SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_AXIS, fontSize: 12 }}
            width={yTickFormat ? axisWidth(max, yTickFormat) : 48}
            tickFormatter={yTickFormat}
          />
          <Tooltip content={<TooltipBox valueFmt={valueFmt} />} cursor={{ stroke: CHART_GRID }} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={CHART_SERIES[0]}
            strokeWidth={2}
            fill={`url(#${gradient})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

export function BarChartCard({
  title,
  data,
  xKey,
  yKey,
  height = 240,
  valueFmt,
  className,
}: {
  title?: string
  data: Tick[]
  xKey: string
  yKey: string
  height?: number
  valueFmt?: (v: number) => string
  className?: string
}) {
  return (
    <ChartShell title={title} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} width={48} />
          <Tooltip content={<TooltipBox valueFmt={valueFmt} />} cursor={{ fill: CHART_GRID, opacity: 0.4 }} />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]} fill={CHART_SERIES[0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  )
}

export interface DonutSlice {
  name: string
  value: number
  color?: string
}

export function DonutChartCard({
  title,
  data,
  height = 240,
  valueFmt,
  centerLabel,
  className,
}: {
  title?: string
  data: DonutSlice[]
  height?: number
  valueFmt?: (v: number) => string
  centerLabel?: string
  className?: string
}) {
  return (
    <ChartShell title={title} className={className}>
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((slice, i) => (
                <Cell key={slice.name} fill={slice.color ?? CHART_SERIES[i % CHART_SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox valueFmt={valueFmt} />} />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-text-muted">{centerLabel}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {data.map((slice, i) => (
          <span key={slice.name} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="size-2.5 rounded-full" style={{ background: slice.color ?? CHART_SERIES[i % CHART_SERIES.length] }} />
            {slice.name}
          </span>
        ))}
      </div>
    </ChartShell>
  )
}

/* ── Trend (reports): straight lines, exact tooltip, a partial last period drawn as such ── */

export interface TrendDatum {
  label: string
  value: number
  /** shown in the tooltip, e.g. deliveries */
  count?: number
  /** a period still in progress — hollow point on a dashed segment, never read as complete */
  partial?: boolean
  /** the same period a year earlier (the optional second line) */
  compare?: number | null
  compareCount?: number | null
}

interface TrendRow extends TrendDatum {
  /** complete periods only — the solid line */
  solid: number | null
  /** the last complete period and the partial one — the dashed segment */
  dashed: number | null
}

function TrendTooltip({
  active,
  payload,
  valueFmt,
  countLabel,
  compareLabel,
}: {
  active?: boolean
  payload?: Array<{ payload: TrendRow }>
  valueFmt: (v: number) => string
  countLabel: string
  compareLabel: string
}) {
  const row = active ? payload?.[0]?.payload : undefined
  if (!row) return null
  return (
    <div className="rounded-[var(--radius-md)] bg-surface p-3 text-sm shadow-[var(--shadow-3)]">
      <p className="mb-1 text-xs font-medium text-text-muted">
        {row.label}
        {row.partial && ' · in progress'}
      </p>
      <p className="tabular flex items-center gap-2 text-text">
        <span className="size-2 rounded-full" style={{ background: CHART_SERIES[0] }} />
        {valueFmt(row.value)}
        {row.count !== undefined && <span className="text-text-muted">· {row.count} {countLabel}</span>}
      </p>
      {row.compare !== undefined && row.compare !== null && (
        <p className="tabular mt-0.5 flex items-center gap-2 text-text-muted">
          <span className="size-2 rounded-full" style={{ background: CHART_AXIS }} />
          {compareLabel}: {valueFmt(row.compare)}
          {row.compareCount !== undefined && row.compareCount !== null && ` · ${row.compareCount} ${countLabel}`}
        </p>
      )}
    </div>
  )
}

/**
 * Report trend line. Straight segments (a smoothed curve overshoots between points and invents
 * values), y-axis labels with thousands separators in an axis wide enough for them, and a tooltip
 * with the exact figures. A partial last period is a hollow point joined by a dashed segment, with
 * a "Month in progress" note — it is never drawn as if complete.
 */
export function TrendChartCard({
  title,
  data,
  height = 260,
  valueFmt,
  yTickFormat,
  countLabel = 'deliveries',
  compareLabel = 'Same period last year',
  showCompare = false,
  partialNote = 'Month in progress',
  className,
}: {
  title?: string
  data: TrendDatum[]
  height?: number
  valueFmt: (v: number) => string
  yTickFormat: (v: number) => string
  countLabel?: string
  compareLabel?: string
  showCompare?: boolean
  partialNote?: string
  className?: string
}) {
  const firstPartial = data.findIndex((d) => d.partial)
  const rows: TrendRow[] = data.map((d, i) => ({
    ...d,
    solid: firstPartial === -1 || i < firstPartial ? d.value : null,
    dashed: firstPartial !== -1 && i >= firstPartial - 1 ? d.value : null,
  }))
  const max = Math.max(0, ...data.map((d) => Math.max(d.value, showCompare ? (d.compare ?? 0) : 0)))
  return (
    <ChartShell title={title} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          {/* labels thin out instead of overlapping on a long daily range; first and last always show */}
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_AXIS, fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_AXIS, fontSize: 12 }}
            width={axisWidth(max, yTickFormat)}
            tickFormatter={yTickFormat}
          />
          <Tooltip
            content={<TrendTooltip valueFmt={valueFmt} countLabel={countLabel} compareLabel={compareLabel} />}
            cursor={{ stroke: CHART_GRID }}
          />
          {showCompare && (
            <Line
              type="linear"
              dataKey="compare"
              stroke={CHART_AXIS}
              strokeWidth={1.5}
              strokeDasharray="2 3"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Line
            type="linear"
            dataKey="solid"
            stroke={CHART_SERIES[0]}
            strokeWidth={2}
            dot={data.length <= 16 ? { r: 3, fill: CHART_SERIES[0], strokeWidth: 0 } : false}
            connectNulls={false}
            isAnimationActive={false}
          />
          {firstPartial !== -1 && (
            <Line
              type="linear"
              dataKey="dashed"
              stroke={CHART_SERIES[0]}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={(p: { cx?: number; cy?: number; index?: number }) => (
                <circle
                  key={`partial-${p.index}`}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.index !== undefined && p.index >= firstPartial ? 4 : 0}
                  fill="var(--color-surface)"
                  stroke={CHART_SERIES[0]}
                  strokeWidth={2}
                />
              )}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {(firstPartial !== -1 || showCompare) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          {firstPartial !== -1 && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-2" style={{ borderColor: CHART_SERIES[0] }} />
              {partialNote}
            </span>
          )}
          {showCompare && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dotted" style={{ borderColor: CHART_AXIS }} />
              {compareLabel}
            </span>
          )}
        </div>
      )}
    </ChartShell>
  )
}

/* ── Horizontal bars (reports): readable names, sorted, exact tooltip ── */

export interface HBarDatum {
  name: string
  value: number
  /** a second line in the tooltip, e.g. the estate's route */
  meta?: string
}

function HBarTooltip({ active, payload, valueFmt }: { active?: boolean; payload?: Array<{ payload: HBarDatum }>; valueFmt: (v: number) => string }) {
  const d = active ? payload?.[0]?.payload : undefined
  if (!d) return null
  return (
    <div className="rounded-[var(--radius-md)] bg-surface p-3 text-sm shadow-[var(--shadow-3)]">
      <p className="font-medium text-text">{d.name}</p>
      {d.meta && <p className="text-xs text-text-muted">{d.meta}</p>}
      <p className="tabular mt-0.5 text-text">{valueFmt(d.value)}</p>
    </div>
  )
}

/**
 * Ranked horizontal bars — names read left of their bar instead of being dropped from a crowded
 * x-axis. Rows are drawn in the order given (sort before passing). The height grows with the rows.
 */
export function HorizontalBarChartCard({
  title,
  data,
  valueFmt,
  tickFormat,
  footer,
  onBarClick,
  className,
}: {
  title?: string
  data: HBarDatum[]
  valueFmt: (v: number) => string
  tickFormat: (v: number) => string
  /** e.g. a "View all" link */
  footer?: ReactNode
  onBarClick?: (d: HBarDatum) => void
  className?: string
}) {
  const nameWidth = Math.min(180, Math.max(72, Math.ceil(Math.max(0, ...data.map((d) => d.name.length)) * 6.6) + 8))
  const clip = (s: string) => (s.length * 6.6 > nameWidth ? `${s.slice(0, Math.floor(nameWidth / 6.6) - 1)}…` : s)
  return (
    <ChartShell title={title} className={className}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Nothing in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 30 + 24)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID} horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} tickFormatter={tickFormat} />
            <YAxis
              type="category"
              dataKey="name"
              width={nameWidth}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_AXIS, fontSize: 12 }}
              tickFormatter={clip}
              interval={0}
            />
            <Tooltip content={<HBarTooltip valueFmt={valueFmt} />} cursor={{ fill: CHART_GRID, opacity: 0.5 }} />
            <Bar
              dataKey="value"
              fill={CHART_SERIES[0]}
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              isAnimationActive={false}
              cursor={onBarClick ? 'pointer' : undefined}
              onClick={onBarClick ? (d: { payload?: HBarDatum }) => d.payload && onBarClick(d.payload) : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
      {footer && <div className="mt-2 text-right text-sm">{footer}</div>}
    </ChartShell>
  )
}

/* ── Stacked bars per period (reports): e.g. Super / Normal kg by month ── */

export function StackedBarChartCard({
  title,
  data,
  series,
  valueFmt,
  tickFormat,
  height = 240,
  className,
}: {
  title?: string
  data: Tick[]
  /** bottom first */
  series: { key: string; name: string; color: string }[]
  valueFmt: (v: number) => string
  tickFormat: (v: number) => string
  height?: number
  className?: string
}) {
  const max = Math.max(0, ...data.map((d) => series.reduce((s, x) => s + (Number(d[x.key]) || 0), 0)))
  return (
    <ChartShell title={title} className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} width={axisWidth(max, tickFormat)} tickFormatter={tickFormat} />
          <Tooltip content={<TooltipBox valueFmt={valueFmt} />} cursor={{ fill: CHART_GRID, opacity: 0.4 }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="stack"
              fill={s.color}
              maxBarSize={40}
              radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </ChartShell>
  )
}
