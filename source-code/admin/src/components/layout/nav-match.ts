/**
 * The ONE sidebar item to light for a path: the most specific `to` that the path is, or sits
 * under. `/estates/advances/new` lights "Estate Owner Advances", not "Estate Owners"; an
 * `/employees/EMP-0042` record page still lights "Employees". Null when nothing matches.
 */
export function activeNavTo(pathname: string, tos: string[]): string | null {
  let best: string | null = null
  for (const to of tos) {
    const under = pathname === to || pathname.startsWith(`${to}/`)
    if (under && (best === null || to.length > best.length)) best = to
  }
  return best
}
