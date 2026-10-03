import type { Customer, CustomerInput, CustomerListQuery, Paginated } from '@vidly/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { invalidate, queryKeys } from './keys';

export type CustomerListParams = Partial<CustomerListQuery>;

export function useCustomers(params: CustomerListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...queryKeys.customers, 'list', params],
    queryFn: ({ signal }) => api.get<Paginated<Customer>>('/customers', { query: params, signal }),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.customers, 'detail', id],
    queryFn: ({ signal }) => api.get<Customer>(`/customers/${id}`, { signal }),
    enabled: Boolean(id),
  });
}

export function useSaveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CustomerInput & { id?: string }) =>
      id ? api.put<Customer>(`/customers/${id}`, input) : api.post<Customer>('/customers', input),
    onSuccess: () => invalidate(queryClient, 'customers', 'rentals', 'stats'),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => invalidate(queryClient, 'customers', 'stats'),
  });
}
