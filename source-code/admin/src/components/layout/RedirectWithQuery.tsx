import { Navigate, useLocation } from 'react-router-dom'

/**
 * A redirect for a renamed page that keeps the query string, so a bookmarked or shared link still
 * opens the same view (a plain <Navigate to> drops it). E.g. /reports/revenue?month=2026-09 →
 * /reports/leaf-purchases?month=2026-09.
 */
export function RedirectWithQuery({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: to, search, hash }} replace />
}
