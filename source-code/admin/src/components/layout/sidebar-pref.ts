/*
  The sidebar's collapsed state (Page-Layout-Addendum). Below 1280px it starts collapsed to icons,
  from 1280px it starts expanded. A user's own choice is remembered per user and per width mode,
  so expanding it on a laptop doesn't also force it open on a wide monitor. Browser storage only:
  a convenience, so it fails quietly (private windows, blocked storage).
*/
export const NARROW_QUERY = '(max-width: 1279.98px)'

export type SidebarMode = 'narrow' | 'wide'

export const sidebarKey = (userId: string, mode: SidebarMode) => `harboost.sidebar.collapsed.${userId}.${mode}`

export function readSidebarPref(key: string): boolean | null {
  try {
    const v = localStorage.getItem(key)
    return v === null ? null : v === '1'
  } catch {
    return null
  }
}

export function writeSidebarPref(key: string, collapsed: boolean): void {
  try {
    localStorage.setItem(key, collapsed ? '1' : '0')
  } catch {
    // storage unavailable — the choice lasts for this page view only
  }
}

/** The stored choice for this user and mode, else the mode's default. */
export function sidebarCollapsed(stored: boolean | null, mode: SidebarMode): boolean {
  return stored ?? mode === 'narrow'
}
