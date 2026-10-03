import { genreInputSchema } from '@vidly/shared';
import { Router } from 'express';
import type { Types } from 'mongoose';
import { conflict, notFound } from '../lib/http-error';
import { SORT_COLLATION } from '../lib/pagination';
import { idParam } from '../lib/request';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Genre } from '../models/genre';
import { Movie } from '../models/movie';

export const genresRouter = Router();

genresRouter.get('/', async (_req, res) => {
  const [genres, counts] = await Promise.all([
    Genre.find().sort({ name: 1 }).collation(SORT_COLLATION).lean(),
    Movie.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: '$genre._id', count: { $sum: 1 } } },
    ]),
  ]);
  const countByGenre = new Map(counts.map(({ _id, count }) => [_id.toString(), count]));
  res.json(
    genres.map((genre) => ({ ...genre, movieCount: countByGenre.get(genre._id.toString()) ?? 0 })),
  );
});

genresRouter.get('/:id', async (req, res) => {
  const genre = await Genre.findById(idParam(req, 'Genre')).lean();
  if (!genre) throw notFound('Genre');
  res.json(genre);
});

genresRouter.post('/', requireAuth, async (req, res) => {
  const input = genreInputSchema.parse(req.body);
  const genre = await Genre.create(input);
  res.status(201).json(genre);
});

genresRouter.put('/:id', requireAuth, async (req, res) => {
  const id = idParam(req, 'Genre');
  const { name } = genreInputSchema.parse(req.body);

  const genre = await Genre.findByIdAndUpdate(
    id,
    { name },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!genre) throw notFound('Genre');

  await Movie.updateMany({ 'genre._id': genre._id }, { $set: { 'genre.name': genre.name } });
  res.json(genre);
});

genresRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = idParam(req, 'Genre');
  const genre = await Genre.findById(id).lean();
  if (!genre) throw notFound('Genre');

  const movieCount = await Movie.countDocuments({ 'genre._id': genre._id });
  if (movieCount > 0) {
    throw conflict(
      `"${genre.name}" is used by ${movieCount} movie${movieCount === 1 ? '' : 's'}. ` +
        'Move or delete them before deleting the genre.',
    );
  }

  await Genre.deleteOne({ _id: genre._id });
  res.status(204).end();
});
