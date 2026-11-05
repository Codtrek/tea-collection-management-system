import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Popover } from '@/components/ui/Popover'
import { MEASURE_DEFINITIONS } from './measure-definitions'
import type { MeasureKey } from './types'

/** The (i) button on a column: formula, source and what can affect it, with a link to the full page. */
export function MeasureInfo({ measure, tolerancePct }: { measure: MeasureKey; tolerancePct?: number }) {
  const d = MEASURE_DEFINITIONS[measure]
  return (
    <Popover
      align="left"
      panelClassName="w-80 p-4"
      trigger={() => (
        <span className="inline-flex items-center rounded-full text-text-muted hover:text-primary">
          <Info className="size-3.5" aria-hidden />
          <span className="sr-only">How {d.label} is measured</span>
        </span>
      )}
    >
      {() => (
        <div className="text-left text-xs normal-case tracking-normal text-text">
          <p className="mb-1 text-sm font-semibold text-text-heading">{d.label}</p>
          <p className="mb-1.5">{d.formula}</p>
          {measure === 'weightAccuracy' && tolerancePct !== undefined && <p className="mb-1.5">Tolerance now: {tolerancePct}% (a collection setting, shared with grading).</p>}
          <p className="mb-1.5 text-text-muted">
            <span className="font-medium text-text">Data:</span> {d.source}
          </p>
          <p className="mb-1.5 text-text-muted">
            <span className="font-medium text-text">Can be affected by:</span> {d.affects}
          </p>
          <p className="mb-2 text-text-muted">
            <span className="font-medium text-text">Left out:</span> {d.excluded} · <span className="font-medium text-text">Minimum:</span> {d.minimum}
          </p>
          <Link to="/employees/performance/how" className="text-primary hover:underline">
            How performance is measured
          </Link>
        </div>
      )}
    </Popover>
  )
}
