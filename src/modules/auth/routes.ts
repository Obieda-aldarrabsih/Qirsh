import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/index.js';
import { AppProblemError } from '../../lib/problem.js';

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Register
  app.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Create a new user account',
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 2 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name } = request.body as any;
      const existing = await db.findUserByEmail(email);
      if (existing) {
        throw new AppProblemError(409, 'USER_EXISTS', 'A user with this email already exists.');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await db.createUser({
        email,
        password_hash: passwordHash,
        name,
      });

      const accessToken = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' }, { expiresIn: '15m' });
      const rawRefreshToken = `rt_${uuidv4().replace(/-/g, '')}${crypto.randomBytes(16).toString('hex')}`;
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const familyId = uuidv4();

      await db.saveRefreshToken({
        user_id: user.id,
        token_hash: tokenHash,
        family_id: familyId,
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        revoked_at: null,
      });

      return reply.code(201).send({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken: rawRefreshToken,
      });
    }
  );

  // Login
  app.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate and receive tokens',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as any;
      const user = await db.findUserByEmail(email);
      if (!user) {
        throw new AppProblemError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new AppProblemError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      const accessToken = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' }, { expiresIn: '15m' });
      const rawRefreshToken = `rt_${uuidv4().replace(/-/g, '')}${crypto.randomBytes(16).toString('hex')}`;
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const familyId = uuidv4();

      await db.saveRefreshToken({
        user_id: user.id,
        token_hash: tokenHash,
        family_id: familyId,
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        revoked_at: null,
      });

      return reply.send({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken: rawRefreshToken,
      });
    }
  );

  // Refresh with Token Family Rotation & Reuse Detection
  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and get a new access token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as any;
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const record = await db.findRefreshTokenByHash(tokenHash);

      if (!record) {
        throw new AppProblemError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is unrecognized.');
      }

      // Reuse detection: If token was already revoked, someone is attempting replay! Revoke the entire family!
      if (record.revoked_at) {
        await db.revokeFamily(record.family_id);
        throw new AppProblemError(
          401,
          'TOKEN_FAMILY_REVOKED',
          'Token reuse detected. All tokens in this session family have been revoked.'
        );
      }

      // Check expiry
      if (new Date(record.expires_at) < new Date()) {
        await db.revokeToken(record.id);
        throw new AppProblemError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired.');
      }

      // Revoke current token
      await db.revokeToken(record.id);

      const user = await db.findUserById(record.user_id);
      if (!user) {
        throw new AppProblemError(401, 'USER_NOT_FOUND', 'User belonging to this token no longer exists.');
      }

      // Issue new access token + new rotated refresh token in the SAME family
      const accessToken = app.jwt.sign({ userId: user.id, email: user.email, type: 'access' }, { expiresIn: '15m' });
      const newRawRefreshToken = `rt_${uuidv4().replace(/-/g, '')}${crypto.randomBytes(16).toString('hex')}`;
      const newTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

      await db.saveRefreshToken({
        user_id: user.id,
        token_hash: newTokenHash,
        family_id: record.family_id,
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        revoked_at: null,
      });

      return reply.send({
        accessToken,
        refreshToken: newRawRefreshToken,
      });
    }
  );

  // Logout
  app.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Revoke refresh token and log out',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as any;
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const record = await db.findRefreshTokenByHash(tokenHash);
      if (record) {
        await db.revokeToken(record.id);
      }
      return reply.send({ message: 'Successfully logged out.' });
    }
  );
};
