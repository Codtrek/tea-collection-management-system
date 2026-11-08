import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { PAGES, WIDTHS, zoomed } from './pages'

/*
  Screenshots for review, not assertions: SCREENSHOTS=1 npx playwright test screenshots.
  Written to e2e/screenshots/ (git-ignored). Includes Dispatch at the 1270px width the bug was
  reported at, and every page at 90% / 110% zoom on a 1280px window.
*/
const OUT = path.resolve(import.meta.dirname, 'screenshots')
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture')

const shots: { page: (typeof PAGES)[number]; width: number; zoom: number }[] = [
  { page: PAGES[0], width: 1270, zoom: 1 },
  ...PAGES.flatMap((page) => WIDTHS.map((width) => ({ page, width, zoom: 1 }))),
  ...PAGES.flatMap((page) => [0.9, 1.1].map((zoom) => ({ page, width: 1280, zoom }))),
]

for (const s of shots) {
  const name = `${s.page.name}-${s.width}${s.zoom === 1 ? '' : `-zoom${Math.round(s.zoom * 100)}`}`
  test.describe(name, () => {
    test.use(zoomed(s.width, s.zoom))
    test('capture', async ({ page }) => {
      mkdirSync(OUT, { recursive: true })
      await page.goto(s.page.path)
      await page.locator('main h1').first().waitFor()
      // the board polls and map tiles stream, so the network never goes idle: settle briefly instead
  await page.waitForLoadState('load')
  // wait for the data, not just the shell (each page shows a spinner while loading)
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
    })
  })
}
