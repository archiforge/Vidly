import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

const ISSUER = 'vidly';

export interface TokenSubject {
  _id: { toString(): string };
  name: string;
  email: string;
  isAdmin: boolean;
}

interface StoredUser extends TokenSubject {
  createdAt: Date;
  updatedAt: Date;
}

/** Explicit allow-list of user fields that may leave the server (never the password hash). */
export function toPublicUser(user: StoredUser) {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function authPayload(user: StoredUser) {
  return { token: signToken(user), user: toPublicUser(user) };
}

export function signToken(user: TokenSubject) {
  return jwt.sign({ name: user.name, email: user.email, isAdmin: user.isAdmin }, env.JWT_SECRET, {
    subject: user._id.toString(),
    issuer: ISSUER,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

/** Returns the user id encoded in a valid token, or throws. */
export function verifyToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
  if (typeof payload === 'string' || !payload.sub) throw new Error('Malformed token');
  return payload.sub;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

// Compared against when the account doesn't exist, so a login attempt costs the same
// either way and response timing doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('vidly-timing-equaliser', env.BCRYPT_ROUNDS);

export function verifyPassword(password: string, hash: string | undefined) {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
