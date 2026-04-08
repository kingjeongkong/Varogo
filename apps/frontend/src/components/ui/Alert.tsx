import { type ComponentPropsWithoutRef } from 'react';

type AlertVariant = 'error';

const variantStyles: Record<AlertVariant, string> = {
  error: 'bg-error-dim border border-error/20 text-error',
};

interface AlertProps extends ComponentPropsWithoutRef<'div'> {
  variant?: AlertVariant;
}

export function Alert({
  variant = 'error',
  className = '',
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-lg px-4 py-3 text-sm ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
