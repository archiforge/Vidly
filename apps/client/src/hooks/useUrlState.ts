import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

type ParamValue = string | number | boolean | undefined | null;

/**
 * List filters, sorting and paging live in the URL so views are shareable and survive
 * reloads and the back button. Changing anything other than the page resets to page 1.
 */
export function useUrlState() {
  const [params, setParams] = useSearchParams();

  const getString = useCallback(
    (key: string, fallback = '') => params.get(key) ?? fallback,
    [params],
  );

  const getPage = useCallback(() => {
    const page = Number(params.get('page'));
    return Number.isInteger(page) && page > 0 ? page : 1;
  }, [params]);

  const getOneOf = useCallback(
    <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
      const value = params.get(key);
      return allowed.includes(value as T) ? (value as T) : fallback;
    },
    [params],
  );

  const update = useCallback(
    (changes: Record<string, ParamValue>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === null || value === '' || value === false)
              next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in changes) || changes.page === 1) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { getString, getPage, getOneOf, update };
}
