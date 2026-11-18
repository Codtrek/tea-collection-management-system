import { expect, test, type Page } from '@playwright/test'

/*
  Dashboard-Addendum, against a running backend + local DB:
  - every "Needs your action" count equals the list its link opens (read through the same API
    the linked page reads), for each portal role;
  - each role sees only its sections, and nothing from the old mock dashboard.
  Users: the seeded Administrator / Officer / Manager (E2E_ADMIN / E2E_OFFICER / E2E_MANAGER).
*/

const API = process.env.E2E_API_URL ?? 'http://localhost:3001'
const ROLES = {
  Administrator: process.env.E2E_USER ?? '0771234567',
  Officer: process.env.E2E_OFFICER ?? '0771234568',
  Manager: process.env.E2E_MANAGER ?? '0771234569',
} as const

interface Summary {
  today: string
  role: string
  actions: { key: string; count: number; href: string; label: string; action: string }[]
  primaryAction: { label: string; href: string; key: string } | null
  toDecide: number
  todayView: Record<string, unknown> | null
  monthView: Record<string, unknown> | null
  charts: unknown
  activity: unknown[]
}

const pause = () => new Promise((r) => setTimeout(r, 700)) // under the 15-per-10s throttle

async function login(phone: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password: process.env.E2E_PASS }),
  })
  expect(res.ok, `login ${phone}`).toBe(true)
  return ((await res.json()) as { accessToken: string }).accessToken
}

async function get<T>(token: string, path: string): Promise<T> {
  await pause()
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok, `GET ${path}: ${res.status}`).toBe(true)
  return (await res.json()) as T
}

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

/** How many records the item's link opens — the linked page's own API and filter. */
async function listCount(token: string, href: string, today: string): Promise<number> {
  const [beforeHash] = href.split('#')
  const [pathPart, rest = ''] = beforeHash.split('?')
  const p = new URLSearchParams(rest)
  if (pathPart === '/collections') {
    const rows = await get<{ graded: boolean; status: string; date: string; pendingCorrectionId?: number }[]>(token, '/collections')
    const cutoff = p.get('olderThan') ? addDays(today, -Number(p.get('olderThan'))) : null
    return rows.filter(
      (c) =>
        (p.get('grade') !== 'Ungraded' || !c.graded) &&
        (!p.get('status') || c.status === p.get('status')) &&
        (!p.get('date') || c.date === p.get('date')) &&
        (!cutoff || c.date <= cutoff) &&
        (p.get('corrections') !== 'pending' || c.pendingCorrectionId !== undefined),
    ).length
  }
  if (pathPart === '/fertilizer/requests') {
    const rows = await get<{ status: string; staleCommittedKg: number }[]>(token, '/fertilizer/requests')
    return p.get('scope') === 'stale' ? rows.filter((r) => r.staleCommittedKg > 0).length : rows.filter((r) => r.status === p.get('status')).length
  }
  if (pathPart === '/estates/settlements') {
    const q = new URLSearchParams({ month: p.get('month')!, status: p.get('status')! })
    if (p.get('bank') === 'missing') q.set('noBank', 'true')
    return (await get<{ total: number }>(token, `/estates/settlements?${q}`)).total
  }
  if (pathPart === '/employees/advances') return (await get<{ tabCounts: { decide: number } }>(token, '/employees/advances?tab=decide')).tabCounts.decide
  if (pathPart === '/employees/payroll') return (await get<{ total: number }>(token, `/employees/payroll/month?${p}`)).total
  if (pathPart === '/fertilizer/alerts') return (await get<{ summary: { expired: { count: number } } }>(token, '/fertilizer/alerts')).summary.expired.count
  if (pathPart === '/employees/pay-rates') {
    const rows = await get<{ status: string; approval: { canDecide: boolean } }[]>(token, '/employees/pay-adjustments')
    return rows.filter((a) => a.status === 'pending' && a.approval.canDecide).length
  }
  if (pathPart === '/holidays') return (await get<{ pending: unknown[] }>(token, `/holidays?year=${today.slice(0, 4)}`)).pending.length
  throw new Error(`no list check for ${href}`)
}

async function openAs(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('harboost.token', t), token)
  await page.goto('/dashboard')
  await page.locator('main h1').first().waitFor()
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

for (const [role, phone] of Object.entries(ROLES)) {
  test.describe.serial(`dashboard as ${role}`, () => {
    let token = ''
    let summary: Summary
    test.beforeAll(async () => {
      token = await login(phone)
      summary = await get<Summary>(token, '/dashboard/summary?role=Administrator')
    })

    test('the role comes from the token, not the query string', () => {
      expect(summary.role).toBe(role)
    })

    test('every "Needs your action" count equals its linked list', async () => {
      test.setTimeout(120_000)
      for (const item of summary.actions) {
        expect(item.count, `${item.key} is never zero`).toBeGreaterThan(0)
        // "payroll not generated" counts the month itself; its page shows the Generate step, not rows
        if (item.key === 'payrollDue' && !item.href.includes('status=')) continue
        expect(await listCount(token, item.href, summary.today), `${item.key} → ${item.href}`).toBe(item.count)
      }
    })

    test('sections by role; nothing from the old mock dashboard', async ({ page }) => {
      await openAs(page, token)
      const main = page.locator('main')
      await expect(main.getByRole('heading', { name: 'Needs your action' })).toBeVisible()
      await expect(main.locator('#needs-action li')).toHaveCount(summary.actions.length)
      // by id: Recent activity has its own "Today" group heading
      await expect(main.locator('h2#today-title')).toHaveCount(summary.todayView ? 1 : 0)
      await expect(main.locator('h2#month-title')).toHaveCount(summary.monthView ? 1 : 0)
      // Expenses (decision c): Manager and Administrator only, always with what it includes
      const expensesNote = main.getByText('Includes leaf purchases, processed wages, fertilizer stock and daily entries')
      await expect(expensesNote).toHaveCount(summary.monthView && 'expenses' in summary.monthView ? 1 : 0)
      if (role === 'Officer') await expect(main.getByText('Expenses to date')).toHaveCount(0)
      for (const gone of ["Today's Revenue", 'Net profit', 'Monthly Revenue', 'not live GPS', 'Hill Crest', 'Welcome back']) {
        await expect(main.getByText(gone)).toHaveCount(0)
      }
      // one primary button: the top queue row's action; nothing decides money here
      if (summary.primaryAction) {
        expect(summary.primaryAction.label).toBe(summary.actions[0].action)
        await expect(main.getByRole('button', { name: summary.primaryAction.label }).first()).toBeVisible()
      }
      await expect(main.getByRole('button', { name: /^(Approve|Decline)$/ })).toHaveCount(0)
    })
  })
}

test.describe('one bad block never takes down the page (real browser)', () => {
  /** Serve the page a doctored copy of the real summary. */
  async function openWith(page: Page, doctor: (s: Record<string, unknown>) => void) {
    const token = await login(ROLES.Manager)
    await page.route('**/dashboard/summary', async (route) => {
      const res = await route.fetch()
      const body = (await res.json()) as Record<string, unknown>
      doctor(body)
      await route.fulfill({ response: res, json: body })
    })
    await openAs(page, token)
  }

  test('a queue row the page cannot render: only the queue shows an error', async ({ page }) => {
    await openWith(page, (s) => {
      s.actions = [{ key: 'broken', count: 1, href: '/x' }] // no label: rendering it throws
    })
    const main = page.locator('main')
    await expect(main.getByText("Couldn't show the work queue")).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Recent activity' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'This month', exact: true })).toBeVisible()
  })

  test('a response missing a section: that block says so, the rest renders', async ({ page }) => {
    await openWith(page, (s) => {
      delete s.charts
      delete s.quickActions // (never sent; the old field must not matter either way)
    })
    const main = page.locator('main')
    await expect(main.getByText("Couldn't show the intake charts")).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Needs your action' })).toBeVisible()
    await expect(main.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  })
})
