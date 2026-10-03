import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, errorMessage } from './api-client';

/**
 * Shows server-side validation errors next to the matching form fields. Anything that
 * can't be attributed to a field is surfaced as a toast.
 */
export function handleFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  if (error instanceof ApiError && error.details.length > 0) {
    const unmatched = error.details.filter((detail) => {
      const field = fields.find((name) => name === detail.path);
      if (field)
        setError(field, { type: 'server', message: detail.message }, { shouldFocus: true });
      return !field;
    });
    if (unmatched.length === 0) return;
  }
  toast.error(errorMessage(error));
}
