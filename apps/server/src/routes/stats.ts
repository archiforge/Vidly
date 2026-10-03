import { LOW_STOCK_THRESHOLD, MS_PER_DAY, roundCurrency, type DashboardStats } from '@vidly/shared';
import { Router } from 'express';
import type { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth';
import { Customer } from '../models/customer';
import { Genre } from '../models/genre';
import { Movie } from '../models/movie';
import { Rental } from '../models/rental';

export const statsRouter = Router();

statsRouter.use(requireAuth);

interface InventoryTotals {
  totalCopies: number;
  outOfStock: number;
  lowStock: number;
}

const sumRevenue = (match: Record<string, unknown>) =>
  Rental.aggregate<{ total: number }>([
    { $match: { status: 'returned', ...match } },
    { $group: { _id: null, total: { $sum: '$rentalFee' } } },
  ]).then(([result]) => roundCurrency(result?.total ?? 0));

statsRouter.get('/', async (_req, res) => {
  const since = new Date(Date.now() - 30 * MS_PER_DAY);

  const [
    movies,
    genres,
    customers,
    goldCustomers,
    [inventory],
    active,
    returned,
    last30Days,
    revenue,
    revenueLast30Days,
    topMovies,
    recentRentals,
  ] = await Promise.all([
    Movie.countDocuments(),
    Genre.countDocuments(),
    Customer.countDocuments(),
    Customer.countDocuments({ isGold: true }),
    Movie.aggregate<InventoryTotals>([
      {
        $group: {
          _id: null,
          totalCopies: { $sum: '$numberInStock' },
          outOfStock: { $sum: { $cond: [{ $eq: ['$numberInStock', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$numberInStock', 0] },
                    { $lte: ['$numberInStock', LOW_STOCK_THRESHOLD] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Rental.countDocuments({ status: 'active' }),
    Rental.countDocuments({ status: 'returned' }),
    Rental.countDocuments({ dateOut: { $gte: since } }),
    sumRevenue({}),
    sumRevenue({ dateReturned: { $gte: since } }),
    Rental.aggregate<{ _id: Types.ObjectId; title: string; rentals: number }>([
      { $sort: { dateOut: 1 } },
      { $group: { _id: '$movie._id', title: { $last: '$movie.title' }, rentals: { $sum: 1 } } },
      { $sort: { rentals: -1, title: 1 } },
      { $limit: 5 },
    ]),
    Rental.find().sort({ dateOut: -1 }).limit(6).lean(),
  ]);

  const stats = {
    counts: { movies, genres, customers, goldCustomers },
    inventory: {
      totalCopies: inventory?.totalCopies ?? 0,
      outOfStock: inventory?.outOfStock ?? 0,
      lowStock: inventory?.lowStock ?? 0,
    },
    rentals: { active, returned, last30Days, revenue, revenueLast30Days },
    topMovies,
    recentRentals,
  } satisfies Record<keyof DashboardStats, unknown>;

  res.json(stats);
});
