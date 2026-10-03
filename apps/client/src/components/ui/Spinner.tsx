import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle className={cn('size-5 animate-spin text-zinc-400', className)} aria-hidden />
  );
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
        <Spinner className="size-6" />
        {label}
      </div>
    </div>
  );
}
