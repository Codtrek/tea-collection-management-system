import type { ReactNode } from 'react'
import { Breadcrumb, type Crumb } from './Breadcrumb'

interface PageHeaderProps {
  title: string
  breadcrumb?: Crumb[]
  description?: string
  /** primary action(s), rendered right-aligned (§17) */
  actions?: ReactNode
}

/*
  Standard page shell header: Breadcrumb → Title → Primary Action (master §17).
  The title block keeps at least 22rem and grows; the actions sit beside it while both fit and
  wrap onto their own line below it when they don't. Actions never shrink the title into a narrow
  column (Page-Layout-Addendum): a wide toolbar used to squeeze "Agent Dispatch" one word per line.
*/
export function PageHeader({ title, breadcrumb, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-[1_1_22rem]">
        {breadcrumb && <div className="mb-2">{<Breadcrumb items={breadcrumb} />}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-text-heading">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
