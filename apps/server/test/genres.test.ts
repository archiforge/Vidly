import { describe, expect, it } from 'vitest';
import { api, createAdmin, createGenre, createMovie, createUser, Movie } from './helpers';

describe('genres', () => {
  it('lists genres publicly, sorted, with movie counts', async () => {
    await createGenre('drama');
    await createMovie({ genreName: 'Comedy' });

    const res = await api.get('/api/genres');
    expect(res.status).toBe(200);
    expect(
      res.body.map((g: { name: string; movieCount: number }) => [g.name, g.movieCount]),
    ).toEqual([
      ['Comedy', 1],
      ['drama', 0],
    ]);
  });

  it('requires authentication to create', async () => {
    const res = await api.post('/api/genres').send({ name: 'Horror' });
    expect(res.status).toBe(401);
  });

  it('creates a genre and rejects case-insensitive duplicates', async () => {
    const { auth } = await createUser();
    const created = await api.post('/api/genres').set(auth).send({ name: '  Horror ' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Horror');

    const duplicate = await api.post('/api/genres').set(auth).send({ name: 'HORROR' });
    expect(duplicate.status).toBe(409);
  });

  it('renames a genre and its copies embedded in movies', async () => {
    const { auth } = await createUser();
    const movie = await createMovie({ genreName: 'Sci Fi' });

    const res = await api
      .put(`/api/genres/${movie.genre._id}`)
      .set(auth)
      .send({ name: 'Science Fiction' });
    expect(res.status).toBe(200);

    const updated = await Movie.findById(movie._id).lean();
    expect(updated?.genre.name).toBe('Science Fiction');
  });

  it('only lets admins delete, and never a genre that is in use', async () => {
    const clerk = await createUser();
    const admin = await createAdmin();
    const unused = await createGenre('Unused');
    const movie = await createMovie();

    expect((await api.delete(`/api/genres/${unused._id}`).set(clerk.auth)).status).toBe(403);
    expect((await api.delete(`/api/genres/${movie.genre._id}`).set(admin.auth)).status).toBe(409);
    expect((await api.delete(`/api/genres/${unused._id}`).set(admin.auth)).status).toBe(204);
    expect((await api.get(`/api/genres/${unused._id}`)).status).toBe(404);
  });

  it('answers 404 for malformed ids', async () => {
    const res = await api.get('/api/genres/not-an-id');
    expect(res.status).toBe(404);
  });
});
