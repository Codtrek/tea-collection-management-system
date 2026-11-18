import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { actAs } from './act-as'

/* Pay change flow (Administration-Addendum §8): the Manager's wizard up to the preview — nothing is submitted. */

async function ready(page: Page) {
  await page.locator('main h1').first().waitFor({ timeout: 60_000 })
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

const MANAGER = process.env.E2E_MANAGER ?? '0771234569'

test.use({ viewport: { width: 1440, height: 900 } })
test.setTimeout(90_000)

test('the Manager previews a change: per-employee old → new, the monthly total, and the unset minimum', async ({ page }) => {
  await actAs(page, MANAGER)
  await page.goto('/employees/pay-rates/change')
  await ready(page)
  await page.getByRole('radio', { name: /A role/ }).click()
  await page.getByLabel('Role').selectOption('Machine Operator')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Percentage (%)').fill('5')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByText(/No minimum set \(factory\) — not checked/)).toBeVisible()
  await expect(page.getByRole('cell', { name: /N\. Silva/ })).toBeVisible()
  await expect(page.getByText(/Total monthly cost change \(1 employee\)/)).toBeVisible()
  const send = page.getByRole('button', { name: 'Send for approval' })
  await expect(send).toBeDisabled()
  await page.getByLabel('Reason').fill('Annual increment')
  await expect(send).toBeEnabled()
})

test('a decrease can’t be sent until the written agreement is confirmed', async ({ page }) => {
  await actAs(page, MANAGER)
  await page.goto('/employees/pay-rates/change?employee=EMP-0002')
  await ready(page)
  await expect(page.getByRole('list', { name: 'Selected employees' })).toContainText('N. Silva')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Increase or decrease').selectOption('decrease')
  await page.getByLabel('Percentage (%)').fill('2')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByLabel('Reason').fill('Reduced hours, agreed')
  const send = page.getByRole('button', { name: 'Send for approval' })
  await expect(page.getByText(/usually needs their written agreement/)).toBeVisible()
  await expect(send).toBeDisabled()
  await page.getByLabel('The employees’ written agreement has been obtained').check()
  await expect(send).toBeEnabled()
})

test('an Officer can’t prepare pay changes', async ({ page }) => {
  await actAs(page, process.env.E2E_OFFICER ?? '0771234568')
  await page.goto('/employees/pay-rates/change')
  await page.locator('main').waitFor()
  await expect(page.getByText('Your role can’t prepare pay changes')).toBeVisible()
})

test('capture pay-change screenshots for review', async ({ page, browser }) => {
  test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture')
  const out = path.resolve(import.meta.dirname, 'screenshots')
  mkdirSync(out, { recursive: true })
  const manager = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await actAs(manager, MANAGER)
  await manager.goto('/employees/pay-rates/change')
  await ready(manager)
  await manager.getByRole('button', { name: 'Next' }).click()
  await manager.getByLabel('Percentage (%)').fill('5')
  await manager.getByLabel('Round each rate').selectOption('10')
  await manager.getByRole('button', { name: 'Preview', exact: true }).click()
  await manager.getByText('Total monthly cost change').waitFor()
  await manager.screenshot({ path: path.join(out, 'pay-change-preview.png'), fullPage: true })
  await page.goto('/employees/pay-rates')
  await ready(page)
  await page.getByRole('button', { name: /#\d+ · −Rs 10\/hour/ }).first().click()
  await page.screenshot({ path: path.join(out, 'pay-changes-admin.png'), fullPage: true })
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'pay-change-approve.png') })
})
