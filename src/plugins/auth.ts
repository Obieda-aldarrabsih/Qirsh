import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { AppProblemError } from '../lib/problem.js';
import { Role } from '../db/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireWorkspaceRole: (roles: Role[], requiredScope?: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
      type: 'access';
    };
    user: {
      userId: string;
      email: string;
      type: 'user' | 'api_key';
      role?: Role;
      workspaceId?: string;
      scopes?: string[];
    };
  }
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  const jwtSecret = process.env.JWT_SECRET || 'qirsh-dev-secret-super-secure-at-least-32-chars!';

  await app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: '15m',
    },
  });

  // Authentication Decorator
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppProblemError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header.');
    }

    const token = authHeader.substring(7).trim();

    // Check if it is an API Key (starts with 'qirsh_')
    if (token.startsWith('qirsh_')) {
      const prefix = token.substring(0, 19);
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');

      const apiKey = await db.findApiKeyByPrefix(prefix);
      if (!apiKey || apiKey.key_hash !== keyHash || apiKey.revoked_at) {
        throw new AppProblemError(401, 'INVALID_API_KEY', 'The provided API key is invalid or revoked.');
      }

      // Update last used at
      apiKey.last_used_at = new Date().toISOString();

      request.user = {
        userId: apiKey.id,
        email: `apikey-${apiKey.name}@qirsh.local`,
        type: 'api_key',
        workspaceId: apiKey.workspace_id,
        scopes: apiKey.scopes,
        role: 'member', // Default API keys act as member within their scopes
      };
      return;
    }

    // Otherwise standard JWT
    try {
      const decoded = await request.jwtVerify<{ userId: string; email: string; type: string }>();
      request.user = {
        userId: decoded.userId,
        email: decoded.email,
        type: 'user',
      };
    } catch {
      throw new AppProblemError(401, 'INVALID_TOKEN', 'Access token is invalid or expired.');
    }
  });

  // Workspace Authorization Decorator
  app.decorate(
    'requireWorkspaceRole',
    (allowedRoles: Role[], requiredScope?: string) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        // Authenticate first
        await app.authenticate(request, reply);

        const params = request.params as { workspaceId?: string; wid?: string };
        const workspaceId = params.workspaceId || params.wid;

        if (!workspaceId) {
          throw new AppProblemError(400, 'WORKSPACE_ID_REQUIRED', 'Workspace ID is required in URL.');
        }

        // Verify workspace exists
        const workspace = await db.findWorkspaceById(workspaceId);
        if (!workspace) {
          // Tenant isolation: stranger gets 404
          throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');
        }

        // If API Key, verify it belongs to this workspace and has scope
        if (request.user.type === 'api_key') {
          if (request.user.workspaceId !== workspaceId) {
            throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');
          }
          if (requiredScope && !request.user.scopes?.includes(requiredScope) && !request.user.scopes?.includes('*')) {
            throw new AppProblemError(
              403,
              'INSUFFICIENT_SCOPE',
              `API key lacks required scope '${requiredScope}'.`
            );
          }
          request.user.role = 'member';
          return;
        }

        // Check user membership
        const membership = await db.getMembership(workspaceId, request.user.userId);
        if (!membership) {
          // Tenant isolation: stranger gets 404
          throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');
        }

        if (!allowedRoles.includes(membership.role)) {
          throw new AppProblemError(
            403,
            'FORBIDDEN',
            `Role '${membership.role}' does not have permission to perform this action. Required: ${allowedRoles.join(', ')}.`
          );
        }

        request.user.role = membership.role;
        request.user.workspaceId = workspaceId;
      };
    }
  );
}
