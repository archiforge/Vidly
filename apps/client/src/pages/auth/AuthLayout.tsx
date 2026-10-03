import { Clapperboard } from 'lucide-react';
import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-zinc-50 px-4 py-12">
      <title>{`${title} · Vidly`}</title>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
            <Clapperboard className="size-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-zinc-600">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 sm:p-8">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-zinc-600">{footer}</div>}
      </div>
    </div>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-600/10"
    >
      {children}
    </div>
  );
}
