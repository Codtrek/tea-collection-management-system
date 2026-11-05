import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/data/EmptyState'
import { useAuth } from '@/context/AuthContext'
import * as performanceService from '@/services/performance'
import { MEASURE_DEFINITIONS } from './measure-definitions'
import type { MeasureKey } from './types'

const AGENT: MeasureKey[] = ['attendance', 'absences', 'routeCompletion', 'kg', 'weightAccuracy', 'fertilizer', 'coverHelp']

/*
  "How performance is measured" (Performance-Addendum §6) — every measure's formula, data source,
  exclusions and minimum data, from the same MEASURE_DEFINITIONS the (i) buttons use; the live
  tolerance and minimums come from the server's rules. The (i) buttons link here.
*/
export function HowMeasuredPage() {
  const { can } = useAuth()
  const allowed = can('performance', 'view')
  const { data } = useQuery({ queryKey: ['performance', 'definitions'], queryFn: performanceService.getDefinitions, enabled: allowed })
  const breadcrumb = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Performance', to: '/employees/performance' },
    { label: 'How it is measured' },
  ]
  if (!allowed) {
    return (
      <div>
        <PageHeader title="How performance is measured" breadcrumb={breadcrumb} />
        <EmptyState title="Not available for your role" description="Performance is for the Factory Manager and the Administrator." />
      </div>
    )
  }
  return (
    <div className="max-w-4xl">
      <PageHeader title="How performance is measured" breadcrumb={breadcrumb} />

      <Card className="mb-4">
        <CardTitle className="mb-2">What this page is for</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text">
          <li>The figures help the Manager see where to act and what to talk about with someone — support, route problems, follow-up.</li>
          <li>They are not for ranking, rewards or punishment. There is no overall score, no rank and no "top performer" label, anywhere.</li>
          <li>Every figure comes from real records and shows its counts, e.g. "90% (18/20)".</li>
          <li>Comparisons are only with the person’s own previous 3 months (▲ higher, ▼ lower, = about the same — not "better" or "worse"), or with the average of others in the same role.</li>
          <li>Notes on the team table are facts with counts, generated from rules — never a judgement.</li>
        </ul>
      </Card>

      <Card className="mb-4">
        <CardTitle className="mb-2">Fairness rules</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text">
          <li>Holidays, weekly holidays, rest days, approved leave and days a route was cancelled (a holiday or a closure) are left out of every denominator.</li>
          <li>
            Too little data shows “Not enough data”, not a percentage: fewer than {data?.minimums.routeDays ?? 5} route days, fewer than{' '}
            {data?.minimums.deliveries ?? 5} deliveries (weight, fertilizer), fewer than {data?.minimums.workingDays ?? 5} marked working days, or a route with fewer than{' '}
            {data?.minimums.routeHistoryDays ?? 5} collection days of history.
          </li>
          <li>Cover days count toward route completion and kg; a cover day’s kg is compared with the covered route’s own average.</li>
          <li>Kg is never compared between agents on different routes.</li>
          <li>A corrected delivery uses its latest approved grading.</li>
          <li>Rates within {data?.sameWithinPoints ?? 2} points of the previous 3 months are marked “about the same”.</li>
        </ul>
      </Card>

      <h2 className="mb-2 mt-6 text-base font-semibold text-text-heading">Measures (collection agents)</h2>
      <p className="mb-3 text-sm text-text-muted">Other staff see attendance rate, unplanned absences and leave taken, compared within their own role.</p>
      <div className="flex flex-col gap-3">
        {[...AGENT, 'leave' as MeasureKey].map((k) => {
          const d = MEASURE_DEFINITIONS[k]
          return (
            <Card key={k} id={k}>
              <CardTitle className="mb-2">{d.label}</CardTitle>
              <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[140px_1fr]">
                <dt className="text-text-muted">Formula</dt>
                <dd className="text-text">{d.formula}</dd>
                {k === 'weightAccuracy' && (
                  <>
                    <dt className="text-text-muted">Tolerance now</dt>
                    <dd className="text-text">{data ? `${data.tolerancePct}% — the collection setting, shared with grading warnings` : '…'}</dd>
                  </>
                )}
                <dt className="text-text-muted">Data</dt>
                <dd className="text-text">{d.source}</dd>
                <dt className="text-text-muted">Can be affected by</dt>
                <dd className="text-text">{d.affects}</dd>
                <dt className="text-text-muted">Left out</dt>
                <dd className="text-text">{d.excluded}</dd>
                <dt className="text-text-muted">Minimum data</dt>
                <dd className="text-text">{d.minimum}</dd>
              </dl>
            </Card>
          )
        })}
      </div>

      <Card className="mt-6">
        <CardTitle className="mb-2">Not measured as agent performance</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text">
          <li>Leaf grade mix and refused leaf — these mainly depend on the estates’ plucking, so they belong on estate reports.</li>
          <li>Punctuality and task completion — there is no arrival-time or task data, so they were removed.</li>
        </ul>
      </Card>

      <Card className="mt-4">
        <CardTitle className="mb-2">Coming later</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text">
          {(data?.comingSoon ?? []).map((c) => (
            <li key={c.key}>
              <span className="font-medium">{c.label}</span> — {c.reason}
              {c.key === 'transportTime' && ' This is the main way an agent affects leaf quality.'}
            </li>
          ))}
          <li>Reasons for a skipped stop, recorded in the agent app.</li>
          <li>Agents seeing their own measures in the mobile app (the same figures, only their own).</li>
        </ul>
      </Card>
    </div>
  )
}
