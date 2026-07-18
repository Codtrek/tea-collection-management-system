import { cn } from '@/lib/cn'

/** Skeleton block — dimensions must match the real content so layout doesn't jump. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />
}
