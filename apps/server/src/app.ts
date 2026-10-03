import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HealthStatus, PublicConfig } from '@vidly/shared';
import compression from 'compression';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { isDatabaseConnected } from './db';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { genresRouter } from './routes/genres';
import { moviesRouter } from './routes/movies';
import { rentalsRouter } from './routes/rentals';
import { statsRouter } from './routes/stats';
import { usersRouter } from './routes/users';

const VERSION = process.env.npm_package_version ?? 'dev';

/**
 * Where the built admin portal lives. It is only served when explicitly configured or in
 * production, so a stale build never shadows the Vite dev server during development.
 */
function resolveClientDir() {
  if (env.CLIENT_DIST_DIR) return path.resolve(env.CLIENT_DIST_DIR);
  if (env.NODE_ENV !== 'production') return undefined;
  // Works from both src/ (tsx) and dist/ (bundled), which sit at the same depth.
  return fileURLToPath(new URL('../../client/dist', import.meta.url));
}

function apiRouter() {
  const api = Router();

  api.get('/health', (_req, res) => {
    const connected = isDatabaseConnected();
    const body: HealthStatus = {
      status: connected ? 'ok' : 'degraded',
      database: connected ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
      version: VERSION,
    };
    res.status(connected ? 200 : 503).json(body);
  });

  api.get('/config', (_req, res) => {
    const body: PublicConfig = { allowRegistration: env.ALLOW_REGISTRATION };
    res.json(body);
  });

  api.use('/auth', authRouter);
  api.use('/genres', genresRouter);
  api.use('/movies', moviesRouter);
  api.use('/customers', customersRouter);
  api.use('/rentals', rentalsRouter);
  api.use('/users', usersRouter);
  api.use('/stats', statsRouter);
  api.use(notFoundHandler);
  return api;
}

export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.set('query parser', 'simple');

  app.use(
    helmet({
      // HTTPS redirects are the reverse proxy's job; upgrading here breaks plain-HTTP LAN access.
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  if (env.CORS_ORIGIN) app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/api/health' },
        // Keep request logs to one compact line; headers are noise (and may hold secrets).
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
      }),
    );
  }

  app.use('/api', apiRouter());

  const clientDir = resolveClientDir();
  if (clientDir && existsSync(path.join(clientDir, 'index.html'))) {
    app.use(express.static(clientDir, { index: false, maxAge: '1y', immutable: true }));
    // Single-page app: let the client-side router handle every other GET.
    app.get('/{*path}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDir, 'index.html'));
    });
    logger.info({ clientDir }, 'Serving admin portal');
  }

  app.use(errorHandler);
  return app;
}
