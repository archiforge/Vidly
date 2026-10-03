import { describe, expect, it } from 'vitest';
import { api } from './helpers';

describe('platform endpoints', () => {
  it('reports health with the database connected', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected' });
  });

  it('exposes public client configuration', async () => {
    const res = await api.get('/api/config');
    expect(res.body).toEqual({ allowRegistration: true });
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await api.get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects malformed JSON bodies with a 400', async () => {
    const res = await api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Request body is not valid JSON');
  });

  it('sets security headers', async () => {
    const res = await api.get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
