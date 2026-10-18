import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { v4 as uuidv4 } from 'uuid';

import { registerErrorHandler } from './plugins/errors.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerRateLimitPlugin } from './plugins/rate-limit.js';
import { registerDocsPlugin } from './plugins/docs.js';

import { systemRoutes } from './modules/system/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { workspaceRoutes, inviteAcceptRoutes } from './modules/workspaces/routes.js';
import { categoryRoutes } from './modules/categories/routes.js';
import { transactionRoutes } from './modules/transactions/routes.js';
import { budgetRoutes } from './modules/budgets/routes.js';
import { reportRoutes } from './modules/reports/routes.js';
import { importRoutes } from './modules/imports/routes.js';
import { exportRoutes } from './modules/exports/routes.js';
import { recurringRoutes } from './modules/recurring/routes.js';
import { apiKeyRoutes } from './modules/api-keys/routes.js';

export interface AppOptions {
  enableLogging?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.enableLogging
      ? {
          level: process.env.LOG_LEVEL || 'info',
          redact: ['headers.authorization', 'req.headers.authorization', 'body.password', 'body.refreshToken', 'body.token'],
        }
      : false,
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const existing = req.headers['x-request-id'];
      if (typeof existing === 'string') return existing;
      return `req_${Date.now().toString(36)}_${uuidv4().substring(0, 8)}`;
    },
    trustProxy: true,
  });

  // Security Headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Allows Swagger UI to load scripts/styles
  });

  // CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['ETag', 'Location', 'Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  });

  // Error Handling
  registerErrorHandler(app);

  // OpenAPI & Themed Docs
  await registerDocsPlugin(app);

  // Authentication & RBAC
  await registerAuthPlugin(app);

  // Rate Limiting
  await registerRateLimitPlugin(app);

  // System & Health Endpoints
  await app.register(systemRoutes);

  // API v1 Routes
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(workspaceRoutes, { prefix: '/workspaces' });
      await v1.register(inviteAcceptRoutes);
      await v1.register(categoryRoutes, { prefix: '/workspaces/:wid/categories' });
      await v1.register(transactionRoutes, { prefix: '/workspaces/:wid/transactions' });
      await v1.register(budgetRoutes, { prefix: '/workspaces/:wid/budgets' });
      await v1.register(reportRoutes, { prefix: '/workspaces/:wid/reports' });
      await v1.register(importRoutes, { prefix: '/workspaces/:wid/imports' });
      await v1.register(exportRoutes, { prefix: '/workspaces/:wid/exports' });
      await v1.register(recurringRoutes, { prefix: '/workspaces/:wid/recurring-rules' });
      await v1.register(apiKeyRoutes, { prefix: '/workspaces/:wid/api-keys' });
    },
    { prefix: '/v1' }
  );

  return app;
}
