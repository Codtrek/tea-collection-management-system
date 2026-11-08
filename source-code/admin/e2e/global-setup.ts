import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { FullConfig } from '@playwright/test'

/** Logs in once through the API and stores the JWT where the portal looks for it (`harboost.token`). */
export default async function globalSetup(config: FullConfig) {
  const api = process.env.E2E_API_URL ?? 'http://localhost:3001'
  const phone = process.env.E2E_USER
  const password = process.env.E2E_PASS
  if (!phone || !password) throw new Error('Set E2E_USER and E2E_PASS (a portal Administrator) to run the layout checks.')
  const res = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  if (!res.ok) throw new Error(`Login against ${api} failed: HTTP ${res.status}`)
  const { accessToken } = (await res.json()) as { accessToken: string }
  const origin = config.projects[0].use.baseURL!
  const file = path.resolve(import.meta.dirname, '.auth/state.json')
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(
    file,
    JSON.stringify({ cookies: [], origins: [{ origin, localStorage: [{ name: 'harboost.token', value: accessToken }] }] }),
  )
}
