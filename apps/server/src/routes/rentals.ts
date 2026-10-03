import { calculateRentalFee, rentalInputSchema, rentalListQuerySchema } from '@vidly/shared';
import { Router } from 'express';
import { conflict, invalidField, notFound } from '../lib/http-error';
import { isDuplicateKeyError } from '../lib/mongo-errors';
import { skipFor, toPage } from '../lib/pagination';
import { containsPattern, idParam } from '../lib/request';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Customer } from '../models/customer';
import { Movie } from '../models/movie';
import { Rental } from '../models/rental';

export const rentalsRouter = Router();

rentalsRouter.use(requireAuth);

rentalsRouter.get('/', async (req, res) => {
  const query = rentalListQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.status !== 'all') filter.status = query.status;
  if (query.customerId) filter['customer._id'] = query.customerId;
  if (query.movieId) filter['movie._id'] = query.movieId;
  if (query.search) {
    const pattern = containsPattern(query.search);
    filter.$or = [
      { 'customer.name': pattern },
      { 'customer.phone': pattern },
      { 'movie.title': pattern },
    ];
  }

  const direction = query.order === 'asc' ? 1 : -1;
  const [items, total] = await Promise.all([
    Rental.find(filter)
      .sort({ [query.sort]: direction, _id: direction })
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .lean(),
    Rental.countDocuments(filter),
  ]);
  res.json(toPage(items, total, query.page, query.pageSize));
});

rentalsRouter.get('/:id', async (req, res) => {
  const rental = await Rental.findById(idParam(req, 'Rental')).lean();
  if (!rental) throw notFound('Rental');
  res.json(rental);
});

/** Check a movie out to a customer. */
rentalsRouter.post('/', async (req, res) => {
  const { customerId, movieId } = rentalInputSchema.parse(req.body);

  const customer = await Customer.findById(customerId).lean();
  if (!customer) throw invalidField('customerId', 'Customer not found');

  if (await Rental.exists({ 'customer._id': customerId, 'movie._id': movieId, status: 'active' })) {
    throw conflict(`${customer.name} already has this movie checked out`);
  }

  // Atomically claim one copy. The condition guarantees stock never goes negative,
  // even when several clerks rent the last copy at the same moment.
  const movie = await Movie.findOneAndUpdate(
    { _id: movieId, numberInStock: { $gt: 0 } },
    { $inc: { numberInStock: -1 } },
    { returnDocument: 'after' },
  ).lean();
  if (!movie) {
    if (await Movie.exists({ _id: movieId })) throw conflict('This movie is out of stock');
    throw invalidField('movieId', 'Movie not found');
  }

  try {
    const rental = await Rental.create({
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isGold: customer.isGold,
      },
      movie: { _id: movie._id, title: movie.title, dailyRentalRate: movie.dailyRentalRate },
    });
    res.status(201).json(rental);
  } catch (err) {
    // Give the claimed copy back before reporting the failure.
    await Movie.updateOne({ _id: movie._id }, { $inc: { numberInStock: 1 } });
    if (isDuplicateKeyError(err))
      throw conflict(`${customer.name} already has this movie checked out`);
    throw err;
  }
});

/** Check a rented movie back in, charging the rental fee and restocking the copy. */
rentalsRouter.post('/:id/return', async (req, res) => {
  const id = idParam(req, 'Rental');
  const rental = await Rental.findById(id).lean();
  if (!rental) throw notFound('Rental');
  if (rental.status === 'returned') throw conflict('This rental has already been returned');

  const dateReturned = new Date();
  const rentalFee = calculateRentalFee(rental.dateOut, dateReturned, rental.movie.dailyRentalRate);

  // Conditional on still being active, so a double submission can't restock twice.
  const returned = await Rental.findOneAndUpdate(
    { _id: rental._id, status: 'active' },
    { $set: { status: 'returned', dateReturned, rentalFee } },
    { returnDocument: 'after' },
  ).lean();
  if (!returned) throw conflict('This rental has already been returned');

  await Movie.updateOne({ _id: rental.movie._id }, { $inc: { numberInStock: 1 } });
  res.json(returned);
});

/** Remove a rental record (e.g. one created by mistake). Active rentals are restocked. */
rentalsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const rental = await Rental.findByIdAndDelete(idParam(req, 'Rental')).lean();
  if (!rental) throw notFound('Rental');
  if (rental.status === 'active') {
    await Movie.updateOne({ _id: rental.movie._id }, { $inc: { numberInStock: 1 } });
  }
  res.status(204).end();
});
