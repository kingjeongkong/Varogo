import { Spinner } from '@/components/ui/Spinner';
import { forwardRef, type ComponentPropsWithRef } from 'react';

type ButtonVariant = 'primary' | 'outline';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'text-white bg-primary hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100',
  outline:
    'border border-border text-text-secondary bg-surface-elevated hover:border-border-hover hover:bg-surface-hover hover:text-text-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated disabled:hover:border-border disabled:hover:text-text-muted disabled:active:scale-100',
};

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      loading = false,
      loadingText,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-all duration-200 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {loading && <Spinner />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  },
);
