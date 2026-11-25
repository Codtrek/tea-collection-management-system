import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ModuleKey, PermissionLevel } from '@/types'
import { AccessGuard } from './AccessGuard'

/* The direct-URL page guard: same keys and "any of" rule as the server's @RequirePermission. */

const ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve']
let levels: Partial<Record<ModuleKey, PermissionLevel>> = {}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    can: (m: ModuleKey, level: PermissionLevel = 'view') =>
      ORDER.indexOf(levels[m] ?? 'none') >= ORDER.indexOf(level),
  }),
}))

const render = (module: ModuleKey | ModuleKey[]) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <AccessGuard module={module}>
        <p>secret payroll page</p>
      </AccessGuard>
    </MemoryRouter>,
  ).replace(/&#x27;/g, "'")

describe('AccessGuard', () => {
  beforeEach(() => {
    levels = {}
  })

  it('shows the page with View or higher', () => {
    levels = { payroll: 'view' }
    expect(render('payroll')).toContain('secret payroll page')
  })

  it('shows "no access" (and not the page) with None', () => {
    levels = { payroll: 'none' }
    const html = render('payroll')
    expect(html).not.toContain('secret payroll page')
    expect(html).toContain("Your role doesn't have access to Payroll")
  })

  it('several keys: any one is enough', () => {
    levels = { attendance: 'edit' }
    expect(render(['holidayCalendar', 'attendance'])).toContain('secret payroll page')
    levels = {}
    expect(render(['holidayCalendar', 'attendance'])).toContain('Holiday calendar or Attendance and leave')
  })
})
