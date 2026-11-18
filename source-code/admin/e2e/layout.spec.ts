import { expect, test, type Page } from '@playwright/test'
import { PAGES, WIDTHS, zoomed } from './pages'

/*
  Page-Layout-Addendum: the header (breadcrumb, title, description, actions) spans the content
  width and never squeezes into a narrow column; the page itself never scrolls sideways.
*/

async function open(page: Page, path: string) {
  await page.goto(path)
  await page.locator('main h1').first().waitFor()
  // the board polls and map tiles stream, so the network never goes idle: settle briefly instead
  await page.waitForLoadState('load')
  // wait for the data, not just the shell (each page shows a spinner while loading)
  await page.locator('main .animate-spin').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(800)
}

/** The title is one line (height within ~1.6 line-heights) and the breadcrumb doesn't stack. */
async function expectHeaderIntact(page: Page) {
  const title = page.locator('main h1').first()
  const { height, lineHeight } = await title.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
  }))
  expect(height, 'title wraps').toBeLessThanOrEqual(lineHeight * 1.6)
  const crumbs = page.locator('main nav[aria-label="Breadcrumb"] li')
  const tops = await crumbs.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
  expect(new Set(tops).size, 'breadcrumb stacks').toBe(1)
}

async function expectNoSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: document.documentElement.clientWidth,
  }))
  expect(scroll, 'page scrolls sideways').toBeLessThanOrEqual(width)
}

for (const p of PAGES) {
  for (const width of WIDTHS) {
    test.describe(`${p.name} @ ${width}px`, () => {
      test.use(zoomed(width, 1))
      test('header intact, no sideways scroll', async ({ page }) => {
        await open(page, p.path)
        // at 768px a long title may legitimately wrap; the breadcrumb and scroll rules still hold
        if (width >= 1024) await expectHeaderIntact(page)
        await expectNoSidewaysScroll(page)
      })
    })
  }
  for (const zoom of [0.9, 1.1]) {
    test.describe(`${p.name} @ 1280px, ${zoom * 100}% zoom`, () => {
      test.use(zoomed(1280, zoom))
      test('header intact, no sideways scroll', async ({ page }) => {
        await open(page, p.path)
        await expectHeaderIntact(page)
        await expectNoSidewaysScroll(page)
      })
    })
  }
}

test.describe('dispatch board layout by width', () => {
  const box = (page: Page, id: string) => page.getByTestId(id).boundingBox()

  test.describe('1440px: table and map side by side', () => {
    test.use(zoomed(1440, 1))
    test('map beside the table', async ({ page }) => {
      await open(page, '/collections/dispatch')
      const [table, map] = [await box(page, 'dispatch-table'), await box(page, 'dispatch-map')]
      expect(map!.x).toBeGreaterThan(table!.x + table!.width - 1)
    })
  })

  test.describe('1280px: map below, full width, can be hidden', () => {
    test.use(zoomed(1280, 1))
    test('map stacks under the table', async ({ page }) => {
      await open(page, '/collections/dispatch')
      const [table, map] = [await box(page, 'dispatch-table'), await box(page, 'dispatch-map')]
      expect(map!.y).toBeGreaterThanOrEqual(table!.y + table!.height - 1)
      expect(Math.abs(map!.width - table!.width)).toBeLessThan(2)
      await page.getByRole('button', { name: 'Hide map' }).click()
      await expect(page.getByTestId('dispatch-map')).toBeHidden()
      await page.getByRole('button', { name: 'Show map' }).click()
      await expect(page.getByTestId('dispatch-map')).toBeVisible()
    })
  })

  test.describe('below 768px: agents as cards', () => {
    test.use(zoomed(700, 1))
    test('card list instead of the table', async ({ page }) => {
      await open(page, '/collections/dispatch')
      await expect(page.getByTestId('agent-cards')).toBeVisible()
      await expect(page.getByTestId('dispatch-table')).toBeHidden()
      await expectNoSidewaysScroll(page)
    })
  })
})

test.describe('sidebar collapses to icons below 1280px', () => {
  test.use(zoomed(1024, 1))
  test('collapsed by default, and the choice is remembered', async ({ page }) => {
    await open(page, '/fertilizer')
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
    await page.getByRole('button', { name: /expand sidebar/i }).click()
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false')
    await page.reload()
    await expect(page.locator('aside').first()).toHaveAttribute('data-collapsed', 'false')
  })
})
