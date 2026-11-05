import { describe, expect, it } from 'vitest'
import { sidebarCollapsed, sidebarKey } from './sidebar-pref'

describe('sidebar default and memory', () => {
  it('collapses to icons below 1280px and expands above, unless the user chose otherwise', () => {
    expect(sidebarCollapsed(null, 'narrow')).toBe(true)
    expect(sidebarCollapsed(null, 'wide')).toBe(false)
    expect(sidebarCollapsed(false, 'narrow')).toBe(false)
    expect(sidebarCollapsed(true, 'wide')).toBe(true)
  })

  it('keeps each user’s choice per width mode', () => {
    expect(sidebarKey('7', 'narrow')).not.toBe(sidebarKey('7', 'wide'))
    expect(sidebarKey('7', 'narrow')).not.toBe(sidebarKey('8', 'narrow'))
  })
})
