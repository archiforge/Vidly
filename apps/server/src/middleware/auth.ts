import type { RequestHandler } from 'express';
import { verifyToken } from '../lib/auth';
import { HttpError } from '../lib/http-error';
import { User } from '../models/user';

function readBearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

/**
 * Requires a valid bearer token. The user is re-loaded from the database on each request
 * so that deleted or demoted accounts lose access immediately, not when the token expires.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readBearerToken(req.get('authorization'));
  if (!token) throw new HttpError(401, 'Authentication required');

  let userId: string;
  try {
    userId = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Your session is invalid or has expired', 'INVALID_TOKEN');
  }

  const user = await User.findById(userId).lean();
  if (!user) throw new HttpError(401, 'Your session is invalid or has expired', 'INVALID_TOKEN');

  req.user = { id: user._id.toString(), name: user.name, email: user.email, isAdmin: user.isAdmin };
  next();
};

/** Must run after `requireAuth`. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user?.isAdmin) throw new HttpError(403, 'Administrator access required');
  next();
};
