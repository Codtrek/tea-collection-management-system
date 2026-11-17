import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DashboardContent } from './DashboardPage'
import type { DashboardSummary } from './types'

/*
  The dashboard shows only what GET /dashboard/summary returned. These render the page body to
  HTML (no DOM needed) and read the text.
*/

// 09:30 on 17 Nov in Colombo (04:00 UTC)
const NOW = new Date('2026-11-17T04:00:00Z')

function render(data: DashboardSummary | undefined, state: { isPending?: boolean; isError?: boolean } = {}) {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DashboardContent
        userName="A. Bandara"
        data={data}
        isPending={state.isPending ?? false}
        isError={state.isError ?? false}
        isFetching={false}
        onRefresh={() => {}}
        now={NOW}
      />
    </MemoryRouter>,
  )
  // text only, entities decoded (`&#x27;` must not read as the digits 2 and 7)
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

const base: DashboardSummary = {
  generatedAt: '2026-11-17T04:00:00Z',
  today: '2026-11-17',
  month: '2026-11',
  role: 'Officer',
  actions: [],
  quickActions: [],
  todayView: null,
  monthView: null,
  charts: null,
  activity: [],
}

describe('Dashboard — no invented numbers', () => {
  it('before the API answers, the only digits on the page are today’s date (Colombo)', () => {
    for (const state of [{ isPending: true }, { isError: true }]) {
      const text = render(undefined, state)
      expect(text).toContain('Tuesday, 17 Nov 2026')
      expect(text.replace('17 Nov 2026', '')).not.toMatch(/\d/)
    }
  })

  it('today is the Colombo date, even where the UTC date is still yesterday', () => {
    // 00:30 on 17 Nov in Colombo = 19:00 on 16 Nov UTC
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardContent userName="" data={undefined} isPending isError={false} isFetching={false} onRefresh={() => {}} now={new Date('2026-11-16T19:00:00Z')} />
      </MemoryRouter>,
    )
    expect(html).toContain('Tuesday, 17 Nov 2026')
  })

  it('an empty response says why, and still shows no figure of its own', () => {
    const text = render(base)
    expect(text).toContain('Nothing is waiting for you')
    expect(text).toContain('No recorded activity')
    expect(text.replace('17 Nov 2026', '').replace(/Updated \d\d:\d\d/, '')).not.toMatch(/\d/)
  })
})

describe('Dashboard — figures come from the response', () => {
  const data: DashboardSummary = {
    ...base,
    actions: [
      { key: 'fertilizerToDecide', count: 7, label: '7 fertilizer requests to decide', href: '/fertilizer/requests?status=Requested', urgency: 21 },
      { key: 'salaryAdvances', count: 3, label: '3 salary advances to decide', href: '/employees/advances', urgency: 20 },
    ],
    quickActions: [{ key: 'markAttendance', label: 'Mark attendance', href: '/employees/attendance/entry' }],
    todayView: {
      leaf: { kg: 4321, deliveries: 12, compareKg: 3456, changePct: 25, compareDate: '2026-11-10', href: '/reports/collection?from=2026-11-17&to=2026-11-17' },
      grading: { waiting: 0, waitingHref: '/collections?grade=Ungraded', overTolerance: 0, tolerancePct: 5, mismatchHref: '/x' },
      agents: { onRoute: 4, notStarted: 1, absent: 0, covering: 0, completed: 0, scheduled: 5, href: '/collections/dispatch' },
      fertilizer: { done: 0, failed: 0, pending: 0, total: 0, href: '/fertilizer/requests?tab=all&scope=today' },
    },
  }

  it('shows each count with its label and link, in the server’s order', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardContent userName="A. Bandara" data={data} isPending={false} isError={false} isFetching={false} onRefresh={() => {}} now={NOW} />
      </MemoryRouter>,
    )
    expect(html).toContain('href="/fertilizer/requests?status=Requested"')
    expect(html).toContain('href="/employees/advances"')
    const text = render(data)
    // the number is shown once, beside its label (not repeated in it)
    expect(text).toContain('7 fertilizer requests to decide')
    expect(text).not.toContain('7 7')
    expect(text.indexOf('fertilizer requests')).toBeLessThan(text.indexOf('salary advances'))
  })

  it('Today: the report’s own kg and deliveries, compared with the same weekday last week', () => {
    const text = render(data)
    expect(text).toContain('4,321 kg')
    expect(text).toContain('12 deliveries')
    expect(text).toContain('+25.0% vs Tue 10 Nov 2026 (whole day)')
    expect(text).toContain('4 on route · 1 not started')
  })

  it('zero is a real figure, and its quiet state says why', () => {
    const text = render(data)
    expect(text).toContain('No deliveries waiting today')
    expect(text).toContain('No deliveries scheduled today')
    // a mismatch card only when there is one
    expect(text).not.toContain('Weight mismatches today')
  })

  it('sections the server left out are not rendered at all', () => {
    const text = render(data)
    expect(text).not.toContain('This month')
    expect(text).not.toContain('Daily intake')
    expect(render({ ...data, todayView: null })).not.toContain('Leaf received so far')
  })

  it('greets by name (not an initial) and lists the role’s quick actions', () => {
    const text = render(data)
    expect(text).toContain('Good morning, Bandara')
    expect(text).toContain('Mark attendance')
  })
})
