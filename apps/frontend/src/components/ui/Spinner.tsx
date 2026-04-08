import { type ComponentPropsWithoutRef } from 'react';

type SpinnerSize = 'sm' | 'md';

const sizeMap: Record<SpinnerSize, { className: string; strokeWidth: string }> =
  {
    sm: { className: 'h-4 w-4', strokeWidth: '4' },
    md: { className: 'h-6 w-6', strokeWidth: '3' },
  };

interface SpinnerProps extends ComponentPropsWithoutRef<'svg'> {
  size?: SpinnerSize;
}

export function Spinner({
  size = 'sm',
  className = '',
  ...props
}: SpinnerProps) {
  const { className: sizeClass, strokeWidth } = sizeMap[size];

  return (
    <svg
      className={`animate-spin ${sizeClass} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
