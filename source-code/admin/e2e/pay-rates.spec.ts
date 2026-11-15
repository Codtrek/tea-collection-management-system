import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/* Pay Rates (Administration-Addendum §6–7): pay history by role, an employee's Pay tab, who sees what. Read-only. */

async function ready(page: Page) {
  await page.locator('main h1').first().waitFor({ timeout: 60_000 })
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

/** Act as another seeded portal user instead of the Administrator the suite logs in as. */
export async function actAs(page: Page, phone: string) {
  const res = await fetch(`${process.env.E2E_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password: process.env.E2E_PASS }),
  })
  const { accessToken } = (await res.json()) as { accessToken: string }
  await page.addInitScript((t) => localStorage.setItem('harboost.token', t), accessToken)
}

const MANAGER = process.env.E2E_MANAGER ?? '0771234569'
const OFFICER = process.env.E2E_OFFICER ?? '0771234568'

test.use({ viewport: { width: 1440, height: 900 } })
test.setTimeout(90_000)

test('Factory Setup → Pay Rates: each role’s rate, its people, its history', async ({ page }) => {
  await page.goto('/admin/factory-setup')
  await ready(page)
  await page.getByRole('tab', { name: 'Pay Rates' }).click()
  const operator = page.getByRole('button', { name: /^Machine Operator/ })
  await expect(operator).toContainText('Rs. 400 · Rs. 600 · Rs. 480 · Rs. 720')
  await operator.click()
  await expect(page.getByText('Rates on record when pay history started').first()).toBeVisible()
})

test('an employee’s Pay tab shows the rate in force, where it comes from, and the history', async ({ page }) => {
  await page.goto('/employees/EMP-0002?tab=pay')
  await ready(page)
  await expect(page.getByText('Pay in force today (Rs./hour)')).toBeVisible()
  await expect(page.getByText('Machine Operator role rate')).toBeVisible()
  // pay is never edited on the edit form
  await page.goto('/employees/EMP-0002/edit')
  await ready(page)
  await expect(page.getByLabel('Day', { exact: true })).toHaveAttribute('readonly', '')
  await expect(page.getByRole('link', { name: 'see the Pay tab' })).toBeVisible()
})

test('the Manager sees Pay Rates under People; an Officer doesn’t', async ({ browser }) => {
  const manager = await browser.newPage()
  await actAs(manager, MANAGER)
  await manager.goto('/employees/pay-rates')
  await ready(manager)
  await expect(manager.locator('main h1')).toHaveText('Pay Rates')
  await expect(manager.getByRole('link', { name: 'Pay Rates' })).toBeVisible()
  const officer = await browser.newPage()
  await actAs(officer, OFFICER)
  await officer.goto('/employees/pay-rates')
  await officer.locator('main').waitFor()
  await expect(officer.getByText('Your role can’t view pay rates')).toBeVisible()
  await expect(officer.getByRole('link', { name: 'Pay Rates' })).toHaveCount(0)
})

test('capture screenshots for review', async ({ page }) => {
  test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture')
  const out = path.resolve(import.meta.dirname, 'screenshots')
  mkdirSync(out, { recursive: true })
  await page.goto('/admin/factory-setup')
  await ready(page)
  await page.getByRole('tab', { name: 'Pay Rates' }).click()
  await page.getByRole('button', { name: /^Machine Operator/ }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, 'factory-setup-pay-rates.png'), fullPage: true })
  await page.goto('/employees/EMP-0002?tab=pay')
  await ready(page)
  await page.screenshot({ path: path.join(out, 'employee-pay-tab.png'), fullPage: true })
  await page.goto('/admin/settings')
  await ready(page)
  await page.screenshot({ path: path.join(out, 'system-settings-payroll.png'), fullPage: true })
})
