import { forwardRef, type ComponentPropsWithRef, type ReactNode } from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends ComponentPropsWithRef<'input'> {
  label: ReactNode;
  as?: 'input' | 'textarea';
  error?: FieldError;
  rows?: number;
}

const baseInputStyles =
  'w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors';

export const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FormFieldProps
>(function FormField(
  { label, as = 'input', error, id, className = '', rows, ...props },
  ref,
) {
  const errorId = id ? `${id}-error` : undefined;
  const inputClassName = `${baseInputStyles} ${error ? 'border-error/50' : 'border-border'} ${as === 'textarea' ? 'resize-none' : ''} ${className}`;

  const sharedProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error && errorId ? errorId : undefined,
    className: inputClassName,
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-base font-medium text-text-secondary mb-1.5"
      >
        {label}
      </label>
      {as === 'textarea' ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          rows={rows}
          {...sharedProps}
          {...(props as React.ComponentPropsWithoutRef<'textarea'>)}
        />
      ) : (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          {...sharedProps}
          {...props}
        />
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-error">
          {error.message}
        </p>
      )}
    </div>
  );
});
