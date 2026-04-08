import { Spinner } from '@/components/ui/Spinner'
import { forwardRef, type ComponentPropsWithRef } from 'react'

type ButtonVariant = 'primary' | 'outline'

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed',
  outline:
    'border border-border text-text-muted bg-surface-elevated disabled:opacity-60 disabled:cursor-not-allowed'
}

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  loading?: boolean
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    loading = false,
    loadingText,
    className = '',
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
})
