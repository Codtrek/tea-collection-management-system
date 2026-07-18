import { useState } from 'react'
import { Leaf, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Toggle } from '@/components/ui/Toggle'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { GRADE_NORMAL, GRADE_SUPER } from '@/components/charts/palette'
import { useToast } from '@/components/ui/Toast'
import { contrastLabel } from '@/lib/contrast'
import { formatCurrency } from '@/lib/format'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-1 text-lg font-semibold text-text-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const NEUTRAL_TOKENS: Array<[string, string, string]> = [
  ['background', '#f8fbf9', '#1a1a1a'],
  ['surface', '#ffffff', '#1a1a1a'],
  ['primary', '#1b8b4e', '#ffffff'],
  ['primary-hover', '#157a43', '#ffffff'],
  ['brand', '#53cf81', '#08120b'],
  ['text', '#1a1a1a', '#ffffff'],
  ['text-muted', '#566a5d', '#f8fbf9'],
  ['danger', '#e11d48', '#ffffff'],
]

const BADGE_PAIRS: Array<{ tone: BadgeTone; label: string; bg: string; fg: string }> = [
  { tone: 'success', label: 'Confirmed', bg: '#ecfdf5', fg: '#047857' },
  { tone: 'warning', label: 'Pending', bg: '#fffbeb', fg: '#92400e' },
  { tone: 'danger', label: 'Mismatch', bg: '#fff1f2', fg: '#9f1239' },
  { tone: 'submitted', label: 'Submitted', bg: '#f1f5f9', fg: '#334155' },
  { tone: 'approved', label: 'Approved', bg: '#eff6ff', fg: '#1d4ed8' },
  { tone: 'assigned', label: 'Agent Assigned', bg: '#eef2ff', fg: '#4338ca' },
  { tone: 'gradeSuper', label: 'Super', bg: '#faf3e4', fg: '#8a6420' },
  { tone: 'gradeNormal', label: 'Normal', bg: '#ecf3ee', fg: '#1f4d36' },
]

const TYPE_SCALE: Array<[string, string, string]> = [
  ['display-l (Inter 600 / 30)', 'text-[30px] leading-9 font-semibold tracking-tight text-text-heading', 'Welcome back, Nuwara Eliya'],
  ['h1 (Inter 600 / 24)', 'text-2xl font-semibold tracking-tight text-text-heading', 'Employee Management'],
  ['h2 (Inter 600 / 18)', 'text-lg font-semibold text-text-heading', 'Payment Settlement'],
  ['body (Inter 400 / 14)', 'text-sm text-text', 'Default UI body text for dense screens.'],
  ['small (Inter 400 / 13)', 'text-[13px] text-text-muted', 'Secondary metadata & timestamps.'],
  ['caption (Inter 500 / 12)', 'text-xs font-medium uppercase tracking-wide text-text-muted', 'Table Header'],
]

const AREA_DATA = [
  { m: 'Mar', kg: 98000 },
  { m: 'Apr', kg: 112000 },
  { m: 'May', kg: 104000 },
  { m: 'Jun', kg: 128000 },
  { m: 'Jul', kg: 142350 },
]
const BAR_DATA = [
  { estate: 'Green Valley', kg: 42000 },
  { estate: 'Hill Crest', kg: 31500 },
  { estate: 'Maple Ridge', kg: 28900 },
  { estate: 'Sunfield', kg: 21000 },
]
const DONUT_DATA = [
  { name: 'Super', value: 58, color: GRADE_SUPER },
  { name: 'Normal', value: 42, color: GRADE_NORMAL },
]

export function DesignFoundationsPage() {
  const { toast } = useToast()
  const [checked, setChecked] = useState(true)
  const [toggled, setToggled] = useState(true)

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-10">
      <header className="mb-10 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-brand text-white">
          <Leaf className="size-5" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-heading">FND-01 · Design Foundations</h1>
          <p className="text-[13px] text-text-muted">
            Harboost hybrid palette — validated once before module screens are built.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-12">
        <Section id="color-tokens" title="Color tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NEUTRAL_TOKENS.map(([name, hex, on]) => {
              const { ratio, passAA } = contrastLabel(on, hex)
              return (
                <div key={name} className="overflow-hidden rounded-[var(--radius-md)] border border-border">
                  <div className="flex h-16 items-center justify-center text-sm font-medium" style={{ background: hex, color: on }}>
                    Aa
                  </div>
                  <div className="bg-surface px-3 py-2">
                    <p className="text-[13px] font-medium text-text">{name}</p>
                    <p className="id text-xs text-text-muted">{hex}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      on-color {ratio} {passAA ? '✓' : '·'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section id="status-badges" title="Status badge matrix — every pair prints its ratio">
          <div className="flex flex-wrap gap-3">
            {BADGE_PAIRS.map((b) => {
              const { ratio, passAA } = contrastLabel(b.fg, b.bg)
              return (
                <div key={b.label} className="flex flex-col items-start gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface p-3">
                  <StatusBadge tone={b.tone} icon={b.tone === 'gradeSuper' ? <Check /> : undefined}>
                    {b.label}
                  </StatusBadge>
                  <span className={`id text-xs ${passAA ? 'text-success-fg' : 'text-danger-fg'}`}>
                    {ratio} {passAA ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>

        <Section id="type-scale" title="Type scale">
          <Card className="flex flex-col gap-4">
            {TYPE_SCALE.map(([name, cls, sample]) => (
              <div key={name} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-56 shrink-0 text-xs text-text-muted">{name}</span>
                <div className="flex flex-1 flex-wrap items-baseline gap-x-6 gap-y-1">
                  <span className={cls}>{sample}</span>
                  <span className={`tabular ${cls}`}>{formatCurrency(1245600)}</span>
                  <span className={`id ${cls}`}>GV-2026-0714</span>
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section id="tabular-check" title="Tabular figures — equal width in a column">
          <Card className="max-w-xs">
            <table className="w-full">
              <tbody>
                {[1245600, 1111111, 8412000, 342900].map((n) => (
                  <tr key={n} className="border-b border-border last:border-0">
                    <td className="tabular py-1.5 text-right text-sm text-text">{formatCurrency(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-text-muted">All figures share the same digit width (tabular-nums).</p>
          </Card>
        </Section>

        <Section id="radius-elevation" title="Radius & elevation">
          <div className="flex flex-wrap gap-6">
            <div className="flex gap-3">
              {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((r) => (
                <div key={r} className="flex flex-col items-center gap-1">
                  <div className="size-14 border border-border bg-surface" style={{ borderRadius: `var(--radius-${r})` }} />
                  <span className="text-xs text-text-muted">{r}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div className="size-14 rounded-[var(--radius-lg)] bg-surface" style={{ boxShadow: `var(--shadow-${s})` }} />
                  <span className="text-xs text-text-muted">shadow-{s}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="buttons" title="Button matrix — variants × sizes × states + focus ring">
          <Card className="flex flex-col gap-4">
            {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <span className="w-20 text-xs text-text-muted">{variant}</span>
                <Button variant={variant} size="sm">Small</Button>
                <Button variant={variant} size="md">Medium</Button>
                <Button variant={variant} size="lg">Large</Button>
                <Button variant={variant} loading>Loading</Button>
                <Button variant={variant} disabled>Disabled</Button>
              </div>
            ))}
            <p className="text-xs text-text-muted">Tab into any button to see the green focus ring + halo.</p>
          </Card>
        </Section>

        <Section id="form-controls" title="Form controls">
          <Card className="grid gap-5 sm:grid-cols-2">
            <Input label="Full name" placeholder="K. Perera" defaultValue="K. Perera" />
            <Input label="Search" placeholder="Search estates…" leadingIcon={<Search className="size-4" />} />
            <Input label="Password" revealable placeholder="••••••••" />
            <Input label="NIC number" error="Enter a valid Sri Lankan NIC" defaultValue="12345" />
            <Select label="Department" placeholder="Select department" options={[{ value: 'factory', label: 'Factory Floor' }, { value: 'office', label: 'Office' }]} />
            <Input label="Disabled" placeholder="Read only" disabled />
            <div className="flex items-center gap-6">
              <Checkbox label="Remember me" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <Toggle checked={toggled} onChange={setToggled} label="Email alerts" />
            </div>
          </Card>
        </Section>

        <Section id="charts" title="Chart specimens">
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard title="Collection Trend (kg)" data={AREA_DATA} xKey="m" yKey="kg" />
            <BarChartCard title="By Estate (kg)" data={BAR_DATA} xKey="estate" yKey="kg" />
            <DonutChartCard title="Grade Split (%)" data={DONUT_DATA} valueFmt={(v) => `${v}%`} />
          </div>
        </Section>

        <Section id="state-patterns" title="State patterns">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">Skeleton</p>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton />
                <Skeleton className="w-4/5" />
              </div>
            </Card>
            <EmptyState icon={<Leaf className="size-6" strokeWidth={1.5} />} title="Add your first employee" description="No employees on the roster yet." action={<Button size="sm">Add Employee</Button>} />
            <ErrorState onRetry={() => toast('Retried', 'success')} />
          </div>
          <div className="mt-4">
            <Button onClick={() => toast('Employee registered')}>Trigger success toast</Button>
          </div>
        </Section>
      </div>
    </div>
  )
}
