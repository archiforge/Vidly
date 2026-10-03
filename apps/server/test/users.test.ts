import { describe, expect, it } from 'vitest';
import { api, createAdmin, createUser } from './helpers';

describe('user administration', () => {
  it('is restricted to administrators', async () => {
    const clerk = await createUser();
    expect((await api.get('/api/users')).status).toBe(401);
    expect((await api.get('/api/users').set(clerk.auth)).status).toBe(403);
  });

  it('lists users without password hashes', async () => {
    const admin = await createAdmin();
    await createUser();
    const res = await api.get('/api/users').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    for (const user of res.body.items) expect(user).not.toHaveProperty('password');
  });

  it('promotes a user, whose access changes immediately', async () => {
    const admin = await createAdmin();
    const clerk = await createUser();

    const res = await api
      .patch(`/api/users/${clerk.user.id}`)
      .set(admin.auth)
      .send({ isAdmin: true });
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);

    // The clerk's existing token now grants admin access, since roles are read per request.
    expect((await api.get('/api/users').set(clerk.auth)).status).toBe(200);
  });

  it('prevents admins from demoting or deleting themselves', async () => {
    const admin = await createAdmin();
    const demote = await api
      .patch(`/api/users/${admin.user.id}`)
      .set(admin.auth)
      .send({ isAdmin: false });
    expect(demote.status).toBe(400);
    expect((await api.delete(`/api/users/${admin.user.id}`).set(admin.auth)).status).toBe(400);
  });

  it('deletes a user and revokes their session', async () => {
    const admin = await createAdmin();
    const clerk = await createUser();
    expect((await api.delete(`/api/users/${clerk.user.id}`).set(admin.auth)).status).toBe(204);
    expect((await api.get('/api/auth/me').set(clerk.auth)).status).toBe(401);
  });
});
