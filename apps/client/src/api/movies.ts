import type { Movie, MovieInput, MovieListQuery, Paginated } from '@vidly/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { invalidate, queryKeys } from './keys';

export type MovieListParams = Partial<MovieListQuery>;

export function useMovies(params: MovieListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.movies, 'list', params],
    queryFn: ({ signal }) => api.get<Paginated<Movie>>('/movies', { query: params, signal }),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useMovie(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.movies, 'detail', id],
    queryFn: ({ signal }) => api.get<Movie>(`/movies/${id}`, { signal }),
    enabled: Boolean(id),
  });
}

export function useSaveMovie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: MovieInput & { id?: string }) =>
      id ? api.put<Movie>(`/movies/${id}`, input) : api.post<Movie>('/movies', input),
    onSuccess: () => invalidate(queryClient, 'movies', 'genres', 'rentals', 'stats'),
  });
}

export function useDeleteMovie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/movies/${id}`),
    onSuccess: () => invalidate(queryClient, 'movies', 'genres', 'stats'),
  });
}
