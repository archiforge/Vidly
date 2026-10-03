import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Table({ className, children, ...props }: ComponentProps<'table'>) {
  return (
    <div className="relative overflow-x-auto">
      <table className={cn('min-w-full text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-zinc-200 bg-zinc-50/60 text-xs font-medium tracking-wide text-zinc-500 uppercase">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-100">{children}</tbody>;
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn('px-4 py-2.5 font-medium whitespace-nowrap', className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle text-zinc-700', className)} {...props} />;
}

export type SortOrder = 'asc' | 'desc';

interface SortableThProps<F extends string> {
  field: F;
  label: string;
  sort: F;
  order: SortOrder;
  onSort: (field: F, order: SortOrder) => void;
  className?: string;
}

export function SortableTh<F extends string>({
  field,
  label,
  sort,
  order,
  onSort,
  className,
}: SortableThProps<F>) {
  const active = sort === field;
  const Icon = !active ? ChevronsUpDown : order === 'asc' ? ChevronUp : ChevronDown;
  return (
    <Th
      className={className}
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={cn(
          'group inline-flex items-center gap-1 uppercase hover:text-zinc-900',
          active && 'text-zinc-900',
        )}
        onClick={() => onSort(field, active && order === 'asc' ? 'desc' : 'asc')}
      >
        {label}
        <Icon
          className={cn('size-3.5', !active && 'opacity-40 group-hover:opacity-100')}
          aria-hidden
        />
      </button>
    </Th>
  );
}

/** Placeholder rows shown while a table loads for the first time. */
export function SkeletonRows({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-4 py-3.5">
              <div
                className="h-3.5 animate-pulse rounded bg-zinc-200/70"
                style={{ width: `${50 + ((row + column) % 4) * 12}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
