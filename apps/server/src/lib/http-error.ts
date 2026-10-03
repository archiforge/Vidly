import type { ApiErrorDetail } from '@vidly/shared';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = defaultCode(status),
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function defaultCode(status: number) {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'ERROR';
  }
}

export const notFound = (resource: string) => new HttpError(404, `${resource} not found`);

export const conflict = (message: string) => new HttpError(409, message);

/** A 400 that points at a specific request field, rendered like a schema validation error. */
export const invalidField = (path: string, message: string) =>
  new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', [{ path, message }]);
