import clsx from 'clsx'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'sm' | 'icon'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-danger',
}

const sizeClass: Record<ButtonSize, string> = {
  md: '',
  sm: 'btn-sm',
  icon: 'btn-icon',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(variantClass[variant], sizeClass[size], fullWidth && 'btn-full', className)}
      {...props}
    >
      {children}
    </button>
  )
})
