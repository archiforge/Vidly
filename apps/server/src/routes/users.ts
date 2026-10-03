import { userListQuerySchema, userUpdateSchema } from '@vidly/shared';
import { Router } from 'express';
import { toPublicUser } from '../lib/auth';
import { HttpError, notFound } from '../lib/http-error';
import { skipFor, SORT_COLLATION, toPage } from '../lib/pagination';
import { containsPattern, currentUser, idParam } from '../lib/request';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { User } from '../models/user';

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get('/', async (req, res) => {
  const query = userListQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.search) {
    const pattern = containsPattern(query.search);
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const direction = query.order === 'asc' ? 1 : -1;
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ [query.sort]: direction, _id: 1 })
      .collation(SORT_COLLATION)
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);
  res.json(toPage(users.map(toPublicUser), total, query.page, query.pageSize));
});

// Admins can't change or remove their own account here, which also guarantees
// that the system always keeps at least one administrator.
function assertNotSelf(targetId: string, actingId: string, action: string) {
  if (targetId === actingId) throw new HttpError(400, `You can't ${action} your own account`);
}

usersRouter.patch('/:id', async (req, res) => {
  const id = idParam(req, 'User');
  assertNotSelf(id, currentUser(req).id, 'change the role of');
  const update = userUpdateSchema.parse(req.body);

  const user = await User.findByIdAndUpdate(id, update, {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!user) throw notFound('User');
  res.json(toPublicUser(user));
});

usersRouter.delete('/:id', async (req, res) => {
  const id = idParam(req, 'User');
  assertNotSelf(id, currentUser(req).id, 'delete');

  const user = await User.findByIdAndDelete(id).lean();
  if (!user) throw notFound('User');
  res.status(204).end();
});
