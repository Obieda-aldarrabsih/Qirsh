import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { db } from '../../db/index.js';
import { AppProblemError } from '../../lib/problem.js';

export const apiKeyRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Create API key (owner only)
  app.post(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner'])],
      schema: {
        tags: ['API Keys'],
        summary: 'Create a scoped API key (secret displayed once)',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2 },
            scopes: {
              type: 'array',
              items: { type: 'string' },
              default: ['transactions:read', 'transactions:write', 'reports:read'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { name, scopes } = request.body as any;

      const randomBytes = crypto.randomBytes(24).toString('hex');
      const fullKey = `qirsh_live_${randomBytes}`;
      const prefix = fullKey.substring(0, 19); // 'qirsh_live_' + 8 hex chars
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      const apiKey = await db.createApiKey({
        workspace_id: wid,
        name,
        prefix,
        key_hash: keyHash,
        scopes: scopes || ['*'],
        last_used_at: null,
        revoked_at: null,
      });

      return reply.code(201).send({
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        scopes: apiKey.scopes,
        createdAt: apiKey.created_at,
        secretKey: fullKey, // ONLY SHOWN ONCE
        warning: 'Store this secret key securely. It will not be shown again.',
      });
    }
  );

  // List API keys (owner only)
  app.get(
    '/',
    {
      preHandler: [app.requireWorkspaceRole(['owner'])],
      schema: {
        tags: ['API Keys'],
        summary: 'List API keys for workspace',
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const list = await db.listApiKeys(wid);
      return reply.send({
        data: list.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix,
          scopes: k.scopes,
          lastUsedAt: k.last_used_at,
          revokedAt: k.revoked_at,
          createdAt: k.created_at,
        })),
      });
    }
  );

  // Revoke API key (owner only)
  app.delete(
    '/:id',
    {
      preHandler: [app.requireWorkspaceRole(['owner'])],
      schema: {
        tags: ['API Keys'],
        summary: 'Revoke an API key',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid, id } = request.params as any;
      const success = await db.revokeApiKey(id, wid);
      if (!success) {
        throw new AppProblemError(404, 'API_KEY_NOT_FOUND', 'API key not found.');
      }
      return reply.code(204).send();
    }
  );
};
