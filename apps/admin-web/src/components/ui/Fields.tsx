import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

function Field({ label, error, hint, required, id, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps & { leading?: ReactNode }>(function Input(
  { label, error, hint, required, className, leading, ...rest },
  ref,
) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">{leading}</span>}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          className={cn(control, 'h-10', leading && 'pl-9', error && 'border-danger focus:border-danger focus:ring-danger/25', className)}
          {...rest}
        />
      </div>
    </Field>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select(
  { label, error, hint, required, className, children, ...rest },
  ref,
) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <select ref={ref} id={id} aria-invalid={!!error} className={cn(control, 'h-10 cursor-pointer', error && 'border-danger', className)} {...rest}>
        {children}
      </select>
    </Field>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, error, hint, required, className, ...rest },
  ref,
) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <textarea ref={ref} id={id} rows={3} className={cn(control, 'py-2', error && 'border-danger', className)} {...rest} />
    </Field>
  );
});
