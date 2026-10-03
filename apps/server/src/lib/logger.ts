import { pino } from 'pino';
import { env } from '../config/env';

const pretty = env.NODE_ENV === 'development' && process.stdout.isTTY;

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(pretty && {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});
