import { describe, expect, it } from 'vitest';
import {
  api,
  createAdmin,
  createCustomer,
  createMovie,
  createUser,
  Customer,
  Rental,
} from './helpers';

describe('customers', () => {
  it('requires authentication for every route', async () => {
    const customer = await createCustomer();
    expect((await api.get('/api/customers')).status).toBe(401);
    expect((await api.get(`/api/customers/${customer.id}`)).status).toBe(401);
  });

  it('lists with search, gold filter and active rental counts', async () => {
    const { auth } = await createUser();
    const maya = await createCustomer({ name: 'Maya Patel', isGold: true });
    await createCustomer({ name: 'Noah Kim' });
    const movie = await createMovie();
    await api.post('/api/rentals').set(auth).send({ customerId: maya.id, movieId: movie.id });

    const all = await api.get('/api/customers').set(auth);
    expect(
      all.body.items.map((c: { name: string; activeRentals: number }) => [c.name, c.activeRentals]),
    ).toEqual([
      ['Maya Patel', 1],
      ['Noah Kim', 0],
    ]);

    const search = await api.get('/api/customers?search=noah').set(auth);
    expect(search.body.total).toBe(1);

    const gold = await api.get('/api/customers?gold=true').set(auth);
    expect(gold.body.items.map((c: { name: string }) => c.name)).toEqual(['Maya Patel']);
  });

  it('creates a customer, ignoring an empty email', async () => {
    const { auth } = await createUser();
    const res = await api
      .post('/api/customers')
      .set(auth)
      .send({ name: 'Ada', phone: '+44 20 7946 0000', email: '', isGold: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ada', phone: '+44 20 7946 0000', isGold: true });
    expect(res.body.email).toBeUndefined();
  });

  it('rejects duplicate phone numbers', async () => {
    const { auth } = await createUser();
    await createCustomer({ phone: '555-1234' });
    const res = await api
      .post('/api/customers')
      .set(auth)
      .send({ name: 'Dupe', phone: '555-1234' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/phone number already exists/);
  });

  it('updates a customer, clearing the email and syncing rental snapshots', async () => {
    const { auth } = await createUser();
    const customer = await Customer.create({
      name: 'Old',
      phone: '555-0000',
      email: 'old@example.com',
    });
    const movie = await createMovie();
    await api.post('/api/rentals').set(auth).send({ customerId: customer.id, movieId: movie.id });

    const res = await api
      .put(`/api/customers/${customer.id}`)
      .set(auth)
      .send({ name: 'New Name', phone: '555-9999', email: '', isGold: true });
    expect(res.status).toBe(200);
    expect(res.body.email).toBeUndefined();

    const rental = await Rental.findOne({ 'customer._id': customer._id }).lean();
    expect(rental?.customer).toMatchObject({ name: 'New Name', phone: '555-9999', isGold: true });
  });

  it('only lets admins delete, and not while rentals are active', async () => {
    const clerk = await createUser();
    const admin = await createAdmin();
    const customer = await createCustomer();
    const movie = await createMovie();
    const rental = await api
      .post('/api/rentals')
      .set(clerk.auth)
      .send({ customerId: customer.id, movieId: movie.id });

    expect((await api.delete(`/api/customers/${customer.id}`).set(clerk.auth)).status).toBe(403);
    expect((await api.delete(`/api/customers/${customer.id}`).set(admin.auth)).status).toBe(409);

    await api.post(`/api/rentals/${rental.body._id}/return`).set(clerk.auth);
    expect((await api.delete(`/api/customers/${customer.id}`).set(admin.auth)).status).toBe(204);
  });
});
