import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { labelOf } from '@/features/admin/permission-catalog'
import type { ModuleKey, PermissionLevel } from '@/types'

/*
  Direct-URL guard for a portal page (Users-Roles-Addendum §4a). The sidebar already hides what a
  role can't open; this stops a typed or bookmarked URL. It mirrors the server, which refuses the
  page's API reads with 403 on the same keys: any one of `module` at `level` (default View) is
  enough. Data-driven from the permission matrix — never a hardcoded role.
*/
export function AccessGuard({
  module,
  level = 'view',
  title,
  description,
  children,
}: {
  module: ModuleKey | ModuleKey[]
  level?: PermissionLevel
  title?: string
  description?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const keys = Array.isArray(module) ? module : [module]

  if (keys.some((k) => can(k, level))) return <>{children}</>

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-16 text-center"
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
        <ShieldOff className="size-6" strokeWidth={1.5} />
      </span>
      <h2 className="text-base font-semibold text-text-heading">{title ?? 'You don’t have access to this page'}</h2>
      <p className="mt-1 max-w-sm text-[13px] text-text-muted">
        {description ??
          `Your role doesn't have access to ${keys.map(labelOf).join(' or ')}. Contact your Factory Administrator if you need a permission change.`}
      </p>
      <Button size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  )
}
