import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/* RPT-02 Leaf Purchase in the browser (Reports addendum §9): redirect, partial month, print, export. */

async function ready(page: Page) {
  await page.locator('main h1').first().waitFor()
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

test.use({ viewport: { width: 1440, height: 900 } })

test('the old Revenue URL redirects, keeping its query', async ({ page }) => {
  await page.goto('/reports/revenue?month=2026-09&group=route')
  await ready(page)
  await expect(page).toHaveURL(/\/reports\/leaf-purchases\?month=2026-09&group=route$/)
  await expect(page.locator('main h1')).toHaveText('Leaf Purchase Report')
  await expect(page.getByText('Showing September 2026')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Route', selected: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Leaf Purchase Report' })).toBeVisible()
})

test('the month in progress is labelled as partial', async ({ page }) => {
  await page.goto('/reports/leaf-purchases?thisMonth=1')
  await ready(page)
  await expect(page.getByText(/Showing .* so far \(1–\d+ \w+\)/)).toBeVisible()
  await expect(page.getByText('Month in progress')).toBeVisible()
})

test('print hides the app chrome and the controls, and says what it shows', async ({ page }) => {
  await page.goto('/reports/leaf-purchases')
  await ready(page)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('aside').first()).toBeHidden()
  await expect(page.getByRole('button', { name: 'Export Excel' })).toBeHidden()
  await expect(page.getByText(/October 2026 · .* · printed/)).toBeVisible()
})

test('Export Excel downloads the table as computed, rows then totals equal to the card', async ({ page }) => {
  await page.goto('/reports/leaf-purchases')
  await ready(page)
  const records = Number((await page.getByText(/^\d+ records$/).first().textContent())!.split(' ')[0])
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export Excel' }).click()])
  expect(download.suggestedFilename()).toBe('leaf-purchases-2026-10-estate.csv')
  const lines = readFileSync((await download.path())!, 'utf8').replace(/^\uFEFF/, '').split('\r\n')
  const table = lines.slice(5)
  expect(table).toHaveLength(records + 2) // header + rows + totals
  const total = table.at(-1)!.split(',')
  expect(total[0]).toBe('Total')
  // the totals row's leaf value equals the Leaf value card
  // the first card's headline figure (SummaryCard renders it as the large `leading-none` line)
  const card = await page.locator('main p.leading-none').first().textContent()
  expect(card).toMatch(/^Rs\. /)
  expect(Number(total[6])).toBe(Number(card!.replace(/^Rs\.\s*/, '').replace(/,/g, '')))
})

test('PDF, scheduling and sharing say "Coming soon"', async ({ page }) => {
  await page.goto('/reports/leaf-purchases')
  await ready(page)
  for (const name of ['Export PDF', 'Schedule Report', 'Share Report']) {
    await expect(page.getByRole('button', { name: `${name} (coming soon)` })).toBeDisabled()
  }
  await expect(page.getByRole('button', { name: 'Export Excel' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Print' })).toBeEnabled()
})
