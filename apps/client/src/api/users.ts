import type { Paginated, User, UserListQuery, UserUpdateInput } from '@vidly/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { invalidate, queryKeys } from './keys';

export function useUsers(params: Partial<UserListQuery>) {
  return useQuery({
    queryKey: [...queryKeys.users, 'list', params],
    queryFn: ({ signal }) => api.get<Paginated<User>>('/users', { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UserUpdateInput & { id: string }) =>
      api.patch<User>(`/users/${id}`, input),
    onSuccess: () => invalidate(queryClient, 'users'),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => invalidate(queryClient, 'users'),
  });
}
