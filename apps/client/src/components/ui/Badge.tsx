import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'brand' | 'yellow';

const tones: Record<Tone, string> = {
  gray: 'bg-zinc-100 text-zinc-700 ring-zinc-500/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  yellow: 'bg-yellow-50 text-yellow-800 ring-yellow-600/30',
};

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
