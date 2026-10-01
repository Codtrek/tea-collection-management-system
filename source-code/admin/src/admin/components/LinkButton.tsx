import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { buttonClasses, type ButtonProps } from '@/components/ui/Button'

type LinkButtonProps = ComponentProps<typeof Link> & Pick<ButtonProps, 'variant' | 'size'>

/** A router Link that looks like our Button — keeps navigation semantic (<a>), not onClick. */
export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />
}
