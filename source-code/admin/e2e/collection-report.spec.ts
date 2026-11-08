import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/* RPT-01 in the browser (Reports-Collection-Addendum): header, print, export, URL state. */

async function ready(page: Page) {
  await page.locator('main h1').first().waitFor()
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

test.use({ viewport: { width: 1440, height: 900 } })

test('the title is not under the top bar after arriving from a scrolled page', async ({ page }) => {
  await page.goto('/fertilizer')
  await ready(page)
  await page.mouse.wheel(0, 4000)
  await page.waitForTimeout(300)
  await page.getByRole('link', { name: 'Collection Reports' }).click()
  await ready(page)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  const bar = await page.locator('header').first().boundingBox()
  const title = await page.locator('main h1').first().boundingBox()
  expect(title!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height)
})

test('a URL reproduces the view', async ({ page }) => {
  await page.goto('/reports/collection?month=2026-09&group=route')
  await ready(page)
  await expect(page.getByText('Showing September 2026')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Route', selected: true })).toBeVisible()
  await expect(page.locator('main table th').first()).toContainText('Route')
})

test('print hides the app chrome and the controls, and says what it shows', async ({ page }) => {
  await page.goto('/reports/collection')
  await ready(page)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('aside').first()).toBeHidden()
  await expect(page.locator('header').first()).toBeHidden()
  await expect(page.getByRole('button', { name: 'Export Excel' })).toBeHidden()
  await expect(page.getByText(/October 2026 · .* · printed/)).toBeVisible()
})

test('Export Excel downloads the table as computed, rows then totals', async ({ page }) => {
  await page.goto('/reports/collection')
  await ready(page)
  const records = Number((await page.getByText(/^\d+ records$/).first().textContent())!.split(' ')[0])
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export Excel' }).click()])
  expect(download.suggestedFilename()).toBe('collection-report-2026-10-estate.csv')
  const lines = readFileSync((await download.path())!, 'utf8').replace(/^\uFEFF/, '').split('\r\n')
  expect(lines[1]).toBe('Period: October 2026')
  const table = lines.slice(5)
  expect(table).toHaveLength(records + 2) // header + rows + totals
  expect(table.at(-1)).toMatch(/^Total,,\d+,[\d.]+,[\d.]+/)
  // the totals row equals the Factory weight card
  const factoryCard = await page.getByText(/kg$/).first().textContent()
  expect(Number(table.at(-1)!.split(',')[4]).toLocaleString('en-US', { minimumFractionDigits: 1 })).toBe(factoryCard!.replace(' kg', ''))
})

test('PDF, scheduling and sharing say "Coming soon" instead of pretending', async ({ page }) => {
  await page.goto('/reports/collection')
  await ready(page)
  for (const name of ['Export PDF', 'Schedule Report', 'Share Report']) {
    await expect(page.getByRole('button', { name: `${name} (coming soon)` })).toBeDisabled()
  }
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toHaveCount(0)
})
