import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '../test/utils';
import { api, ApiError, onUnauthorized, toQueryString } from './api-client';
import { tokenStorage } from './token-storage';

afterEach(() => onUnauthorized(() => {}));

describe('toQueryString', () => {
  it('skips empty values and serialises the rest', () => {
    expect(toQueryString({ page: 2, search: '', inStock: false, genre: undefined, q: 'a b' })).toBe(
      '?page=2&inStock=false&q=a+b',
    );
    expect(toQueryString({})).toBe('');
  });
});

describe('api client', () => {
  it('sends the bearer token and JSON body', async () => {
    tokenStorage.set('abc.def.ghi');
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/genres', { name: 'Drama' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/genres');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer abc.def.ghi',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe('{"name":"Drama"}');
  });

  it('turns error responses into ApiError with field details', async () => {
    mockApi({
      'POST /api/movies': {
        status: 400,
        body: {
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: [{ path: 'title', message: 'Required' }],
          },
        },
      },
    });

    const error = await api.post('/movies', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ path: 'title', message: 'Required' }],
    });
  });

  it('reports an expired session only for authenticated requests', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    mockApi({
      'GET /api/auth/me': {
        status: 401,
        body: { error: { message: 'Expired', code: 'INVALID_TOKEN' } },
      },
    });

    await api.get('/auth/me').catch(() => {});
    expect(handler).not.toHaveBeenCalled();

    tokenStorage.set('stale-token');
    await api.get('/auth/me').catch(() => {});
    expect(handler).toHaveBeenCalledOnce();
  });

  it('reports network failures in plain language', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(api.get('/movies')).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
  });

  it('returns undefined for 204 responses', async () => {
    mockApi({ 'DELETE /api/genres/1': { status: 204 } });
    await expect(api.delete('/genres/1')).resolves.toBeUndefined();
  });
});
