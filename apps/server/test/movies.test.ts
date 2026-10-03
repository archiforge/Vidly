import { describe, expect, it } from 'vitest';
import {
  api,
  createAdmin,
  createCustomer,
  createGenre,
  createMovie,
  createUser,
  Movie,
  Rental,
} from './helpers';

describe('GET /api/movies', () => {
  it('paginates, sorts, searches and filters', async () => {
    const drama = await createGenre('Drama');
    const genre = { _id: drama._id, name: drama.name };
    await Movie.create([
      { title: 'alpha', genre, numberInStock: 0, dailyRentalRate: 1 },
      { title: 'Bravo', genre, numberInStock: 2, dailyRentalRate: 3 },
      { title: 'Charlie', genre, numberInStock: 1, dailyRentalRate: 2 },
    ]);
    await createMovie({ title: 'Delta' });

    const page = await api.get('/api/movies?pageSize=2&page=2');
    expect(page.body).toMatchObject({ total: 4, page: 2, pageSize: 2, totalPages: 2 });
    expect(page.body.items.map((m: { title: string }) => m.title)).toEqual(['Charlie', 'Delta']);

    const byRate = await api.get('/api/movies?sort=dailyRentalRate&order=desc&pageSize=1');
    expect(byRate.body.items[0].title).toBe('Bravo');

    const search = await api.get('/api/movies?search=RAV');
    expect(search.body.items.map((m: { title: string }) => m.title)).toEqual(['Bravo']);

    const inGenre = await api.get(`/api/movies?genreId=${drama._id}&inStock=true`);
    expect(inGenre.body.items.map((m: { title: string }) => m.title)).toEqual(['Bravo', 'Charlie']);
  });

  it('treats regex characters in searches literally', async () => {
    await createMovie({ title: 'Mission: Impossible (1996)' });
    const res = await api.get(`/api/movies?search=${encodeURIComponent('(1996)')}`);
    expect(res.body.total).toBe(1);
    expect((await api.get('/api/movies?search=.*')).body.total).toBe(0);
  });

  it('rejects invalid query parameters', async () => {
    const res = await api.get('/api/movies?pageSize=500&sort=hacked');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/movies', () => {
  it('embeds the genre and rounds the rate to cents', async () => {
    const { auth } = await createUser();
    const genre = await createGenre('Action');

    const res = await api.post('/api/movies').set(auth).send({
      title: 'Heat',
      genreId: genre._id.toString(),
      numberInStock: 3,
      dailyRentalRate: 2.499,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Heat',
      genre: { _id: genre._id.toString(), name: 'Action' },
      numberInStock: 3,
      dailyRentalRate: 2.5,
    });
  });

  it('reports an unknown genre against the genreId field', async () => {
    const { auth } = await createUser();
    const res = await api.post('/api/movies').set(auth).send({
      title: 'Heat',
      genreId: '65f000000000000000000000',
      numberInStock: 1,
      dailyRentalRate: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([
      { path: 'genreId', message: 'The selected genre does not exist' },
    ]);
  });

  it('rejects duplicate titles regardless of case', async () => {
    const { auth } = await createUser();
    const movie = await createMovie({ title: 'Heat' });
    const res = await api.post('/api/movies').set(auth).send({
      title: 'HEAT',
      genreId: movie.genre._id.toString(),
      numberInStock: 1,
      dailyRentalRate: 1,
    });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/movies/:id', () => {
  it('updates the movie and the title in its rental history, keeping the agreed rate', async () => {
    const { auth } = await createUser();
    const movie = await createMovie({ title: 'Old Title', dailyRentalRate: 2 });
    const customer = await createCustomer();
    await api.post('/api/rentals').set(auth).send({ customerId: customer.id, movieId: movie.id });

    const res = await api.put(`/api/movies/${movie.id}`).set(auth).send({
      title: 'New Title',
      genreId: movie.genre._id.toString(),
      numberInStock: 10,
      dailyRentalRate: 4,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'New Title', numberInStock: 10, dailyRentalRate: 4 });

    const rental = await Rental.findOne({ 'movie._id': movie._id }).lean();
    expect(rental?.movie).toMatchObject({ title: 'New Title', dailyRentalRate: 2 });
  });

  it('returns 404 for a missing movie', async () => {
    const { auth } = await createUser();
    const genre = await createGenre();
    const res = await api.put('/api/movies/65f000000000000000000000').set(auth).send({
      title: 'Ghost',
      genreId: genre.id,
      numberInStock: 1,
      dailyRentalRate: 1,
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/movies/:id', () => {
  it('is admin-only and blocked while copies are rented out', async () => {
    const clerk = await createUser();
    const admin = await createAdmin();
    const movie = await createMovie();
    const customer = await createCustomer();
    const rental = await api
      .post('/api/rentals')
      .set(clerk.auth)
      .send({ customerId: customer.id, movieId: movie.id });

    expect((await api.delete(`/api/movies/${movie.id}`).set(clerk.auth)).status).toBe(403);
    expect((await api.delete(`/api/movies/${movie.id}`).set(admin.auth)).status).toBe(409);

    await api.post(`/api/rentals/${rental.body._id}/return`).set(clerk.auth);
    expect((await api.delete(`/api/movies/${movie.id}`).set(admin.auth)).status).toBe(204);
  });
});
