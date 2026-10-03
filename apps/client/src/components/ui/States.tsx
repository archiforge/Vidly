import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../lib/api-client';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-zinc-100">
        <Icon className="size-5 text-zinc-500" aria-hidden />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-red-50">
        <CircleAlert className="size-5 text-red-600" aria-hidden />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-900">Couldn’t load this data</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
