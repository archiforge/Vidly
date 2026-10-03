import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { E2E_MONGODB_URI } from '../playwright.config';

export default function globalSetup() {
  for (const artifact of ['apps/server/dist/index.js', 'apps/client/dist/index.html']) {
    if (!existsSync(artifact))
      throw new Error(`Missing ${artifact}. Run \`npm run build\` before the e2e tests.`);
  }
  execFileSync('node', ['apps/server/dist/seed.js', '--reset'], {
    env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: E2E_MONGODB_URI, LOG_LEVEL: 'warn' },
    stdio: 'inherit',
  });
}
