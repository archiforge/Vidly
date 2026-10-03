/**
 * Populates the database with demo data.
 *
 *   npm run seed            # only if the database is empty
 *   npm run seed -- --reset # wipe Vidly's collections first
 */
import { calculateRentalFee, MS_PER_DAY } from '@vidly/shared';
import { env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../db';
import { hashPassword } from '../lib/auth';
import { logger } from '../lib/logger';
import { Customer } from '../models/customer';
import { Genre } from '../models/genre';
import { Movie } from '../models/movie';
import { Rental } from '../models/rental';
import { User } from '../models/user';

export const DEMO_USERS = [
  { name: 'Ada Admin', email: 'admin@vidly.dev', password: 'Admin123!', isAdmin: true },
  { name: 'Charlie Clerk', email: 'clerk@vidly.dev', password: 'Clerk123!', isAdmin: false },
];

const CATALOGUE: Record<string, [title: string, stock: number, rate: number][]> = {
  Action: [
    ['Mad Max: Fury Road', 6, 3.5],
    ['Die Hard', 4, 2.5],
    ['John Wick', 5, 3],
    ['Gladiator', 3, 2.5],
  ],
  Comedy: [
    ['Groundhog Day', 4, 2],
    ['The Grand Budapest Hotel', 3, 3],
    ['Airplane!', 2, 1.5],
    ['Superbad', 0, 2],
  ],
  Drama: [
    ['The Shawshank Redemption', 5, 2.5],
    ['Parasite', 4, 3.5],
    ['Whiplash', 2, 3],
  ],
  'Science Fiction': [
    ['Blade Runner 2049', 3, 4],
    ['Arrival', 4, 3],
    ['The Matrix', 6, 2.5],
    ['Interstellar', 1, 3.5],
  ],
  Thriller: [
    ['Se7en', 3, 2.5],
    ['Gone Girl', 2, 3],
  ],
  Animation: [
    ['Spirited Away', 5, 3],
    ['Toy Story', 7, 2],
    ['Spider-Man: Into the Spider-Verse', 4, 3.5],
  ],
};

const CUSTOMERS = [
  { name: 'Maya Patel', phone: '555-0101', email: 'maya.patel@example.com', isGold: true },
  { name: 'Liam O’Connor', phone: '555-0102', email: 'liam.oconnor@example.com', isGold: false },
  { name: 'Sofia Rossi', phone: '555-0103', isGold: true },
  { name: 'Noah Kim', phone: '555-0104', email: 'noah.kim@example.com', isGold: false },
  { name: 'Amara Okafor', phone: '555-0105', email: 'amara.okafor@example.com', isGold: false },
  { name: 'Lucas Martin', phone: '555-0106', isGold: false },
  { name: 'Hana Suzuki', phone: '555-0107', email: 'hana.suzuki@example.com', isGold: true },
  { name: 'Diego Hernández', phone: '555-0108', isGold: false },
  { name: 'Freya Larsen', phone: '555-0109', email: 'freya.larsen@example.com', isGold: false },
  { name: 'Omar Haddad', phone: '555-0110', isGold: false },
  { name: 'Grace Chen', phone: '555-0111', email: 'grace.chen@example.com', isGold: true },
  { name: 'Ethan Brooks', phone: '555-0112', isGold: false },
];

/** [customer index, movie title, days ago checked out, days kept (undefined = still out)] */
const RENTALS: [number, string, number, number?][] = [
  // Currently out
  [0, 'Mad Max: Fury Road', 2],
  [1, 'Groundhog Day', 1],
  [2, 'Parasite', 5],
  [4, 'Spirited Away', 3],
  [6, 'Blade Runner 2049', 4],
  [8, 'Se7en', 6],
  [10, 'Spider-Man: Into the Spider-Verse', 2],
  [11, 'Arrival', 1],
  // History
  [0, 'Arrival', 20, 3],
  [3, 'Arrival', 44, 2],
  [5, 'Arrival', 71, 4],
  [9, 'Arrival', 9, 1],
  [2, 'The Matrix', 40, 2],
  [7, 'The Matrix', 26, 3],
  [11, 'The Matrix', 58, 1],
  [3, 'Toy Story', 12, 4],
  [8, 'Toy Story', 35, 2],
  [1, 'Spirited Away', 16, 3],
  [10, 'Spirited Away', 52, 2],
  [5, 'Die Hard', 8, 1],
  [6, 'Interstellar', 25, 6],
  [7, 'John Wick', 15, 2],
  [9, 'The Shawshank Redemption', 9, 3],
  [10, 'Whiplash', 33, 5],
  [11, 'Gladiator', 18, 2],
  [4, 'Parasite', 63, 3],
  [0, 'Mad Max: Fury Road', 84, 2],
];

export async function seed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([
      Rental.deleteMany(),
      Movie.deleteMany(),
      Genre.deleteMany(),
      Customer.deleteMany(),
      User.deleteMany(),
    ]);
  } else if (
    (await Movie.estimatedDocumentCount()) > 0 ||
    (await User.estimatedDocumentCount()) > 0
  ) {
    throw new Error('The database already contains data. Re-run with --reset to replace it.');
  }

  await User.insertMany(
    await Promise.all(
      DEMO_USERS.map(async ({ password, ...user }) => ({
        ...user,
        password: await hashPassword(password),
      })),
    ),
  );

  const genres = await Genre.insertMany(Object.keys(CATALOGUE).map((name) => ({ name })));
  const movies = await Movie.insertMany(
    genres.flatMap((genre) =>
      (CATALOGUE[genre.name] ?? []).map(([title, numberInStock, dailyRentalRate]) => ({
        title,
        genre: { _id: genre._id, name: genre.name },
        numberInStock,
        dailyRentalRate,
      })),
    ),
  );
  const customers = await Customer.insertMany(CUSTOMERS);
  // Spread membership dates over the past year (the native driver skips automatic timestamps).
  await Promise.all(
    customers.map((customer, index) => {
      const joined = new Date(Date.now() - (365 - index * 27) * MS_PER_DAY);
      return Customer.collection.updateOne(
        { _id: customer._id },
        { $set: { createdAt: joined, updatedAt: joined } },
      );
    }),
  );

  const now = Date.now();
  const rentals = RENTALS.map(([customerIndex, title, daysAgo, daysKept]) => {
    const customer = customers[customerIndex];
    const movie = movies.find((m) => m.title === title);
    if (!customer || !movie) throw new Error(`Invalid seed rental: ${title}`);

    const dateOut = new Date(now - daysAgo * MS_PER_DAY);
    const returned = daysKept !== undefined;
    const dateReturned = returned ? new Date(dateOut.getTime() + daysKept * MS_PER_DAY) : undefined;
    return {
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isGold: customer.isGold,
      },
      movie: { _id: movie._id, title: movie.title, dailyRentalRate: movie.dailyRentalRate },
      status: returned ? 'returned' : 'active',
      dateOut,
      dateReturned,
      rentalFee: dateReturned
        ? calculateRentalFee(dateOut, dateReturned, movie.dailyRentalRate)
        : undefined,
    };
  });
  await Rental.insertMany(rentals);

  // Copies currently out on rental are not on the shelf.
  for (const rental of rentals.filter((r) => r.status === 'active')) {
    await Movie.updateOne({ _id: rental.movie._id }, { $inc: { numberInStock: -1 } });
  }

  return {
    genres: genres.length,
    movies: movies.length,
    customers: customers.length,
    rentals: rentals.length,
  };
}

const isEntryPoint = process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1]);
if (isEntryPoint) {
  const reset = process.argv.includes('--reset');
  try {
    await connectDatabase(env.MONGODB_URI);
    const counts = await seed({ reset });
    logger.info(counts, 'Seeded demo data');
    console.log('\nDemo accounts:');
    for (const user of DEMO_USERS) {
      console.log(`  ${user.isAdmin ? 'admin' : 'clerk'}  ${user.email}  /  ${user.password}`);
    }
  } catch (err) {
    logger.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
