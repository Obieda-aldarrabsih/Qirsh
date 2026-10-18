import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { db } from '../../src/db/index.js';

describe('Auth Integration Tests (Tokens & Rotation)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    db.reset();
    app = await buildApp({ enableLogging: false });
    await app.ready();
  });

  it('registers a new user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'ahmad@example.com',
        password: 'SuperSecret123!',
        name: 'Ahmad Jordan',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user.email).toBe('ahmad@example.com');
    expect(body.user.name).toBe('Ahmad Jordan');
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('rejects duplicate email with 409 Conflict', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'ahmad@example.com',
        password: 'AnotherPassword123!',
        name: 'Duplicate Ahmad',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('USER_EXISTS');
  });

  it('authenticates user via login and returns valid JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'ahmad@example.com',
        password: 'SuperSecret123!',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('rotates refresh token and preserves session', async () => {
    // 1. Login to get initial tokens
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'ahmad@example.com',
        password: 'SuperSecret123!',
      },
    });
    const initialRefresh = JSON.parse(loginRes.payload).refreshToken;

    // 2. Rotate token
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: initialRefresh },
    });

    expect(refreshRes.statusCode).toBe(200);
    const refreshedBody = JSON.parse(refreshRes.payload);
    expect(refreshedBody.accessToken).toBeDefined();
    expect(refreshedBody.refreshToken).toBeDefined();
    expect(refreshedBody.refreshToken).not.toBe(initialRefresh);

    // 3. Reuse detection: Re-using initial revoked refresh token must revoke entire family!
    const reuseRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: initialRefresh },
    });

    expect(reuseRes.statusCode).toBe(401);
    const reuseBody = JSON.parse(reuseRes.payload);
    expect(reuseBody.code).toBe('TOKEN_FAMILY_REVOKED');

    // 4. Now the active refreshed token must ALSO be revoked because family was breached!
    const activeTokenAfterBreachRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: refreshedBody.refreshToken },
    });
    expect(activeTokenAfterBreachRes.statusCode).toBe(401);
  });
});
