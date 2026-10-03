import supertest from 'supertest';
import { createApp } from '../src/app';
import { hashPassword, signToken } from '../src/lib/auth';
import { Customer } from '../src/models/customer';
import { Genre } from '../src/models/genre';
import { Movie } from '../src/models/movie';
import { Rental } from '../src/models/rental';
import { User } from '../src/models/user';

export const api = supertest(createApp());

let sequence = 0;
const next = () => ++sequence;

export async function createUser(
  overrides: { isAdmin?: boolean; email?: string; password?: string } = {},
) {
  const password = overrides.password ?? 'Password123!';
  const user = await User.create({
    name: `User ${next()}`,
    email: overrides.email ?? `user${sequence}@test.dev`,
    password: await hashPassword(password),
    isAdmin: overrides.isAdmin ?? false,
  });
  const token = signToken(user);
  return { user, token, password, auth: { Authorization: `Bearer ${token}` } };
}

export const createAdmin = () => createUser({ isAdmin: true });

export function createGenre(name = `Genre ${next()}`) {
  return Genre.create({ name });
}

export async function createMovie(
  overrides: {
    title?: string;
    numberInStock?: number;
    dailyRentalRate?: number;
    genreName?: string;
  } = {},
) {
  const genre = await createGenre(overrides.genreName);
  return Movie.create({
    title: overrides.title ?? `Movie ${next()}`,
    genre: { _id: genre._id, name: genre.name },
    numberInStock: overrides.numberInStock ?? 5,
    dailyRentalRate: overrides.dailyRentalRate ?? 2,
  });
}

export function createCustomer(
  overrides: { name?: string; phone?: string; isGold?: boolean } = {},
) {
  const n = next();
  return Customer.create({
    name: overrides.name ?? `Customer ${n}`,
    phone: overrides.phone ?? `555-${String(n).padStart(4, '0')}`,
    isGold: overrides.isGold ?? false,
  });
}

export async function stockOf(movieId: unknown) {
  const movie = await Movie.findById(movieId).lean().orFail();
  return movie.numberInStock;
}

export { Customer, Genre, Movie, Rental, User };
