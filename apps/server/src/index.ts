import { createApp } from './app';
import { ensureAdminAccount } from './bootstrap';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './db';
import { logger } from './lib/logger';

async function main() {
  if (env.usingDevSecret) {
    logger.warn('JWT_SECRET is not set; using an insecure development secret');
  }

  await connectDatabase(env.MONGODB_URI);
  await ensureAdminAccount();

  const server = createApp().listen(env.PORT, env.HOST, () => {
    logger.info(`Vidly API listening on http://localhost:${env.PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
    server.close(() => {
      void disconnectDatabase().finally(() => {
        clearTimeout(forceExit);
        process.exit(0);
      });
    });
    server.closeIdleConnections();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start the server');
  process.exit(1);
});
