import type { Page } from '@playwright/test'

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
