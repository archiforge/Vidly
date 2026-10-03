import {
  movieInputSchema,
  movieListQuerySchema,
  roundCurrency,
  type MovieInput,
} from '@vidly/shared';
import { Router } from 'express';
import { conflict, invalidField, notFound } from '../lib/http-error';
import { skipFor, SORT_COLLATION, toPage } from '../lib/pagination';
import { containsPattern, idParam } from '../lib/request';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Genre } from '../models/genre';
import { Movie } from '../models/movie';
import { Rental } from '../models/rental';

export const moviesRouter = Router();

const SORT_FIELDS = {
  title: 'title',
  genre: 'genre.name',
  numberInStock: 'numberInStock',
  dailyRentalRate: 'dailyRentalRate',
  createdAt: 'createdAt',
} as const;

/** Turns validated input into the stored shape, embedding the referenced genre. */
async function toMovieFields(input: MovieInput) {
  const genre = await Genre.findById(input.genreId).lean();
  if (!genre) throw invalidField('genreId', 'The selected genre does not exist');
  return {
    title: input.title,
    genre: { _id: genre._id, name: genre.name },
    numberInStock: input.numberInStock,
    dailyRentalRate: roundCurrency(input.dailyRentalRate),
  };
}

moviesRouter.get('/', async (req, res) => {
  const query = movieListQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.search) filter.title = containsPattern(query.search);
  if (query.genreId) filter['genre._id'] = query.genreId;
  if (query.inStock !== undefined) filter.numberInStock = query.inStock ? { $gt: 0 } : 0;

  const direction = query.order === 'asc' ? 1 : -1;
  const [items, total] = await Promise.all([
    Movie.find(filter)
      .sort({ [SORT_FIELDS[query.sort]]: direction, _id: 1 })
      .collation(SORT_COLLATION)
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .lean(),
    Movie.countDocuments(filter),
  ]);
  res.json(toPage(items, total, query.page, query.pageSize));
});

moviesRouter.get('/:id', async (req, res) => {
  const movie = await Movie.findById(idParam(req, 'Movie')).lean();
  if (!movie) throw notFound('Movie');
  res.json(movie);
});

moviesRouter.post('/', requireAuth, async (req, res) => {
  const fields = await toMovieFields(movieInputSchema.parse(req.body));
  const movie = await Movie.create(fields);
  res.status(201).json(movie);
});

moviesRouter.put('/:id', requireAuth, async (req, res) => {
  const id = idParam(req, 'Movie');
  const fields = await toMovieFields(movieInputSchema.parse(req.body));

  const movie = await Movie.findByIdAndUpdate(id, fields, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!movie) throw notFound('Movie');

  // Keep rental history readable; the agreed daily rate on existing rentals is left untouched.
  await Rental.updateMany({ 'movie._id': movie._id }, { $set: { 'movie.title': movie.title } });
  res.json(movie);
});

moviesRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = idParam(req, 'Movie');
  if (await Rental.exists({ 'movie._id': id, status: 'active' })) {
    throw conflict('This movie has copies out on rental. Process the returns before deleting it.');
  }
  const movie = await Movie.findByIdAndDelete(id).lean();
  if (!movie) throw notFound('Movie');
  res.status(204).end();
});
