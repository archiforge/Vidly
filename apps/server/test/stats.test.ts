import { describe, expect, it } from 'vitest';
import { api, createCustomer, createMovie, createUser } from './helpers';

describe('GET /api/stats', () => {
  it('requires authentication', async () => {
    expect((await api.get('/api/stats')).status).toBe(401);
  });

  it('summarises inventory, rentals and revenue', async () => {
    const { auth } = await createUser();
    const customer = await createCustomer({ isGold: true });
    await createCustomer();
    const popular = await createMovie({ title: 'Popular', numberInStock: 2, dailyRentalRate: 4 });
    await createMovie({ title: 'Empty', numberInStock: 0 });
    await createMovie({ title: 'Plenty', numberInStock: 10 });

    const { body: rental } = await api
      .post('/api/rentals')
      .set(auth)
      .send({ customerId: customer.id, movieId: popular.id });
    await api.post(`/api/rentals/${rental._id}/return`).set(auth);
    await api.post('/api/rentals').set(auth).send({ customerId: customer.id, movieId: popular.id });

    const res = await api.get('/api/stats').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ movies: 3, genres: 3, customers: 2, goldCustomers: 1 });
    expect(res.body.inventory).toEqual({ totalCopies: 11, outOfStock: 1, lowStock: 1 });
    expect(res.body.rentals).toEqual({
      active: 1,
      returned: 1,
      last30Days: 2,
      revenue: 4,
      revenueLast30Days: 4,
    });
    expect(res.body.topMovies).toEqual([{ _id: popular.id, title: 'Popular', rentals: 2 }]);
    expect(res.body.recentRentals).toHaveLength(2);
  });
});
