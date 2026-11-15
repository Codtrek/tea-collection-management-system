import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/* ADM-01 Factory Setup (Administration-Addendum): per-tab saving, unsaved-changes prompts, versions, transport. Read-only: nothing is saved. */

async function ready(page: Page) {
  await page.locator('main h1').first().waitFor()
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

test.use({ viewport: { width: 1440, height: 900 } })

test('each tab saves on its own — no page-level Save', async ({ page }) => {
  await page.goto('/admin/factory-setup')
  await ready(page)
  await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save General Info' })).toBeDisabled()
  await expect(page.getByText('Coming soon (file storage)')).toBeVisible()
  await page.getByRole('tab', { name: 'Grade Rates' }).click()
  await expect(page.getByRole('button', { name: 'Publish New Version' })).toBeVisible()
})

test('switching tabs with unsaved changes asks first', async ({ page }) => {
  await page.goto('/admin/factory-setup')
  await ready(page)
  await page.getByLabel('Branch').fill('Kandy Main')
  await expect(page.getByRole('button', { name: 'Save General Info' })).toBeEnabled()
  await page.getByRole('tab', { name: /Grade Rates/ }).click()
  await expect(page.getByText('Discard unsaved changes?')).toBeVisible()
  await page.getByRole('button', { name: 'Stay' }).click()
  await expect(page.getByLabel('Branch')).toHaveValue('Kandy Main')
  await page.getByRole('tab', { name: /Grade Rates/ }).click()
  await page.getByRole('button', { name: 'Discard and switch' }).click()
  await expect(page.getByRole('button', { name: 'Publish New Version' })).toBeVisible()
  // leaving the page is guarded too
  await page.getByLabel('Super grade (Rs./kg)').fill('999')
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  await expect(page.getByText('Leave Factory Setup?')).toBeVisible()
  await page.getByRole('button', { name: 'Stay' }).click()
  await expect(page).toHaveURL(/factory-setup/)
})

test('grade rates: tomorrow by default, today warns, the same rates are refused, a reason is required', async ({ page }) => {
  await page.goto('/admin/factory-setup')
  await ready(page)
  await page.getByRole('tab', { name: 'Grade Rates' }).click()
  const publish = page.getByRole('button', { name: 'Publish New Version' })
  // the draft starts from the latest rates, so as it stands nothing would change
  await expect(page.getByText(/same rates as the version in force from/)).toBeVisible()
  await expect(publish).toBeDisabled()
  await page.getByLabel('Super grade (Rs./kg)').fill('199')
  await page.getByLabel('Reason').fill('Tea Board revision')
  await expect(publish).toBeEnabled()
  const today = await page.getByLabel('Effective date').getAttribute('min')
  await page.getByLabel('Effective date').fill(today!)
  await expect(page.getByText(/deliveries already recorded today will also be valued at the new rates/)).toBeVisible()
  await publish.click()
  await expect(page.getByText(/Super Rs\. [\d,.]+ → /)).toBeVisible()
  await expect(page.getByText('Reason: Tea Board revision')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})

test('transport: one monthly charge per estate — not configured until set, previewed before publishing', async ({ page }) => {
  // the settlement pages compile on first visit in a fresh dev server
  test.setTimeout(90_000)
  await page.goto('/admin/factory-setup')
  await ready(page)
  await page.getByRole('tab', { name: 'Transport Rates' }).click()
  await expect(page.getByText(/Transport: not configured\./).first()).toBeVisible()
  // the seeded 42/km placeholder stays in history, marked never applied
  await expect(page.getByText('Never applied').first()).toBeVisible()
  await expect(page.getByText(/may start in a past month, back to July 2026/)).toBeVisible()
  await page.getByLabel('Monthly transport charge per estate (Rs.)').fill('5000')
  await expect(page.getByText(/Last month \(\w+ \d{4}\) this would have charged/)).toBeVisible()
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.goto('/estates/settlements/process?month=2026-07')
  await page.locator('main h1').first().waitFor({ timeout: 60_000 })
  await ready(page)
  await expect(page.getByText(/Transport: not configured\./)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Process \d+ Settlements$/ })).toBeDisabled()
})

test('Item Prices: one price list, versioned, with purchase cost beside it', async ({ page }) => {
  await page.goto('/admin/factory-setup')
  await ready(page)
  await page.getByRole('tab', { name: 'Item Prices' }).click()
  await expect(page.getByRole('button', { name: /^Urea Fertilizer/ })).toBeVisible()
  await expect(page.getByText('No purchase cost recorded yet').first()).toBeVisible()
  // the draft starts from the item's current price: as it stands nothing would change
  await expect(page.getByText(/same as the price in force from/)).toBeVisible()
  await page.getByLabel('Sold by').selectOption('bag')
  await page.getByLabel('Price per bag (Rs.)').fill('4750')
  // the hint under the price field shows the per-kg equivalent
  await expect(page.getByText('Rs. 95/kg').last()).toBeVisible()
  await page.getByRole('button', { name: /^Urea Fertilizer/ }).click()
  await expect(page.getByRole('cell', { name: /01 Jan 2026/ }).first()).toBeVisible()
  // System Settings no longer carries a second price list
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.goto('/admin/settings')
  await ready(page)
  await expect(page.getByText('Fertilizer prices')).toHaveCount(0)
})

test('Officers see item prices read-only', async ({ page }) => {
  const res = await fetch(`${process.env.E2E_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: process.env.E2E_OFFICER ?? '0771234568', password: process.env.E2E_PASS }),
  })
  const { accessToken } = (await res.json()) as { accessToken: string }
  await page.addInitScript((t) => localStorage.setItem('harboost.token', t), accessToken)
  await page.goto('/fertilizer/prices')
  await page.locator('main h1').first().waitFor({ timeout: 60_000 })
  await ready(page)
  await expect(page.locator('main h1')).toHaveText('Item Prices')
  await expect(page.getByRole('button', { name: /^Urea Fertilizer/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish New Price' })).toHaveCount(0)
})

test('capture screenshots for review', async ({ page }) => {
  test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture')
  const out = path.resolve(import.meta.dirname, 'screenshots')
  mkdirSync(out, { recursive: true })
  await page.goto('/admin/factory-setup')
  await ready(page)
  for (const tab of ['General Info', 'Grade Rates', 'Transport Rates', 'Item Prices']) {
    await page.getByRole('tab', { name: tab }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(out, `factory-setup-${tab.toLowerCase().replace(/ /g, '-')}.png`), fullPage: true })
  }
  await page.goto('/estates/settlements/process?month=2026-07')
  await ready(page)
  await page.screenshot({ path: path.join(out, 'settlement-process-transport.png'), fullPage: true })
})
