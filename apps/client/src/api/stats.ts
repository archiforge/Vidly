import type { DashboardStats } from '@vidly/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { queryKeys } from './keys';

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => api.get<DashboardStats>('/stats', { signal }),
  });
}
