import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';

export async function registerRateLimitPlugin(app: FastifyInstance): Promise<void> {
  let redisClient: Redis | undefined = undefined;

  if (process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      await redisClient.connect();
      app.log.info('Connected to Redis for rate-limiting');
    } catch (err) {
      app.log.warn('Could not connect to Redis, falling back to in-memory rate limiting');
      redisClient = undefined;
    }
  }

  await app.register(fastifyRateLimit, {
    max: (req: FastifyRequest) => {
      // Per spec §12.3:
      // 20 requests/min per IP on /auth/*
      if (req.url.startsWith('/v1/auth')) {
        return 20;
      }
      // 60 requests/min per API key
      if (req.user?.type === 'api_key') {
        return 60;
      }
      // 300 requests/min per authenticated user
      if (req.user?.type === 'user') {
        return 300;
      }
      // Default 100 for other unauthenticated
      return 100;
    },
    timeWindow: 60 * 1000, // 1 minute
    keyGenerator: (req: FastifyRequest) => {
      if (req.user?.userId) {
        return `principal_${req.user.userId}`;
      }
      return req.ip;
    },
    redis: redisClient,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
}
