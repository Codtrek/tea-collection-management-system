import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export interface AvatarProps {
  /** image source (data URL or remote); falls back to initials when absent */
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'size-8 text-sm',
  md: 'size-12 text-base',
  lg: 'size-16 text-xl',
} as const

/** User avatar: photo when `src` is set, otherwise the name's initials on brand-soft. */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const base = cn('shrink-0 overflow-hidden rounded-full', sizes[size], className)

  if (src) {
    return <img src={src} alt={name} className={cn(base, 'object-cover')} />
  }

  return (
    <span className={cn(base, 'flex items-center justify-center bg-brand-soft font-semibold text-primary')}>
      {initials(name)}
    </span>
  )
}
