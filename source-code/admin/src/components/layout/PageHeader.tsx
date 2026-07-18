import type { ReactNode } from 'react'
import { Breadcrumb, type Crumb } from './Breadcrumb'

interface PageHeaderProps {
  title: string
  breadcrumb?: Crumb[]
  description?: string
  /** primary action(s), rendered right-aligned (§17) */
  actions?: ReactNode
}

/* Standard page shell header: Breadcrumb → Title → Primary Action (master §17). */
export function PageHeader({ title, breadcrumb, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2">{<Breadcrumb items={breadcrumb} />}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-text-heading">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
