/**
 * securityAuth.test.js
 * Integration test suite for Module I: Authentication, Authorization & Security Hardening
 *
 * Verifies:
 * 1. Role boundary separation (Admin vs Staff vs Patient vs Public)
 * 2. Operational staff endpoints require staff/admin privileges when demo bypass is disabled
 * 3. Staff token is rejected from Admin analytics (403 Forbidden)
 * 4. Production mode disables all demo bypasses (NODE_ENV=production)
 * 5. Rate limiting middleware responds with standard headers and 429 on exhaustion
 * 6. Public patient guidance endpoints remain completely anonymous (zero credentials, zero PII)
 */

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Module I: Security Hardening & Role Authorization', () => {
  const origEnv = process.env.NODE_ENV;
  const origStaffBypass = process.env.ALLOW_UNAUTHENTICATED_STAFF_DEMO;
  const origAdminBypass = process.env.ALLOW_UNAUTHENTICATED_ADMIN_DEMO;

  afterAll(async () => {
    process.env.NODE_ENV = origEnv;
    process.env.ALLOW_UNAUTHENTICATED_STAFF_DEMO = origStaffBypass;
    process.env.ALLOW_UNAUTHENTICATED_ADMIN_DEMO = origAdminBypass;
    await db.pool.end();
  });

  describe('1. Patient & Public Anonymity', () => {
    test('POST /api/guidance/sessions creates session with zero credentials and no PII', async () => {
      const res = await request(app)
        .post('/api/guidance/sessions')
        .send({});

      expect(res.statusCode).toBe(201);
      expect(res.body.session_id).toBeDefined();
      expect(res.body.current_state).toBe('GUIDANCE_STARTED');
    });

    test('GET /api/city/overview is public and requires zero authorization headers', async () => {
      const res = await request(app).get('/api/city/overview');
      expect(res.statusCode).toBe(200);
      expect(res.body.is_simulated).toBe(true);
      expect(res.body.data_confidence_notice).toBeDefined();
    });
  });

  describe('2. Staff Route Authorization Boundary (Bypass Disabled)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_UNAUTHENTICATED_STAFF_DEMO = 'false';
    });

    test('Unauthenticated bed reserve returns HTTP 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/beds/BED_LNJP_G01/reserve')
        .send({});

      expect(res.statusCode).toBe(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Staff authentication required');
    });

    test('Non-staff user token returns HTTP 403 FORBIDDEN for bed reserve', async () => {
      const res = await request(app)
        .post('/api/beds/BED_LNJP_G01/reserve')
        .set('Authorization', 'Bearer demo-user-token')
        .send({});

      expect(res.statusCode).toBe(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Staff authorization required');
    });

    test('Non-staff user token returns HTTP 403 FORBIDDEN for admission creation', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', 'Bearer demo-user-token')
        .send({
          hospital_id: 'HOSP_LNJP',
          priority_level: 'ROUTINE',
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
    });

    test('Staff token is authorized for staff actions', async () => {
      const res = await request(app)
        .post('/api/beds/BED_LNJP_G01/reserve')
        .set('Authorization', 'Bearer demo-staff-token')
        .send({});

      expect([200, 400, 409]).toContain(res.statusCode);
      expect(res.body.error_code).not.toBe('UNAUTHORIZED');
      expect(res.body.error_code).not.toBe('FORBIDDEN');
    });

    test('Admin token possesses staff privileges (role hierarchy)', async () => {
      const res = await request(app)
        .post('/api/beds/BED_LNJP_G01/reserve')
        .set('Authorization', 'Bearer demo-admin-token')
        .send({});

      expect([200, 400, 409]).toContain(res.statusCode);
      expect(res.body.error_code).not.toBe('UNAUTHORIZED');
      expect(res.body.error_code).not.toBe('FORBIDDEN');
    });
  });

  describe('3. Role Isolation: Staff Token Forbidden from Admin Analytics', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_UNAUTHENTICATED_ADMIN_DEMO = 'false';
    });

    test('Staff token accessing /api/admin/analytics/summary returns HTTP 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/summary')
        .set('Authorization', 'Bearer demo-staff-token');

      expect(res.statusCode).toBe(403);
      expect(res.body.error_code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Admin authorization required');
    });

    test('Admin token accessing /api/admin/analytics/summary returns HTTP 200 OK', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/summary')
        .set('Authorization', 'Bearer demo-admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body.total_sessions).toBeDefined();
    });
  });

  describe('4. Production Mode Hardening (Bypasses Prohibited)', () => {
    test('In production mode, ALLOW_UNAUTHENTICATED_ADMIN_DEMO=true is strictly ignored', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_UNAUTHENTICATED_ADMIN_DEMO = 'true';

      const res = await request(app).get('/api/admin/analytics/summary');

      expect(res.statusCode).toBe(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });

    test('In production mode, ALLOW_UNAUTHENTICATED_STAFF_DEMO=true is strictly ignored', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_UNAUTHENTICATED_STAFF_DEMO = 'true';

      const res = await request(app)
        .post('/api/beds/BED_LNJP_G01/reserve')
        .send({});

      expect(res.statusCode).toBe(401);
      expect(res.body.error_code).toBe('UNAUTHORIZED');
    });
  });

  describe('5. Rate Limiting Middleware', () => {
    test('Rate limiter returns standard headers and 429 when threshold exceeded', async () => {
      const { createRateLimiter } = require('../src/middleware/rateLimiter');
      const express = require('express');
      const testApp = express();

      process.env.ENABLE_TEST_RATE_LIMIT = 'true';
      testApp.use(createRateLimiter({ max: 2, windowMs: 1000 }));
      testApp.get('/test-rate-limit', (req, res) => res.json({ ok: true }));

      const res1 = await request(testApp).get('/test-rate-limit');
      expect(res1.statusCode).toBe(200);
      expect(res1.headers['x-ratelimit-limit']).toBe('2');
      expect(res1.headers['x-ratelimit-remaining']).toBe('1');

      const res2 = await request(testApp).get('/test-rate-limit');
      expect(res2.statusCode).toBe(200);
      expect(res2.headers['x-ratelimit-remaining']).toBe('0');

      const res3 = await request(testApp).get('/test-rate-limit');
      expect(res3.statusCode).toBe(429);
      expect(res3.body.error_code).toBe('RATE_LIMIT_EXCEEDED');

      delete process.env.ENABLE_TEST_RATE_LIMIT;
    });
  });
});
