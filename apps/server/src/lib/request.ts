import { objectIdSchema } from '@vidly/shared';
import type { Request } from 'express';
import { HttpError, notFound } from './http-error';

/**
 * Reads an id route parameter. A malformed id can never match a document, so it is
 * reported as "not found" rather than leaking a database cast error.
 */
export function idParam(req: Request, resource: string, name = 'id'): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !objectIdSchema.safeParse(value).success)
    throw notFound(resource);
  return value;
}

export function currentUser(req: Request) {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  return req.user;
}

/** Escapes user input for safe use inside a regular expression. */
export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsPattern(value: string) {
  return new RegExp(escapeRegex(value), 'i');
}
