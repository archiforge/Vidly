import type { Paginated, Rental, RentalInput, RentalListQuery } from '@vidly/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { invalidate, queryKeys } from './keys';

export type RentalListParams = Partial<RentalListQuery>;

export function useRentals(params: RentalListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.rentals, 'list', params],
    queryFn: ({ signal }) => api.get<Paginated<Rental>>('/rentals', { query: params, signal }),
    placeholderData: keepPreviousData,
    ...options,
  });
}

// Renting or returning changes stock levels, customers' active counts and the dashboard.
const affected = ['rentals', 'movies', 'customers', 'stats'] as const;

export function useCreateRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RentalInput) => api.post<Rental>('/rentals', input),
    onSuccess: () => invalidate(queryClient, ...affected),
  });
}

export function useReturnRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Rental>(`/rentals/${id}/return`),
    onSuccess: () => invalidate(queryClient, ...affected),
  });
}

export function useDeleteRental() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/rentals/${id}`),
    onSuccess: () => invalidate(queryClient, ...affected),
  });
}
