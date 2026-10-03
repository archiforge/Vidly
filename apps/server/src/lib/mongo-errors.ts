export interface DuplicateKeyError {
  code: 11000;
  keyValue?: Record<string, unknown>;
}

export function isDuplicateKeyError(err: unknown): err is DuplicateKeyError {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}
