import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { AuthProvider } from '../auth/AuthProvider';
import { createQueryClient } from '../lib/query-client';
import { vi } from 'vitest';

export function renderRoutes(routes: RouteObject[], initialPath: string) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router, queryClient };
}

type Handler = (url: URL, init: RequestInit) => { status?: number; body?: unknown } | undefined;

/** Stubs `fetch` with a router of (method path) -> response. Unmatched requests fail the test. */
export function mockApi(handlers: Record<string, Handler | { status?: number; body?: unknown }>) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init.method ?? 'GET';
    const key = `${method} ${url.pathname}`;
    calls.push({
      method,
      path: url.pathname + url.search,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const handler = handlers[key];
    if (!handler) throw new Error(`Unexpected request: ${key}`);
    const result = typeof handler === 'function' ? handler(url, init) : handler;
    const status = result?.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(result?.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

export const adminUser = {
  _id: '65f000000000000000000001',
  name: 'Ada Admin',
  email: 'admin@vidly.dev',
  isAdmin: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
