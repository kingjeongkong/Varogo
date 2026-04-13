import { forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  label: string;
  options: RadioOption[];
  error?: FieldError;
  id: string;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  value?: string;
}

export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  function RadioGroup({ label, options, error, id, name, onChange, onBlur, value }, ref) {
    const errorId = `${id}-error`;
    const labelId = `${id}-label`;

    return (
      <div>
        <p
          id={labelId}
          className="block text-base font-medium text-text-secondary mb-1.5"
        >
          {label}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="flex flex-wrap gap-2"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary/50 ${
                value === option.value
                  ? 'border-primary/50 bg-primary/10 text-text-primary'
                  : 'border-border bg-surface-elevated text-text-secondary hover:border-border-hover'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={onChange}
                onBlur={onBlur}
                ref={option.value === options[0]?.value ? ref : undefined}
                className="sr-only"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs text-error">
            {error.message}
          </p>
        )}
      </div>
    );
  },
);
