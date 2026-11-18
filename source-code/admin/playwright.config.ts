import { defineConfig, devices } from '@playwright/test'

/*
  Layout checks and screenshots (docs/specs/Page-Layout-Addendum.md). Runs the portal on its own
  port against a running backend + local DB:

    E2E_API_URL=http://localhost:3001 E2E_USER=0771234567 E2E_PASS=… npx playwright test

  The backend is not started here — it needs the database and its own .env. E2E_APP_DIR serves
  another checkout of the portal instead (e.g. a git worktree of an earlier commit, for
  before/after screenshots).
*/
const PORT = Number(process.env.E2E_PORT ?? 5199)
const API = process.env.E2E_API_URL ?? 'http://localhost:3001'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: './e2e/.auth/state.json',
    ...devices['Desktop Chrome'],
    // the full Chromium build in new headless mode (no separate headless-shell download)
    channel: 'chromium',
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: process.env.E2E_APP_DIR ?? '.',
    url: `http://localhost:${PORT}`,
    env: { VITE_API_URL: API },
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
