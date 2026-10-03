import type { ApiErrorBody, ApiErrorDetail } from '@vidly/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error';
import { logger } from '../lib/logger';
import { isDuplicateKeyError } from '../lib/mongo-errors';

const DUPLICATE_MESSAGES: Record<string, string> = {
  email: 'An account with this email already exists',
  phone: 'A customer with this phone number already exists',
  title: 'A movie with this title already exists',
  name: 'A genre with this name already exists',
};

/** Errors raised by body-parser / Express that are safe to show to the client. */
function isExposedHttpError(
  err: unknown,
): err is { status: number; message: string; type?: string } {
  if (typeof err !== 'object' || err === null) return false;
  const { status, expose } = err as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;

  if (err instanceof ZodError) {
    const details: ApiErrorDetail[] = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((error) => ({
      path: error.path,
      message: error.message,
    }));
    return new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new HttpError(400, `Invalid value for "${err.path}"`, 'BAD_REQUEST', [
      { path: err.path, message: 'Invalid value' },
    ]);
  }

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? '';
    const message = DUPLICATE_MESSAGES[field] ?? 'A record with these details already exists';
    return new HttpError(409, message, 'DUPLICATE', field ? [{ path: field, message }] : undefined);
  }

  if (isExposedHttpError(err)) {
    const message =
      err.type === 'entity.parse.failed' ? 'Request body is not valid JSON' : err.message;
    return new HttpError(err.status, message);
  }

  return new HttpError(500, 'Something went wrong on our side. Please try again.', 'INTERNAL');
}

export const notFoundHandler: RequestHandler = (req) => {
  throw new HttpError(404, `Route ${req.method} ${req.path} not found`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const httpError = toHttpError(err);
  if (httpError.status >= 500) {
    (req.log ?? logger).error({ err }, 'Unhandled error');
  }

  const body: ApiErrorBody = {
    error: {
      message: httpError.message,
      code: httpError.code,
      ...(httpError.details && { details: httpError.details }),
    },
  };
  res.status(httpError.status).json(body);
};
