import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'

/*
  Users & Roles (docs/specs/Users-Roles-Addendum.md). Needs the backend on E2E_API_URL against a
  seeded scratch DB; E2E_DB_URL (psql URL of that same DB) enables the "not stored in plain text"
  check. Serial: some tests change the matrix and put it back.
*/
test.describe.configure({ mode: 'serial', timeout: 120_000 })

const API = process.env.E2E_API_URL ?? 'http://localhost:3001'
const ADMIN = process.env.E2E_USER ?? '0771234567'
const OFFICER = process.env.E2E_OFFICER ?? '0771234568'
const PASS = process.env.E2E_PASS ?? ''

/** The API's own throttle (15 requests / 10 s per user, 5 sign-ins / min per account) is left on: wait it out. */
async function withThrottle(send: () => Promise<Response>): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await send()
    if (res.status !== 429 || attempt >= 6) return res
    await new Promise((r) => setTimeout(r, 11_000))
  }
}

const tokens = new Map<string, { accessToken: string; user: { mustChangePassword?: boolean } }>()

/** Signs in once per account and reuses the token (pass fresh after a sign-out). */
async function login(phone: string, password = PASS, fresh = false) {
  if (!fresh && tokens.has(phone)) return tokens.get(phone)!
  const res = await withThrottle(() =>
    fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    }),
  )
  expect(res.ok, `login ${phone}: HTTP ${res.status}`).toBe(true)
  const body = (await res.json()) as { accessToken: string; user: { mustChangePassword?: boolean } }
  tokens.set(phone, body)
  return body
}

async function api(token: string, path: string, init: RequestInit = {}) {
  return withThrottle(() =>
    fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    }),
  )
}

async function setCell(token: string, role: string, module: string, level: string, reason = 'e2e restore') {
  return api(token, '/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify({ entries: [{ role, module, level }], reason }),
  })
}

async function openMatrix(page: Page) {
  await page.goto('/admin/users?tab=permissions')
  await expect(page.getByTestId('permission-matrix')).toBeVisible({ timeout: 30_000 })
}

test.describe('Role permissions matrix', () => {
  for (const width of [1280, 1366, 1440]) {
    test(`every level name is fully visible at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openMatrix(page)
      const report = await page.evaluate(() => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const out: string[] = []
        const cells = document.querySelectorAll<HTMLElement>('[data-cell]')
        cells.forEach((el) => {
          const cs = getComputedStyle(el)
          if (el instanceof HTMLSelectElement) {
            ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
            const text = el.options[el.selectedIndex]?.text ?? ''
            if (!text.trim()) out.push(`${el.dataset.cell}: blank`)
            const need = ctx.measureText(text).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
            if (need > el.clientWidth + 0.5) out.push(`${el.dataset.cell}: "${text}" needs ${need}px, has ${el.clientWidth}px`)
          } else if (el.scrollWidth > el.clientWidth) {
            out.push(`${el.dataset.cell}: locked cell clipped`)
          }
        })
        return { count: cells.length, problems: out }
      })
      expect(report.count).toBeGreaterThan(40)
      expect(report.problems).toEqual([])
    })
  }

  test('locked cells can’t be changed in the UI or through the API', async ({ page }) => {
    await openMatrix(page)
    // pinned: a static, locked display — no control to change
    const pinned = page.locator('[data-cell="Administrator:collection"]')
    await expect(pinned).toHaveAttribute('data-locked', 'pinned')
    await expect(page.locator('select[data-cell="Administrator:collection"]')).toHaveCount(0)
    await pinned.focus()
    await expect(page.getByRole('tooltip')).toContainText('always keeps full access')
    // capped: the Administrator's separated-duty cells offer only None / View
    const capped = page.locator('select[data-cell="Administrator:gradingApproval"]')
    await expect(capped.locator('option')).toHaveText(['None', 'View'])

    const { accessToken } = await login(ADMIN)
    expect((await setCell(accessToken, 'Administrator', 'collection', 'approve')).status).toBe(403)
    expect((await setCell(accessToken, 'Administrator', 'collection', 'view')).status).toBe(403)
    expect((await setCell(accessToken, 'Administrator', 'gradingApproval', 'approve')).status).toBe(403)
    expect((await setCell(accessToken, 'Administrator', 'expenses', 'edit')).status).toBe(403)
    expect((await setCell(accessToken, 'Officer', 'superPowers', 'approve')).status).toBe(400)
  })

  test('dirty cells, Discard, the review list and the required reason', async ({ page }) => {
    await openMatrix(page)
    const dispatch = page.locator('select[data-cell="Officer:dispatch"]')
    await dispatch.selectOption('view')
    await expect(page.locator('td[data-changed]')).toHaveCount(1)
    await expect(page.getByText('was Edit')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Unsaved permission changes' })).toContainText('1 change not saved')
    await page.getByRole('button', { name: 'Discard' }).click()
    await expect(page.locator('td[data-changed]')).toHaveCount(0)
    await expect(dispatch).toHaveValue('edit')

    // a finance key needs a reason
    await page.locator('select[data-cell="Officer:expenses"]').selectOption('view')
    await page.getByRole('button', { name: 'Review changes' }).click()
    await expect(page.getByTestId('review-list')).toHaveText(['Officer · Daily expenses: Edit → View'])
    const save = page.getByRole('button', { name: 'Save 1 change' })
    await expect(save).toBeDisabled()
    await page.getByLabel('Reason (required)').fill('e2e: Officers stop logging expenses')
    await save.click()
    await expect(page.getByRole('status').first()).toContainText('1 permission change saved')
    await expect(page.locator('td[data-changed]')).toHaveCount(0)

    const { accessToken } = await login(ADMIN)
    expect((await setCell(accessToken, 'Officer', 'expenses', 'edit')).status).toBe(200)
  })

  test('a reduced permission blocks the user’s very next request (same token)', async () => {
    const admin = (await login(ADMIN)).accessToken
    const officer = (await login(OFFICER)).accessToken
    expect((await setCell(admin, 'Officer', 'administration', 'view')).status).toBe(200)
    expect((await api(officer, '/admin/users')).status).toBe(200)
    expect((await setCell(admin, 'Officer', 'administration', 'none')).status).toBe(200)
    expect((await api(officer, '/admin/users')).status).toBe(403)
  })

  test('below 1024px one role at a time, same rows', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await openMatrix(page)
    await page.getByRole('tab', { name: 'Officer' }).click()
    await expect(page.locator('select[data-cell^="Officer:"]').first()).toBeVisible()
    await expect(page.locator('[data-cell^="Manager:"]')).toHaveCount(0)
    const width = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(width).toBe(true)
  })
})

test.describe('System users', () => {
  test('own row: status and role actions are disabled with the reason; the API refuses too', async ({ page }) => {
    await page.goto('/admin/users')
    const me = page.getByRole('row').filter({ hasText: '(you)' })
    await expect(me).toBeVisible({ timeout: 30_000 })
    const deactivate = me.getByRole('button', { name: 'Deactivate' })
    await expect(deactivate).toHaveAttribute('aria-disabled', 'true')
    await deactivate.focus()
    await expect(page.getByRole('tooltip')).toContainText('can’t deactivate your own account')

    const { accessToken } = await login(ADMIN)
    const users = (await (await api(accessToken, '/admin/users')).json()) as Array<{ id: string; isSelf: boolean }>
    const self = users.find((u) => u.isSelf)!
    expect((await api(accessToken, `/admin/users/${self.id}/deactivate`, { method: 'POST', body: '{}' })).status).toBe(403)
    expect(
      (await api(accessToken, `/admin/users/${self.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'Manager' }) }))
        .status,
    ).toBe(403)
  })

  test('add user: temporary password shown once, hashed, and changed at first sign-in', async ({ page, browser }) => {
    await page.goto('/admin/users')
    await page.getByRole('button', { name: 'Add user' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add user' })
    await dialog.getByRole('combobox', { name: 'Employee', exact: true }).click()
    await dialog.getByRole('option').first().click()
    await dialog.getByLabel('Role').selectOption('Officer')
    const phone = `07${String(Date.now()).slice(-8)}`
    await dialog.getByLabel('Phone (sign-in)').fill(phone)
    await dialog.getByRole('button', { name: 'Add user' }).click()

    const shown = page.getByTestId('temp-password')
    await expect(shown).toBeVisible()
    const temp = (await shown.textContent())!.trim()
    expect(temp).toMatch(/^[A-Za-z0-9_-]{12}$/)
    await page.getByRole('button', { name: 'Done, I’ve noted it' }).click()
    await expect(shown).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('row').filter({ hasText: phone })).toBeVisible({ timeout: 30_000 })
    expect(await page.content()).not.toContain(temp)

    if (process.env.E2E_DB_URL) {
      const hash = execFileSync('psql', [process.env.E2E_DB_URL, '-tAc', `select password_hash from users where phone='${phone}'`])
        .toString()
        .trim()
      expect(hash.startsWith('$2')).toBe(true)
      expect(hash).not.toContain(temp)
    }

    // first sign-in: everything but /auth/me and change-password is refused, and the portal sends them there
    const first = await login(phone, temp)
    expect(first.user.mustChangePassword).toBe(true)
    const blocked = await api(first.accessToken, '/collections')
    expect(blocked.status).toBe(403)
    expect(((await blocked.json()) as { code?: string }).code).toBe('PASSWORD_CHANGE_REQUIRED')

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const p2 = await ctx.newPage()
    await p2.goto('/login')
    await p2.getByLabel('Phone number').fill(phone)
    await p2.getByRole('textbox', { name: 'Password', exact: true }).fill(temp)
    await p2.getByRole('button', { name: 'Sign In' }).click()
    await expect(p2).toHaveURL(/\/change-password$/)
    await p2.goto('/dashboard')
    await expect(p2).toHaveURL(/\/change-password$/)
    await p2.getByRole('textbox', { name: 'Temporary password' }).fill(temp)
    await p2.getByRole('textbox', { name: 'New password', exact: true }).fill('E2e-own-password-1')
    await p2.getByRole('textbox', { name: 'Repeat new password' }).fill('E2e-own-password-1')
    await p2.getByRole('button', { name: 'Save password' }).click()
    await expect(p2).toHaveURL(/\/dashboard$/)
    await ctx.close()

    // the temporary password no longer works; the old (pre-change) token is dead
    const res = await withThrottle(() =>
      fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: temp }),
      }),
    )
    expect(res.status).toBe(401)
    expect((await api(first.accessToken, '/auth/me')).status).toBe(401)
  })

  test('deactivation signs the user out on their next request; reactivation restores sign-in', async () => {
    const admin = (await login(ADMIN)).accessToken
    const officer = (await login(OFFICER)).accessToken
    const users = (await (await api(admin, '/admin/users')).json()) as Array<{ id: string; phone: string }>
    const target = users.find((u) => u.phone === OFFICER)!
    expect((await api(officer, '/auth/me')).status).toBe(200)
    expect((await api(admin, `/admin/users/${target.id}/deactivate`, { method: 'POST', body: '{"reason":"e2e"}' })).status).toBe(201)
    expect((await api(officer, '/auth/me')).status).toBe(401)
    expect((await api(admin, `/admin/users/${target.id}/reactivate`, { method: 'POST' })).status).toBe(201)
    expect((await api(officer, '/auth/me')).status).toBe(401) // the old token stays dead
    await login(OFFICER, PASS, true)
  })
})
