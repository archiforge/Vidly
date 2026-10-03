import type { Genre, GenreInput } from '@vidly/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { invalidate, queryKeys } from './keys';

export function useGenres() {
  return useQuery({
    queryKey: queryKeys.genres,
    queryFn: ({ signal }) => api.get<Genre[]>('/genres', { signal }),
  });
}

export function useSaveGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GenreInput & { id?: string }) =>
      id ? api.put<Genre>(`/genres/${id}`, input) : api.post<Genre>('/genres', input),
    onSuccess: () => invalidate(queryClient, 'genres', 'movies', 'stats'),
  });
}

export function useDeleteGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/genres/${id}`),
    onSuccess: () => invalidate(queryClient, 'genres', 'stats'),
  });
}
