import { MS_PER_DAY } from '@vidly/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  api,
  createAdmin,
  createCustomer,
  createMovie,
  createUser,
  Rental,
  stockOf,
} from './helpers';

let auth: Record<string, string>;

beforeEach(async () => {
  ({ auth } = await createUser());
});

const checkout = (customerId: string, movieId: string) =>
  api.post('/api/rentals').set(auth).send({ customerId, movieId });

describe('POST /api/rentals (checkout)', () => {
  it('creates an active rental with snapshots and takes a copy off the shelf', async () => {
    const customer = await createCustomer({ name: 'Maya', isGold: true });
    const movie = await createMovie({ title: 'Arrival', numberInStock: 2, dailyRentalRate: 3 });

    const res = await checkout(customer.id, movie.id);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'active',
      customer: { _id: customer.id, name: 'Maya', isGold: true },
      movie: { _id: movie.id, title: 'Arrival', dailyRentalRate: 3 },
    });
    expect(new Date(res.body.dateOut).getTime()).toBeGreaterThan(Date.now() - 10_000);
    expect(await stockOf(movie._id)).toBe(1);
  });

  it('refuses a movie that is out of stock', async () => {
    const customer = await createCustomer();
    const movie = await createMovie({ numberInStock: 0 });
    const res = await checkout(customer.id, movie.id);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('This movie is out of stock');
    expect(await stockOf(movie._id)).toBe(0);
  });

  it('refuses a second active copy of the same movie for one customer', async () => {
    const customer = await createCustomer();
    const movie = await createMovie({ numberInStock: 5 });
    expect((await checkout(customer.id, movie.id)).status).toBe(201);
    expect((await checkout(customer.id, movie.id)).status).toBe(409);
    expect(await stockOf(movie._id)).toBe(4);
  });

  it('reports unknown customers and movies against the right field', async () => {
    const customer = await createCustomer();
    const movie = await createMovie();
    const missing = '65f000000000000000000000';

    const noCustomer = await checkout(missing, movie.id);
    expect(noCustomer.status).toBe(400);
    expect(noCustomer.body.error.details[0].path).toBe('customerId');

    const noMovie = await checkout(customer.id, missing);
    expect(noMovie.status).toBe(400);
    expect(noMovie.body.error.details[0].path).toBe('movieId');
  });

  it('never oversells the last copy under concurrent checkouts', async () => {
    const movie = await createMovie({ numberInStock: 1 });
    const customers = await Promise.all(Array.from({ length: 8 }, () => createCustomer()));

    const results = await Promise.all(customers.map((c) => checkout(c.id, movie.id)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);
    expect(await stockOf(movie._id)).toBe(0);
    expect(await Rental.countDocuments({ 'movie._id': movie._id })).toBe(1);
  });

  it('requires authentication', async () => {
    const res = await api.post('/api/rentals').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rentals/:id/return', () => {
  it('charges per started day (minimum one) and restocks the copy', async () => {
    const customer = await createCustomer();
    const movie = await createMovie({ numberInStock: 1, dailyRentalRate: 2.5 });
    const { body: rental } = await checkout(customer.id, movie.id);

    // Pretend the movie went out 3 days and 1 hour ago => 4 billable days.
    await Rental.updateOne(
      { _id: rental._id },
      { dateOut: new Date(Date.now() - 3 * MS_PER_DAY - 60 * 60 * 1000) },
    );

    const res = await api.post(`/api/rentals/${rental._id}/return`).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'returned', rentalFee: 10 });
    expect(res.body.dateReturned).toEqual(expect.any(String));
    expect(await stockOf(movie._id)).toBe(1);
  });

  it('bills a same-day return as one day', async () => {
    const customer = await createCustomer();
    const movie = await createMovie({ dailyRentalRate: 1.75 });
    const { body: rental } = await checkout(customer.id, movie.id);
    const res = await api.post(`/api/rentals/${rental._id}/return`).set(auth);
    expect(res.body.rentalFee).toBe(1.75);
  });

  it('processes a return exactly once, even when submitted concurrently', async () => {
    const customer = await createCustomer();
    const movie = await createMovie({ numberInStock: 1 });
    const { body: rental } = await checkout(customer.id, movie.id);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => api.post(`/api/rentals/${rental._id}/return`).set(auth)),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await stockOf(movie._id)).toBe(1);
  });

  it('allows renting the same movie again after it was returned', async () => {
    const customer = await createCustomer();
    const movie = await createMovie();
    const { body: first } = await checkout(customer.id, movie.id);
    await api.post(`/api/rentals/${first._id}/return`).set(auth);
    expect((await checkout(customer.id, movie.id)).status).toBe(201);
  });

  it('returns 404 for an unknown rental', async () => {
    const res = await api.post('/api/rentals/65f000000000000000000000/return').set(auth);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/rentals', () => {
  it('filters by status and searches customer and movie names', async () => {
    const maya = await createCustomer({ name: 'Maya' });
    const noah = await createCustomer({ name: 'Noah' });
    const arrival = await createMovie({ title: 'Arrival' });
    const heat = await createMovie({ title: 'Heat' });

    const { body: returned } = await checkout(maya.id, arrival.id);
    await api.post(`/api/rentals/${returned._id}/return`).set(auth);
    await checkout(noah.id, heat.id);

    const active = await api.get('/api/rentals?status=active').set(auth);
    expect(active.body.items.map((r: { movie: { title: string } }) => r.movie.title)).toEqual([
      'Heat',
    ]);

    const done = await api.get('/api/rentals?status=returned').set(auth);
    expect(done.body.items.map((r: { customer: { name: string } }) => r.customer.name)).toEqual([
      'Maya',
    ]);

    expect((await api.get('/api/rentals?search=arr').set(auth)).body.total).toBe(1);
    expect((await api.get(`/api/rentals?customerId=${noah.id}`).set(auth)).body.total).toBe(1);
    expect((await api.get('/api/rentals').set(auth)).body.total).toBe(2);
  });
});

describe('DELETE /api/rentals/:id', () => {
  it('is admin-only and restocks an active rental', async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const movie = await createMovie({ numberInStock: 1 });
    const { body: rental } = await checkout(customer.id, movie.id);

    expect((await api.delete(`/api/rentals/${rental._id}`).set(auth)).status).toBe(403);
    expect((await api.delete(`/api/rentals/${rental._id}`).set(admin.auth)).status).toBe(204);
    expect(await stockOf(movie._id)).toBe(1);
  });
});
