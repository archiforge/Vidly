import type {
  AuthResponse,
  ChangePasswordInput,
  LoginInput,
  ProfileUpdateInput,
  PublicConfig,
  RegisterInput,
  User,
} from '@vidly/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from './keys';

export const authApi = {
  login: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input),
  register: (input: RegisterInput) => api.post<AuthResponse>('/auth/register', input),
  me: () => api.get<User>('/auth/me'),
  updateProfile: (input: ProfileUpdateInput) => api.patch<AuthResponse>('/auth/me', input),
  changePassword: (input: ChangePasswordInput) => api.post<void>('/auth/me/password', input),
};

export function usePublicConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => api.get<PublicConfig>('/config'),
    staleTime: Infinity,
  });
}
