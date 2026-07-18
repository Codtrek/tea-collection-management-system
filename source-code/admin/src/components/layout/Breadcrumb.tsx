import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1">
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-text">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? 'text-text' : undefined}>{item.label}</span>
              )}
              {!last && <ChevronRight className="size-3.5" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
