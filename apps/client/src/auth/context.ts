import type { AuthResponse, User } from '@vidly/shared';
import { createContext, useContext } from 'react';

export type AuthStatus = 'loading' | 'ready' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (session: AuthResponse) => void;
  signOut: () => void;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** For components that only render inside authenticated routes. */
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser requires a signed-in user');
  return user;
}
