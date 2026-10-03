import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import { connectDatabase } from '../src/db';
// Register every model before connecting so their indexes are built up front.
import '../src/models/customer';
import '../src/models/genre';
import '../src/models/movie';
import '../src/models/rental';
import '../src/models/user';

beforeAll(async () => {
  await connectDatabase(inject('mongoUri'), { dbName: `vidly_test_${randomUUID().slice(0, 8)}` });
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
