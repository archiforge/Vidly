import { customerInputSchema, customerListQuerySchema, type CustomerInput } from '@vidly/shared';
import { Router } from 'express';
import type { Types } from 'mongoose';
import { conflict, notFound } from '../lib/http-error';
import { skipFor, SORT_COLLATION, toPage } from '../lib/pagination';
import { containsPattern, idParam } from '../lib/request';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { Customer } from '../models/customer';
import { Rental } from '../models/rental';

export const customersRouter = Router();

// Customer records contain personal data: every route requires a signed-in user.
customersRouter.use(requireAuth);

/** Builds an update that clears the optional email when it is submitted empty. */
function toUpdate({ email, ...fields }: CustomerInput) {
  return email ? { $set: { ...fields, email } } : { $set: fields, $unset: { email: 1 } };
}

customersRouter.get('/', async (req, res) => {
  const query = customerListQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.search) {
    const pattern = containsPattern(query.search);
    filter.$or = [{ name: pattern }, { phone: pattern }, { email: pattern }];
  }
  if (query.gold !== undefined) filter.isGold = query.gold;

  const direction = query.order === 'asc' ? 1 : -1;
  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ [query.sort]: direction, _id: 1 })
      .collation(SORT_COLLATION)
      .skip(skipFor(query.page, query.pageSize))
      .limit(query.pageSize)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  const activeCounts = await Rental.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { status: 'active', 'customer._id': { $in: customers.map((c) => c._id) } } },
    { $group: { _id: '$customer._id', count: { $sum: 1 } } },
  ]);
  const activeByCustomer = new Map(activeCounts.map(({ _id, count }) => [_id.toString(), count]));
  const items = customers.map((customer) => ({
    ...customer,
    activeRentals: activeByCustomer.get(customer._id.toString()) ?? 0,
  }));

  res.json(toPage(items, total, query.page, query.pageSize));
});

customersRouter.get('/:id', async (req, res) => {
  const customer = await Customer.findById(idParam(req, 'Customer')).lean();
  if (!customer) throw notFound('Customer');
  res.json(customer);
});

customersRouter.post('/', async (req, res) => {
  const { email, ...fields } = customerInputSchema.parse(req.body);
  const customer = await Customer.create({ ...fields, ...(email && { email }) });
  res.status(201).json(customer);
});

customersRouter.put('/:id', async (req, res) => {
  const id = idParam(req, 'Customer');
  const input = customerInputSchema.parse(req.body);

  const customer = await Customer.findByIdAndUpdate(id, toUpdate(input), {
    returnDocument: 'after',
    runValidators: true,
  }).lean();
  if (!customer) throw notFound('Customer');

  await Rental.updateMany(
    { 'customer._id': customer._id },
    {
      $set: {
        'customer.name': customer.name,
        'customer.phone': customer.phone,
        'customer.isGold': customer.isGold,
      },
    },
  );
  res.json(customer);
});

customersRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = idParam(req, 'Customer');
  if (await Rental.exists({ 'customer._id': id, status: 'active' })) {
    throw conflict('This customer still has movies out on rental. Process the returns first.');
  }
  const customer = await Customer.findByIdAndDelete(id).lean();
  if (!customer) throw notFound('Customer');
  res.status(204).end();
});
