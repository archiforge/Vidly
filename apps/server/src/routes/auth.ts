import {
  changePasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
} from '@vidly/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { authPayload, hashPassword, toPublicUser, verifyPassword } from '../lib/auth';
import { conflict, HttpError, invalidField, notFound } from '../lib/http-error';
import { currentUser } from '../lib/request';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/user';

export const authRouter = Router();

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, _res, next) =>
    next(
      new HttpError(
        429,
        'Too many attempts. Please wait a few minutes and try again.',
        'RATE_LIMITED',
      ),
    ),
});

authRouter.post('/register', credentialLimiter, async (req, res) => {
  if (!env.ALLOW_REGISTRATION) {
    throw new HttpError(
      403,
      'Self-service registration is disabled. Ask an administrator for an account.',
    );
  }
  const input = registerSchema.parse(req.body);

  if (await User.exists({ email: input.email })) {
    throw conflict('An account with this email already exists');
  }

  const created = await User.create({ ...input, password: await hashPassword(input.password) });
  const user = await User.findById(created._id).lean().orFail();

  res.status(201).json(authPayload(user));
});

authRouter.post('/login', credentialLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const account = await User.findOne({ email }).select('+password').lean();
  const passwordMatches = await verifyPassword(password, account?.password);
  if (!account || !passwordMatches) {
    throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  res.json(authPayload(account));
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(currentUser(req).id).lean();
  if (!user) throw notFound('User');
  res.json(toPublicUser(user));
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const input = profileUpdateSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(currentUser(req).id, input, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!user) throw notFound('User');
  // The name is embedded in the token, so hand back a fresh one.
  res.json(authPayload(user));
});

authRouter.post('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const account = await User.findById(currentUser(req).id).select('+password');
  if (!account) throw notFound('User');

  if (!(await verifyPassword(currentPassword, account.password))) {
    throw invalidField('currentPassword', 'Current password is incorrect');
  }
  account.password = await hashPassword(newPassword);
  await account.save();
  res.status(204).end();
});
