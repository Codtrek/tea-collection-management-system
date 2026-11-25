import type { ReactNode } from 'react'
import { AccessGuard } from '@/components/layout/AccessGuard'

/*
  Administration is Factory Administrator-only throughout (admin doc). Nav items are already
  hidden by permission; this guards direct URL access. Checks the data-driven matrix — never a
  hardcoded role.
*/
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <AccessGuard
      module="administration"
      title="Administrator access required"
      description="Your role doesn't have access to Administration. Contact your Factory Administrator if you need a permission change."
    >
      {children}
    </AccessGuard>
  )
}
