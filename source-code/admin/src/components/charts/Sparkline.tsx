import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { CHART_SERIES } from './palette'
import { cn } from '@/lib/cn'

interface SparklineProps {
  /** ordered oldest → newest; each point's numeric value is plotted */
  data: Array<{ value: number }>
  className?: string
}

/*
  Minimal trend line for dense table cells (EST-01 amended, Oversight view's
  quality-trend column) — no axes/grid/tooltip, just shape. Reads already-
  computed points; never recomputes anything (same rule Fertilizer's lib.ts
  follows for display helpers). `prefers-reduced-motion` needs no special
  case here — recharts' default line draw is already instant, not animated,
  unlike the count-up/ribbon effects elsewhere in the portal.
*/
export function Sparkline({ data, className }: SparklineProps) {
  if (data.length < 2) {
    return <span className={cn('text-xs text-text-muted', className)}>—</span>
  }

  return (
    <div className={cn('h-8 w-20', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART_SERIES[0]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
