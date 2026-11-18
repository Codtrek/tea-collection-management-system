import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { DashboardContent } from './DashboardPage'
import type { DashboardSummary } from './types'
import { MISSING_SECTION, parseSummary } from '@/services/dashboard'
import { BlockBoundary } from '@/components/data/BlockBoundary'

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
  primaryAction: null,
  toDecide: 0,
  todayView: null,
  monthView: null,
  charts: null,
  activity: [],
  errors: {},
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
      {
        key: 'fertilizerToDecide',
        count: 7,
        label: '7 fertilizer requests to decide',
        reason: 'Oldest requested 03 Nov 2026',
        href: '/fertilizer/requests?status=Requested',
        group: 'toDecide',
        urgency: 31,
        action: 'Review',
      },
      {
        key: 'salaryAdvances',
        count: 3,
        label: '3 salary advances to decide',
        reason: null,
        href: '/employees/advances',
        group: 'toDecide',
        urgency: 30,
        action: 'Review',
      },
    ],
    primaryAction: { label: 'Review', href: '/fertilizer/requests?status=Requested', key: 'fertilizerToDecide' },
    toDecide: 2,
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

  it('Expenses (Manager/Administrator "This month") says what it includes; no This month, no Expenses', () => {
    const month: DashboardSummary['monthView'] = {
      label: 'November so far',
      leafPurchase: { valueRs: 121320, rsPerKg: 185, changePct: -69.4, href: '/reports/leaf-purchases?thisMonth=1' },
      expenses: { totalRs: 121320, changePct: -69.4, href: '/reports/expenses?thisMonth=1' },
    }
    const text = render({ ...data, role: 'Manager', monthView: month })
    expect(text).toContain('Expenses to date')
    expect(text).toContain('Includes leaf purchases, processed wages, fertilizer stock and daily entries')
    // the change carries an arrow and a word, not only a colour
    expect(text).toContain('down 69.4% vs last month (same days)')
    // an Officer's summary has no monthView: neither the section nor the note appears
    const officer = render({ ...data, monthView: null })
    expect(officer).not.toContain('Expenses to date')
    expect(officer).not.toContain('Includes leaf purchases')
  })

  it('the queue is grouped Urgent → Due soon → To decide; a blocked item says so; each row has one action', () => {
    const queued: DashboardSummary = {
      ...data,
      actions: [
        { key: 'estatesNoBank', count: 1, label: '1 estate missing bank details', reason: 'Blocks 1 of 4 pending settlements', href: '/estates/settlements?bank=missing', group: 'urgent', urgency: 10, action: 'Fix bank details', blocks: 'settlementsToProcess' },
        { key: 'settlementsToProcess', count: 4, label: '4 settlements to process', reason: 'Transport amount not set for July 2026', href: '/estates/settlements?status=Pending', group: 'dueSoon', urgency: 20, action: 'Open settlements', blocked: true },
        ...data.actions,
      ],
    }
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardContent userName="A. Bandara" data={queued} isPending={false} isError={false} isFetching={false} onRefresh={() => {}} now={NOW} />
      </MemoryRouter>,
    )
    const text = render(queued)
    expect(text.indexOf('Urgent')).toBeLessThan(text.indexOf('Due soon'))
    expect(text.indexOf('Due soon')).toBeLessThan(text.indexOf('To decide'))
    expect(text).toContain('Blocks 1 of 4 pending settlements')
    expect(text).toContain('Blocked Transport amount not set for July 2026')
    // said once: the badge, then what blocks it (a reason already starting "Blocked:" is not repeated)
    const twice = render({ ...queued, actions: queued.actions.map((x) => (x.blocked ? { ...x, reason: 'Blocked: monthly transport amount not set' } : x)) })
    expect(twice).toContain('Blocked monthly transport amount not set')
    expect(twice).not.toContain('Blocked: monthly')
    // a role with settlements in its queue doesn't get them again as a This month row; others do
    const settlements = { pending: 4, noBank: 1, transportMissing: true, href: '/estates/settlements?status=Pending' }
    const row = 'How “Settlements” is counted'
    expect(render({ ...queued, monthView: { label: 'November so far', settlements } })).not.toContain(row)
    expect(render({ ...data, monthView: { label: 'November so far', settlements } })).toContain(row)
    expect(text).toContain('Fix bank details')
    // only the rows are list items (the e2e counts #needs-action li against the response)
    const queue = html.slice(html.indexOf('id="needs-action"'), html.indexOf('id="today-title"'))
    expect(queue.match(/<li/g)?.length).toBe(queued.actions.length)
  })

  it('"Updated" turns into a warning once the figures are 15 minutes old', () => {
    const at = (min: number) => new Date(NOW.getTime() + min * 60000)
    const html = (now: Date) =>
      renderToStaticMarkup(
        <MemoryRouter>
          <DashboardContent userName="" data={data} isPending={false} isError={false} isFetching={false} onRefresh={() => {}} now={now} />
        </MemoryRouter>,
      )
    expect(html(at(5))).toContain('Updated 09:30')
    expect(html(at(5))).not.toContain('text-warning-fg font-medium')
    expect(html(at(47))).toContain('Updated 47 min ago')
  })

  it('the chart says what it shows in words; routes are ranked with their share', () => {
    const withCharts: DashboardSummary = {
      ...data,
      charts: {
        daily: [
          { key: '2026-11-01', label: '1 Nov', kg: 0, deliveries: 0, partial: false, lastMonthKg: 115.5 },
          { key: '2026-11-05', label: '5 Nov', kg: 190.4, deliveries: 4, partial: false, lastMonthKg: 165.1 },
        ],
        lastMonthLabel: 'October 2026',
        changePct: -69.4,
        compare: { from: '2026-10-01', to: '2026-10-17' },
        byRoute: [
          { id: 1, name: 'Route 2', kg: 100, deliveries: 3 },
          { id: 2, name: 'Route 3', kg: 300, deliveries: 5 },
        ],
        href: '/reports/collection?thisMonth=1',
      },
    }
    const text = render(withCharts)
    expect(text).toContain('No deliveries recorded since 5 Nov. Intake is 69.4% below the same days in October.')
    expect(text.indexOf('Route 3')).toBeLessThan(text.indexOf('Route 2'))
    expect(text).toContain('300.0 kg · 75.0%')
  })

  it('activity: grouped by day, amounts shown the portal’s way, the audit log link for Administrators only', () => {
    const withActivity: DashboardSummary = {
      ...data,
      activity: [
        { id: 'AUD-1', timestamp: '2026-11-17T03:00:00Z', user: 'A. Bandara', role: 'Administrator', action: 'Issued advance Rs. 50000', module: 'Estate Owner', record: 'EADV-2026-0031', recordHref: '/estates/EST-0001' },
        { id: 'AUD-2', timestamp: '2026-07-15T06:00:00Z', user: 'S. Fernando', role: 'Officer', action: 'Processed payroll run', module: 'Employee', record: 'July 2026' },
      ],
    }
    const text = render(withActivity)
    expect(text).toContain('Today')
    expect(text).toContain('Earlier')
    expect(text).toContain('Issued advance Rs. 50,000')
    expect(text).toContain('15 Jul 2026')
    expect(text).not.toContain('View audit log')
    const admin = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardContent userName="" auditLogLink data={withActivity} isPending={false} isError={false} isFetching={false} onRefresh={() => {}} now={NOW} />
      </MemoryRouter>,
    )
    expect(admin).toContain('View audit log')
  })

  it('greets by name (not an initial); one primary action and "Review approvals (N)"; reason lines', () => {
    const text = render(data)
    expect(text).toContain('Good morning, Bandara')
    expect(text).toContain('Review approvals (2)')
    expect(text).toContain('Oldest requested 03 Nov 2026')
    // no primary button with an empty queue
    expect(render({ ...data, actions: [], primaryAction: null, toDecide: 0 })).not.toContain('Review approvals')
  })
})

describe('Dashboard — one bad block never takes down the page', () => {
  it('a summary missing its optional sections still renders the header, the queue and activity', () => {
    // as an older or newer server might send it: no todayView / monthView / charts keys at all
    const partial = parseSummary({ ...base, todayView: undefined, monthView: undefined, charts: undefined, actions: [], activity: [] })
    const text = render(partial)
    expect(text).toContain('Good morning')
    expect(text).toContain('Needs your action')
    expect(text).toContain('Recent activity')
    // the missing sections are named inline, each in its own block
    expect(text).toContain("Couldn't show today's figures")
    expect(text).toContain("Couldn't show the intake charts")
  })

  it('a missing required list becomes an inline error in its block; the rest renders', () => {
    const json = { ...base, todayView: null, monthView: null, charts: null } as Record<string, unknown>
    delete json.actions
    delete json.activity
    const text = render(parseSummary(json))
    expect(text).toContain("Couldn't show the work queue")
    expect(text).toContain("Couldn't show recent activity")
    expect(text).toContain(MISSING_SECTION)
    expect(text).toContain('Good morning')
  })

  it('a section the server could not load shows its error there, and only there', () => {
    const text = render({ ...base, errors: { charts: "Couldn't load this section." } })
    expect(text).toContain("Couldn't show the intake charts")
    expect(text).not.toContain("Couldn't show the work queue")
    expect(text).toContain('Needs your action')
  })

  it('BlockBoundary: after a render error it shows the inline error; Retry and new data render again', () => {
    // React catches the throw (checked in a real browser by e2e/dashboard.spec.ts); this is the boundary's own part
    let retried = 0
    const props = { label: 'the work queue', onRetry: () => retried++, resetKey: 'a', children: <p>queue</p> }
    const boundary = new BlockBoundary(props)
    boundary.state = { ...boundary.state, ...BlockBoundary.getDerivedStateFromError() }
    expect(renderToStaticMarkup(<MemoryRouter>{boundary.render()}</MemoryRouter>)).toContain("Couldn&#x27;t show the work queue")
    // new data (a refetch landed) renders the block again
    expect(BlockBoundary.getDerivedStateFromProps({ ...props, resetKey: 'b' }, boundary.state)).toEqual({ failed: false, resetKey: 'b' })
    expect(BlockBoundary.getDerivedStateFromProps(props, boundary.state)).toBeNull()
    expect(retried).toBe(0)
  })
})

