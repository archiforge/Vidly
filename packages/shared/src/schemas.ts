import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MOVIE_LIMITS } from './constants';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254, 'Email is too long'));

const nameSchema = (label: string, min = 2, max = 100) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

// ---------------------------------------------------------------------------
// Auth & users
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export const registerSchema = z.object({
  name: nameSchema('Name'),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const profileUpdateSchema = z.object({
  name: nameSchema('Name'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: registerSchema.shape.password,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

export const userUpdateSchema = z.object({
  isAdmin: z.boolean(),
});

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const genreInputSchema = z.object({
  name: nameSchema('Name', 2, 50),
});

export const movieInputSchema = z.object({
  title: nameSchema('Title', 1, 200),
  genreId: z.string().min(1, 'Select a genre').pipe(objectIdSchema),
  numberInStock: z
    .number({ error: 'Enter a number' })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(MOVIE_LIMITS.maxStock, `Must be at most ${MOVIE_LIMITS.maxStock}`),
  dailyRentalRate: z
    .number({ error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(MOVIE_LIMITS.maxDailyRate, `Must be at most ${MOVIE_LIMITS.maxDailyRate}`),
});

// ---------------------------------------------------------------------------
// Customers & rentals
// ---------------------------------------------------------------------------

export const customerInputSchema = z.object({
  name: nameSchema('Name'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{7,20}$/, 'Enter a valid phone number (7–20 digits)'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'Enter a valid email address',
    })
    .optional(),
  isGold: z.boolean().default(false),
});

export const rentalInputSchema = z.object({
  customerId: objectIdSchema,
  movieId: objectIdSchema,
});

// ---------------------------------------------------------------------------
// List queries (all values arrive as strings in the query string)
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

const booleanParam = z.enum(['true', 'false']).transform((value) => value === 'true');

export const movieListQuerySchema = paginationSchema.extend({
  genreId: objectIdSchema.optional(),
  inStock: booleanParam.optional(),
  sort: z
    .enum(['title', 'genre', 'numberInStock', 'dailyRentalRate', 'createdAt'])
    .default('title'),
});

export const customerListQuerySchema = paginationSchema.extend({
  gold: booleanParam.optional(),
  sort: z.enum(['name', 'createdAt']).default('name'),
});

export const rentalStatusSchema = z.enum(['all', 'active', 'returned']);

export const rentalListQuerySchema = paginationSchema.extend({
  status: rentalStatusSchema.default('all'),
  customerId: objectIdSchema.optional(),
  movieId: objectIdSchema.optional(),
  sort: z.enum(['dateOut', 'dateReturned', 'rentalFee']).default('dateOut'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const userListQuerySchema = paginationSchema.extend({
  sort: z.enum(['name', 'email', 'createdAt']).default('name'),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type GenreInput = z.infer<typeof genreInputSchema>;
export type MovieInput = z.infer<typeof movieInputSchema>;
export type MovieFormValues = z.input<typeof movieInputSchema>;
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerFormValues = z.input<typeof customerInputSchema>;
export type RentalInput = z.infer<typeof rentalInputSchema>;
export type RentalStatus = z.infer<typeof rentalStatusSchema>;
export type MovieListQuery = z.infer<typeof movieListQuerySchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type RentalListQuery = z.infer<typeof rentalListQuerySchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
