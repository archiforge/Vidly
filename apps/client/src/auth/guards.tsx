import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { ForbiddenPage } from '../pages/ErrorPages';
import { useAuth } from './context';

export interface RedirectState {
  from?: string;
}

function SessionGate({ children }: { children: React.ReactNode }) {
  const { status, retry } = useAuth();
  if (status === 'loading') return <PageSpinner label="Restoring your session…" />;
  if (status === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">Can’t reach the Vidly server</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Check that the API is running, then try again.
          </p>
          <Button className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  return children;
}

/** Layout route: only renders its children for signed-in users. */
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <SessionGate>
      {user ? (
        <Outlet />
      ) : (
        <Navigate
          to="/login"
          replace
          state={{ from: location.pathname + location.search } satisfies RedirectState}
        />
      )}
    </SessionGate>
  );
}

export function RequireAdmin() {
  const { user } = useAuth();
  return user?.isAdmin ? <Outlet /> : <ForbiddenPage />;
}

/** Layout route for the sign-in / sign-up screens. */
export function GuestOnly() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as RedirectState | null)?.from;
  return <SessionGate>{user ? <Navigate to={from ?? '/'} replace /> : <Outlet />}</SessionGate>;
}
