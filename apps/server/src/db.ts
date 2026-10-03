import mongoose from 'mongoose';
import { logger } from './lib/logger';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string, options: { dbName?: string } = {}) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, ...options });
  // Make sure unique indexes exist before we start serving writes that rely on them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  logger.info({ db: mongoose.connection.name }, 'Connected to MongoDB');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
