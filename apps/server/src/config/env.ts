import { existsSync } from 'node:fs';
import { z } from 'zod';

// Tests must not depend on a developer's local .env.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) process.loadEnvFile('.env');

const DEV_JWT_SECRET = 'vidly-development-only-secret-do-not-use-in-production';

const booleanString = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((value) => value === 'true' || value === '1');

/** Treats empty strings (e.g. `FOO=` in a .env file) as "not set". */
const optionalString = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3900),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/vidly'),
    JWT_SECRET: optionalString,
    JWT_EXPIRES_IN: z.string().default('12h'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).optional(),
    ALLOW_REGISTRATION: booleanString.default(true),
    ADMIN_EMAIL: optionalString,
    ADMIN_PASSWORD: optionalString,
    ADMIN_NAME: z.string().default('Administrator'),
    CORS_ORIGIN: optionalString,
    CLIENT_DIST_DIR: optionalString,
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && (!value.JWT_SECRET || value.JWT_SECRET.length < 32)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'must be set to at least 32 characters in production',
      });
    }
    if (Boolean(value.ADMIN_EMAIL) !== Boolean(value.ADMIN_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_PASSWORD'],
        message: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set together',
      });
    }
  })
  .transform((value) => ({
    ...value,
    JWT_SECRET: value.JWT_SECRET ?? DEV_JWT_SECRET,
    BCRYPT_ROUNDS: value.BCRYPT_ROUNDS ?? (value.NODE_ENV === 'test' ? 4 : 12),
    LOG_LEVEL: value.LOG_LEVEL ?? (value.NODE_ENV === 'test' ? 'silent' : 'info'),
    CORS_ORIGIN: value.CORS_ORIGIN?.split(',').map((origin) => origin.trim()),
    usingDevSecret: !value.JWT_SECRET,
  }));

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
