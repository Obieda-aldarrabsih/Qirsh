import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { db } from '../../db/index.js';
import { AppProblemError } from '../../lib/problem.js';
import { isSupportedCurrency } from '../../lib/money.js';
import { Role } from '../../db/types.js';

export const workspaceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // List my workspaces
  app.get(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Workspaces'],
        summary: 'List workspaces the authenticated user belongs to',
      },
    },
    async (request, reply) => {
      const list = await db.listWorkspacesForUser(request.user.userId);
      return reply.send({ data: list });
    }
  );

  // Create workspace
  app.post(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Workspaces'],
        summary: 'Create a new workspace',
        body: {
          type: 'object',
          required: ['name', 'currency'],
          properties: {
            name: { type: 'string', minLength: 2 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            timezone: { type: 'string', default: 'Asia/Amman' },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, currency, timezone } = request.body as any;
      const normCurrency = currency.toUpperCase();
      if (!isSupportedCurrency(normCurrency)) {
        throw new AppProblemError(
          422,
          'UNSUPPORTED_CURRENCY',
          `Currency '${currency}' is not supported.`
        );
      }

      const ws = await db.createWorkspace({
        name,
        currency: normCurrency,
        timezone: timezone || 'Asia/Amman',
        created_by: request.user.userId,
      });

      return reply.code(201).send(ws);
    }
  );

  // Get workspace by ID
  app.get(
    '/:wid',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'])],
      schema: {
        tags: ['Workspaces'],
        summary: 'Get workspace details',
        params: {
          type: 'object',
          required: ['wid'],
          properties: {
            wid: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const ws = await db.findWorkspaceById(wid);
      if (!ws) {
        throw new AppProblemError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');
      }
      return reply.send(ws);
    }
  );

  // List members
  app.get(
    '/:wid/members',
    {
      preHandler: [app.requireWorkspaceRole(['owner', 'member', 'viewer'])],
      schema: {
        tags: ['Workspaces'],
        summary: 'List members of a workspace',
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const members = await db.listMembers(wid);
      return reply.send({ data: members });
    }
  );

  // Create invite (owner only)
  app.post(
    '/:wid/invites',
    {
      preHandler: [app.requireWorkspaceRole(['owner'])],
      schema: {
        tags: ['Workspaces'],
        summary: 'Generate an invitation token for a new member',
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['owner', 'member', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { wid } = request.params as any;
      const { role } = request.body as { role: Role };

      const invite = await db.createInvite(wid, role, request.user.userId);
      return reply.code(201).send({
        token: invite.token,
        inviteUrl: `http://localhost:3000/v1/invites/${invite.token}/accept`,
        expiresAt: invite.expires_at,
        role: invite.role,
      });
    }
  );
};

export const inviteAcceptRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Accept invite
  app.post(
    '/invites/:token/accept',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Workspaces'],
        summary: 'Accept an invitation using an invite token',
      },
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const invite = await db.findInvite(token);
      if (!invite) {
        throw new AppProblemError(404, 'INVITE_NOT_FOUND', 'Invitation token is invalid or expired.');
      }

      await db.addMembership({
        workspace_id: invite.workspace_id,
        user_id: request.user.userId,
        role: invite.role,
      });

      await db.deleteInvite(token);

      return reply.send({
        message: 'Invitation accepted successfully.',
        workspaceId: invite.workspace_id,
        role: invite.role,
      });
    }
  );
};
