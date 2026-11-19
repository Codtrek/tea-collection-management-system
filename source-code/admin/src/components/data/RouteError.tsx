import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ErrorState } from './ErrorState'

/**
 * A route's `errorElement`: a friendly message with Retry instead of React Router's developer
 * screen. The app shell (sidebar, top bar) stays, so the rest of the portal is one click away.
 * The technical detail is shown in development only.
 */
export function RouteError({ title = "This page couldn't be shown" }: { title?: string }) {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : null
  return (
    <div className="flex flex-col gap-3 py-8">
      <ErrorState
        title={title}
        description="Something went wrong while showing it. Retry, or open another page from the menu."
        onRetry={() => window.location.reload()}
      />
      {import.meta.env.DEV && detail && <p className="id text-center text-xs text-text-muted">{detail}</p>}
    </div>
  )
}
