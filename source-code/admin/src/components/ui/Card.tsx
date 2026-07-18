import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Resting card: shadow-1, radius-lg, surface. Card uses shadow OR border, never both (foundations §3). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-lg)] bg-surface p-6 shadow-[var(--shadow-1)]', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-center justify-between gap-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-text-heading', className)} {...props} />
}
