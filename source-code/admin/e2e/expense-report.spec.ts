import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/* RPT-03 Expense report in the browser (Finance-Reports-Addendum): default period, empty state, recoveries, entries. */

async function ready(page: Page) {
  await page.locator('main h1').first().waitFor()
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

test.use({ viewport: { width: 1440, height: 900 } })

test('opens on the last complete month — never "latest with data"', async ({ page }) => {
  await page.goto('/reports/expenses')
  await ready(page)
  await expect(page.getByText('Showing October 2026')).toBeVisible()
  await expect(page.getByLabel('Report month')).toBeVisible()
  await expect(page.locator('main')).not.toContainText('Latest with data')
  await expect(page.getByText('Expenses by month — the 12 months to October 2026')).toBeVisible()
})

test('an empty period says why, and draws no Rs. 0 chart', async ({ page }) => {
  await page.goto('/reports/expenses?month=2026-10&category=Water')
  await ready(page)
  await expect(page.getByText('No Water expenses in October 2026.')).toBeVisible()
  await expect(page.getByText('Expenses by month')).toHaveCount(0)
  await expect(page.locator('main .recharts-surface')).toHaveCount(0)
})

test('recoveries open from their card and are never an expense category', async ({ page }) => {
  await page.goto('/reports/expenses?month=2026-06')
  await ready(page)
  await page.getByRole('button', { name: /Recovered from estate owners: .* Show what was recovered/ }).click()
  const panel = page.locator('#recoveries-body')
  await expect(panel).toBeVisible()
  for (const line of ['Transport charges', 'Fertilizer charges', 'Advance installments']) {
    await expect(panel.getByText(line, { exact: true })).toBeVisible()
  }
  await expect(panel.getByText('Net leaf cost')).toBeVisible()
  // the category table: leaf, wages, operating costs — no transport / fertilizer deductions
  const names = await page.locator('main table tbody tr td:first-child').allTextContents()
  expect(names.join('|')).toMatch(/Green leaf purchases/)
  expect(names.join('|')).not.toMatch(/Transport|Fertilizer charges/)
})

test('estimated wages are shown apart from the total', async ({ page }) => {
  await page.goto('/reports/expenses')
  await ready(page)
  await expect(page.getByText(/Attendance × pay rates comes to about Rs/)).toBeVisible()
  await page.getByRole('button', { name: /Not expenses: recovered, loaned and estimated/ }).click()
  await expect(page.locator('#recoveries-body').getByText('Estimated wages (not in total)')).toBeVisible()
})

/** Act as the seeded Officer (expenses: edit) instead of the Administrator the suite logs in as. */
async function asOfficer(page: Page) {
  const res = await fetch(`${process.env.E2E_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: process.env.E2E_OFFICER ?? '0771234568', password: process.env.E2E_PASS }),
  })
  const { accessToken } = (await res.json()) as { accessToken: string }
  await page.addInitScript((t) => localStorage.setItem('harboost.token', t), accessToken)
}

test('the Administrator views expenses but cannot log one', async ({ page }) => {
  await page.goto('/reports/expenses')
  await ready(page)
  await expect(page.getByRole('button', { name: 'Log Daily Expense' })).toHaveCount(0)
  await page.goto('/reports/expenses/new')
  await ready(page)
  await expect(page.getByText('Your role can’t log daily expenses')).toBeVisible()
})

test('Log Daily Expense refuses a future date before saving', async ({ page }) => {
  await asOfficer(page)
  await page.goto('/reports/expenses/new')
  await ready(page)
  await expect(page.getByLabel('Category')).toContainText('Firewood / dryer fuel')
  // receipts wait for the shared file-storage task: no upload, nothing stored in the database
  await expect(page.getByText('Receipts: coming soon (file storage)')).toBeVisible()
  await expect(page.getByLabel('Receipt file')).toHaveCount(0)
  const date = page.getByLabel('Date')
  await date.fill('2099-01-01')
  await date.blur()
  await expect(page.getByText('An expense can’t be dated in the future')).toBeVisible()
})

test('Export Excel downloads the table as computed, the totals row equal to the Total card', async ({ page }) => {
  await page.goto('/reports/expenses?month=2026-06')
  await ready(page)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export Excel' }).click()])
  expect(download.suggestedFilename()).toBe('expenses-2026-06-category.csv')
  const lines = readFileSync((await download.path())!, 'utf8').replace(/^\uFEFF/, '').split('\r\n')
  expect(lines[4]).toMatch(/^Not counted: recovered from estate owners Rs 55500.00/)
  const total = lines.at(-1)!.split(',')
  expect(total[0]).toBe('Total')
  const card = await page.locator('main p.leading-none').first().textContent()
  expect(Number(total[3])).toBe(Number(card!.replace(/^Rs\.\s*/, '').replace(/,/g, '')))
})

test('print hides the controls and says what it shows; PDF, scheduling and sharing say "Coming soon"', async ({ page }) => {
  await page.goto('/reports/expenses')
  await ready(page)
  for (const name of ['Export PDF', 'Schedule Report', 'Share Report']) {
    await expect(page.getByRole('button', { name: `${name} (coming soon)` })).toBeDisabled()
  }
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Export Excel' })).toBeHidden()
  await expect(page.getByText(/October 2026 · All categories · printed/)).toBeVisible()
  // what isn't counted is printed with the report
  await expect(page.locator('#recoveries-body')).toBeVisible()
})

test('capture screenshots for review', async ({ page }) => {
  test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture')
  const out = path.resolve(import.meta.dirname, 'screenshots')
  mkdirSync(out, { recursive: true })
  for (const [name, url] of [
    ['expenses-oct', '/reports/expenses'],
    ['expenses-jun-recoveries', '/reports/expenses?month=2026-06'],
    ['expenses-entry', '/reports/expenses?month=2026-07&group=entry'],
    ['expenses-empty', '/reports/expenses?month=2026-10&category=Water'],
    ['factory-setup-categories', '/admin/factory-setup'],
  ] as const) {
    await page.goto(url)
    await ready(page)
    if (name === 'expenses-jun-recoveries') await page.getByRole('button', { name: /Not expenses/ }).click()
    if (name === 'factory-setup-categories') await page.getByRole('tab', { name: 'Expense Categories' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true })
  }
})
