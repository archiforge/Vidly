import type { AuthResponse, User } from '@vidly/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { authApi } from '../api/auth';
import { ApiError, onUnauthorized } from '../lib/api-client';
import { tokenStorage } from '../lib/token-storage';
import { AuthContext, type AuthContextValue, type AuthStatus } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStorage.get() ? 'loading' : 'ready',
  );
  const [attempt, setAttempt] = useState(0);

  // Restore the session from a stored token, re-reading the user so roles are current.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          tokenStorage.clear();
          setStatus('ready');
        } else {
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const signIn = useCallback((session: AuthResponse) => {
    tokenStorage.set(session.token);
    setUser(session.user);
    setStatus('ready');
  }, []);

  const signOut = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      signOut();
      toast.error('Your session has expired. Please sign in again.', { id: 'session-expired' });
    });
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, retry }),
    [status, user, signIn, signOut, retry],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
