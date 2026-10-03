import { afterEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env';
import { api, createUser, User } from './helpers';

const registration = { name: 'Grace Hopper', email: 'Grace@Example.com', password: 'cobol-1959' };

describe('POST /api/auth/register', () => {
  afterEach(() => {
    env.ALLOW_REGISTRATION = true;
  });

  it('creates a non-admin user and returns a token without the password', async () => {
    const res = await api.post('/api/auth/register').send(registration);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      isAdmin: false,
    });
    expect(res.body.user.password).toBeUndefined();

    const stored = await User.findOne({ email: 'grace@example.com' }).select('+password').lean();
    expect(stored?.password).not.toBe(registration.password);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await api.post('/api/auth/register').send(registration);
    const res = await api
      .post('/api/auth/register')
      .send({ ...registration, email: 'GRACE@example.com' });
    expect(res.status).toBe(409);
  });

  it('validates the payload', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'G', email: 'nope', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'email',
      'name',
      'password',
    ]);
  });

  it('can be disabled', async () => {
    env.ALLOW_REGISTRATION = false;
    const res = await api.post('/api/auth/register').send(registration);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials (email is case-insensitive)', async () => {
    const { user, password } = await createUser({ email: 'login@test.dev' });
    const res = await api.post('/api/auth/login').send({ email: ' LOGIN@test.dev', password });
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(user._id.toString());

    const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const { password } = await createUser({ email: 'known@test.dev' });
    const wrongPassword = await api
      .post('/api/auth/login')
      .send({ email: 'known@test.dev', password: `${password}x` });
    const unknown = await api.post('/api/auth/login').send({ email: 'unknown@test.dev', password });

    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknown.body);
  });
});

describe('GET /api/auth/me', () => {
  it('requires a token', async () => {
    const res = await api.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects tampered tokens', async () => {
    const { token } = await createUser();
    const res = await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token.slice(0, -2)}xx`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects tokens of users that no longer exist', async () => {
    const { user, auth } = await createUser();
    await User.deleteOne({ _id: user._id });
    const res = await api.get('/api/auth/me').set(auth);
    expect(res.status).toBe(401);
  });
});

describe('profile management', () => {
  it('updates the name and returns a refreshed token', async () => {
    const { auth } = await createUser();
    const res = await api.patch('/api/auth/me').set(auth).send({ name: 'Renamed Person' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Renamed Person');
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('changes the password only when the current one is correct', async () => {
    const { auth, password, user } = await createUser();

    const wrong = await api
      .post('/api/auth/me/password')
      .set(auth)
      .send({ currentPassword: 'not-it', newPassword: 'brand-new-pass' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details[0].path).toBe('currentPassword');

    const ok = await api
      .post('/api/auth/me/password')
      .set(auth)
      .send({ currentPassword: password, newPassword: 'brand-new-pass' });
    expect(ok.status).toBe(204);

    const login = await api
      .post('/api/auth/login')
      .send({ email: user.email, password: 'brand-new-pass' });
    expect(login.status).toBe(200);
  });
});
