import { env } from './config/env';
import { hashPassword } from './lib/auth';
import { logger } from './lib/logger';
import { User } from './models/user';

/**
 * Ensures the administrator configured via ADMIN_EMAIL / ADMIN_PASSWORD exists, so a fresh
 * deployment is usable without running the demo seed. An existing account is promoted to
 * admin but its password is left alone.
 */
export async function ensureAdminAccount() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const email = env.ADMIN_EMAIL.toLowerCase();

  const existing = await User.findOne({ email });
  if (existing) {
    if (!existing.isAdmin) {
      existing.isAdmin = true;
      await existing.save();
      logger.info({ email }, 'Promoted configured account to administrator');
    }
    return;
  }

  await User.create({
    name: env.ADMIN_NAME,
    email,
    password: await hashPassword(env.ADMIN_PASSWORD),
    isAdmin: true,
  });
  logger.info({ email }, 'Created administrator account');
}
