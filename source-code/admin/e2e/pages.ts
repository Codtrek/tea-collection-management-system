/** The big list pages that share the PageHeader layout (Page-Layout-Addendum). */
export const PAGES = [
  { name: 'dispatch', path: '/collections/dispatch' },
  { name: 'fertilizer-inventory', path: '/fertilizer' },
  { name: 'fertilizer-requests', path: '/fertilizer/requests' },
  { name: 'performance', path: '/employees/performance' },
  { name: 'payroll', path: '/employees/payroll' },
  { name: 'attendance', path: '/employees/attendance' },
  { name: 'holidays', path: '/holidays' },
] as const

export const WIDTHS = [1920, 1440, 1366, 1280, 1024, 768] as const

/**
 * Browser zoom shrinks the CSS viewport and raises the device pixel ratio by the same factor —
 * emulated the same way here: 110% on a 1280px window is a 1164px CSS viewport at DPR 1.1.
 */
export function zoomed(width: number, zoom: number) {
  return { viewport: { width: Math.round(width / zoom), height: Math.round(800 / zoom) }, deviceScaleFactor: zoom }
}
