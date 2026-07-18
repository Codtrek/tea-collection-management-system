import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

/*
  Administration is Factory Administrator-only throughout (admin doc). Nav
  items are already hidden by permission; this guards direct URL access.
  Checks the data-driven matrix — never a hardcoded role.
*/
export function AdminGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { can } = useAuth()

  if (!can('administration')) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
          <ShieldOff className="size-6" strokeWidth={1.5} />
        </span>
        <h2 className="text-base font-semibold text-text-heading">Administrator access required</h2>
        <p className="mt-1 max-w-sm text-[13px] text-text-muted">
          Your role doesn't have access to Administration. Contact your Factory Administrator if you need a permission
          change.
        </p>
        <Button size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
