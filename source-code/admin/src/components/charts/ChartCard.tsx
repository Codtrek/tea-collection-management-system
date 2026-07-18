import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
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
          {valueFmt ? valueFmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export function AreaChartCard({
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
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={`area-${yKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_SERIES[0]} stopOpacity={0.24} />
              <stop offset="100%" stopColor={CHART_SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS, fontSize: 12 }} width={48} />
          <Tooltip content={<TooltipBox valueFmt={valueFmt} />} cursor={{ stroke: CHART_GRID }} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={CHART_SERIES[0]}
            strokeWidth={2}
            fill={`url(#area-${yKey})`}
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
