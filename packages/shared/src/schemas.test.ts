import { describe, expect, it } from 'vitest';
import {
  customerInputSchema,
  movieInputSchema,
  movieListQuerySchema,
  registerSchema,
} from './schemas';

describe('registerSchema', () => {
  it('normalises email and trims the name', () => {
    const parsed = registerSchema.parse({
      name: '  Ada Lovelace ',
      email: '  ADA@Example.COM ',
      password: 'correct-horse',
    });
    expect(parsed).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse',
    });
  });

  it('rejects short passwords', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('movieInputSchema', () => {
  const valid = {
    title: 'Alien',
    genreId: '65f000000000000000000001',
    numberInStock: 3,
    dailyRentalRate: 2.5,
  };

  it('accepts a valid movie', () => {
    expect(movieInputSchema.parse(valid)).toEqual(valid);
  });

  it('asks for a genre when none is selected', () => {
    const result = movieInputSchema.safeParse({ ...valid, genreId: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Select a genre');
  });

  it('rejects NaN (an empty number input) with a friendly message', () => {
    const result = movieInputSchema.safeParse({ ...valid, numberInStock: Number.NaN });
    expect(result.error?.issues[0]?.message).toBe('Enter a number');
  });

  it('rejects fractional stock', () => {
    expect(movieInputSchema.safeParse({ ...valid, numberInStock: 1.5 }).success).toBe(false);
  });
});

describe('customerInputSchema', () => {
  it('allows an empty optional email and defaults isGold', () => {
    const parsed = customerInputSchema.parse({
      name: 'Bob',
      phone: '+1 (555) 010-2030',
      email: '',
    });
    expect(parsed).toMatchObject({ email: '', isGold: false });
  });

  it('rejects malformed phone numbers', () => {
    expect(customerInputSchema.safeParse({ name: 'Bob', phone: 'call me' }).success).toBe(false);
  });
});

describe('movieListQuerySchema', () => {
  it('coerces query string values and applies defaults', () => {
    expect(movieListQuerySchema.parse({ page: '2', inStock: 'true' })).toEqual({
      page: 2,
      pageSize: 10,
      order: 'asc',
      sort: 'title',
      inStock: true,
    });
  });

  it('caps the page size', () => {
    expect(movieListQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });
});
