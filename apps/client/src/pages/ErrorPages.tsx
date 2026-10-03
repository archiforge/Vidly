import { FileQuestion, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button, LinkButton } from '../components/ui/Button';

function ErrorLayout({
  icon: Icon,
  code,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <title>{`${title} · Vidly`}</title>
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-zinc-100">
          <Icon className="size-6 text-zinc-500" aria-hidden />
        </div>
        {code && <p className="mt-4 text-sm font-semibold text-brand-600">{code}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{description}</p>
        <div className="mt-6 flex justify-center gap-2">
          {children ?? <LinkButton to="/">Go to dashboard</LinkButton>}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorLayout
      icon={FileQuestion}
      code="404"
      title="Page not found"
      description="The page you’re looking for doesn’t exist or may have been moved."
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorLayout
      icon={ShieldCheck}
      code="403"
      title="Administrators only"
      description="You don’t have permission to view this page. Ask an administrator if you need access."
    />
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  // Most often a stale tab requesting code from a previous deployment.
  return (
    <ErrorLayout
      icon={TriangleAlert}
      title="Something went wrong"
      description="An unexpected error occurred. Reloading the page usually fixes it."
    >
      <Button onClick={() => window.location.reload()}>Reload page</Button>
    </ErrorLayout>
  );
}
