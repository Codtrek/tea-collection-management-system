/*
  Small pure helpers for deep-linking into the Employee detail page. Kept free of React so they
  are trivially unit-testable (src/features/employees/links.test.ts).
*/

/** The tab an agent's history lives on. */
export const COLLECTIONS_TAB = 'collections'

/**
 * Where "View history" on the dispatch board goes: the agent's EMPLOYEE page, opened on its
 * Collections tab (not a separate history screen on the dispatch page).
 */
export function agentHistoryHref(employeeId: string): string {
  return `/employees/${employeeId}?tab=${COLLECTIONS_TAB}`
}

/**
 * The tab to show for `?tab=…`. An unknown tab — or one this viewer can't see (not an agent, or
 * without Collection access) — falls back to Overview instead of a blank page.
 */
export function resolveEmployeeTab(requested: string | null, available: string[], fallback = 'overview'): string {
  return requested && available.includes(requested) ? requested : fallback
}
