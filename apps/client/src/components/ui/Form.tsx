import { CircleAlert } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { controlClasses } from './styles';

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label, control, hint and error message wired together for assistive technology. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

type FieldChromeProps = Pick<FieldProps, 'label' | 'error' | 'hint' | 'className'>;

export function TextField({
  label,
  error,
  hint,
  className,
  ...inputProps
}: FieldChromeProps & Omit<ComponentProps<'input'>, 'className'>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={controlClasses(invalid)}
          {...inputProps}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...selectProps
}: FieldChromeProps & Omit<ComponentProps<'select'>, 'className'>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(controlClasses(invalid), 'pr-8')}
          {...selectProps}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({
  label,
  description,
  className,
  ...inputProps
}: { label: ReactNode; description?: ReactNode } & Omit<ComponentProps<'input'>, 'type'>) {
  const id = useId();
  return (
    <div className={cn('flex gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-zinc-300 text-brand-600 accent-brand-600"
        aria-describedby={description ? `${id}-description` : undefined}
        {...inputProps}
      />
      <div className="text-sm">
        <label htmlFor={id} className="font-medium text-zinc-800">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-zinc-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
