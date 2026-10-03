const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Healthcare Access Guidance API - Unified Integration Test Suite', () => {
  let activeSessionId;

  afterAll(async () => {
    await db.pool.end();
  });

  test('GET /api/health returns HTTP 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.service).toBe('healthcare-guidance-api');
  });

  test('GET /api/categories returns controlled category list', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBe(4);
  });

  test('POST /api/guidance/sessions creates anonymous UUID session in GUIDANCE_STARTED state', async () => {
    const res = await request(app)
      .post('/api/guidance/sessions')
      .send({});

    expect(res.statusCode).toEqual(201);
    expect(res.body.session_id).toBeDefined();
    expect(res.body.current_state).toBe('GUIDANCE_STARTED');
    expect(res.body.is_completed).toBe(false);
    activeSessionId = res.body.session_id;
  });

  test('POST /api/guidance/search rejects unvalidated/prohibited fields with HTTP 400 UNSUPPORTED_INPUT', async () => {
    const res = await request(app)
      .post('/api/guidance/search')
      .send({
        session_id: activeSessionId,
        category_id: 'DEMO_ALPHA',
        symptoms: 'severe stomach pain', // Unrecognized field rejected by Zod .strict()
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  test('Invalid State Transition: fresh session attempts GUIDANCE_STARTED -> GUIDANCE_COMPLETED, expects HTTP 409', async () => {
    // 1. Create a brand-new session in GUIDANCE_STARTED state
    const newSessionRes = await request(app)
      .post('/api/guidance/sessions')
      .send({});
    expect(newSessionRes.statusCode).toEqual(201);
    const freshSessionId = newSessionRes.body.session_id;

    // 2. Attempt invalid transition directly from GUIDANCE_STARTED to GUIDANCE_COMPLETED
    const invalidRes = await request(app)
      .post('/api/guidance/complete')
      .send({
        session_id: freshSessionId,
      });

    expect(invalidRes.statusCode).toEqual(409);
    expect(invalidRes.body.error_code).toBe('INVALID_STATE_TRANSITION');
  });

  test('POST /api/guidance/search finds synthetic reference package (Found Path)', async () => {
    const res = await request(app)
      .post('/api/guidance/search')
      .send({
        session_id: activeSessionId,
        category_id: 'DEMO_ALPHA',
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.reference_found).toBe(true);
    expect(res.body.session.current_state).toBe('PUBLIC_REFERENCE_FOUND');
    expect(res.body.package).toBeDefined();
    expect(res.body.package.package_id).toBe('DEMO-ALPHA-001');
    expect(res.body.package.source_id).toBe('SYNTH-SRC-2026-V1');
    expect(res.body.package.import_run_id).toBeDefined();
    expect(res.body.package.is_simulated_reference).toBe(true);
  });

  test('POST /api/guidance/official-route advances to OFFICIAL_VERIFICATION_ROUTE_SHOWN', async () => {
    const res = await request(app)
      .post('/api/guidance/official-route')
      .send({
        session_id: activeSessionId,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.session.current_state).toBe('OFFICIAL_VERIFICATION_ROUTE_SHOWN');
    expect(res.body.route_info).toBeDefined();
    expect(res.body.route_info.informational_card).toContain('Information route shown; confirmation must occur through the relevant official process outside this prototype.');
  });

  test('POST /api/guidance/complete completes the session after official route is shown', async () => {
    const res = await request(app)
      .post('/api/guidance/complete')
      .send({
        session_id: activeSessionId,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.session.current_state).toBe('GUIDANCE_COMPLETED');
    expect(res.body.session.is_completed).toBe(true);
  });

  test('GET /api/guidance/sessions/:id returns session record with audit events', async () => {
    const res = await request(app).get(`/api/guidance/sessions/${activeSessionId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.session.session_id).toBe(activeSessionId);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBeGreaterThanOrEqual(4);
  });

  test('Database Trigger Enforcement: UPDATE on guidance_event is strictly rejected by PostgreSQL trigger', async () => {
    // 1. Query an actual event_id recorded for activeSessionId
    const eventRes = await db.query(
      'SELECT event_id, event_type FROM guidance_event WHERE session_id = $1 LIMIT 1;',
      [activeSessionId]
    );

    // 2. Assert that the event exists
    expect(eventRes.rows.length).toBe(1);
    const targetEvent = eventRes.rows[0];
    const targetEventId = targetEvent.event_id;
    const originalEventType = targetEvent.event_type;

    // 3. Attempt UPDATE by specific event_id
    let errorCaught = null;
    try {
      await db.query(
        "UPDATE guidance_event SET event_type = 'TAMPERED' WHERE event_id = $1;",
        [targetEventId]
      );
    } catch (err) {
      errorCaught = err;
    }

    // 4. Assert that the PostgreSQL trigger threw an exception
    expect(errorCaught).not.toBeNull();
    expect(errorCaught.message).toContain('guidance_event table is append-only');

    // 5. Re-query the event to verify it still exists and its original event_type is unchanged
    const verifyRes = await db.query(
      'SELECT event_id, event_type FROM guidance_event WHERE event_id = $1;',
      [targetEventId]
    );
    expect(verifyRes.rows.length).toBe(1);
    expect(verifyRes.rows[0].event_type).toBe(originalEventType);
  });

  test('Database Trigger Enforcement: DELETE on guidance_event is strictly rejected by PostgreSQL trigger', async () => {
    // 1. Query an actual event_id recorded for activeSessionId
    const eventRes = await db.query(
      'SELECT event_id, event_type FROM guidance_event WHERE session_id = $1 LIMIT 1;',
      [activeSessionId]
    );

    // 2. Assert that the event exists
    expect(eventRes.rows.length).toBe(1);
    const targetEvent = eventRes.rows[0];
    const targetEventId = targetEvent.event_id;
    const originalEventType = targetEvent.event_type;

    // 3. Attempt DELETE by specific event_id
    let errorCaught = null;
    try {
      await db.query(
        'DELETE FROM guidance_event WHERE event_id = $1;',
        [targetEventId]
      );
    } catch (err) {
      errorCaught = err;
    }

    // 4. Assert that the PostgreSQL trigger threw an exception
    expect(errorCaught).not.toBeNull();
    expect(errorCaught.message).toContain('guidance_event table is append-only');

    // 5. Re-query the event to verify it still exists and was not deleted
    const verifyRes = await db.query(
      'SELECT event_id, event_type FROM guidance_event WHERE event_id = $1;',
      [targetEventId]
    );
    expect(verifyRes.rows.length).toBe(1);
    expect(verifyRes.rows[0].event_type).toBe(originalEventType);
  });

  test('POST /api/guidance/search with NO_MATCH_DEMO routes to PUBLIC_REFERENCE_NOT_FOUND', async () => {
    const sessionRes = await request(app).post('/api/guidance/sessions').send({});
    const noMatchSessionId = sessionRes.body.session_id;

    const searchRes = await request(app)
      .post('/api/guidance/search')
      .send({
        session_id: noMatchSessionId,
        category_id: 'NO_MATCH_DEMO',
      });

    expect(searchRes.statusCode).toEqual(200);
    expect(searchRes.body.reference_found).toBe(false);
    expect(searchRes.body.session.current_state).toBe('PUBLIC_REFERENCE_NOT_FOUND');

    const supportRes = await request(app)
      .post('/api/guidance/support-route')
      .send({
        session_id: noMatchSessionId,
      });

    expect(supportRes.statusCode).toEqual(200);
    expect(supportRes.body.session.current_state).toBe('SUPPORT_ROUTE_SHOWN');
    expect(supportRes.body.route_info.informational_card).toContain('Information route shown; confirmation must occur through the relevant official process outside this prototype.');

    const completeRes = await request(app)
      .post('/api/guidance/complete')
      .send({
        session_id: noMatchSessionId,
      });

    expect(completeRes.statusCode).toEqual(200);
    expect(completeRes.body.session.current_state).toBe('GUIDANCE_COMPLETED');
  });

  test('GET /api/reference-packages returns synthetic demo package catalog with foreign keys', async () => {
    const res = await request(app).get('/api/reference-packages');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.packages)).toBe(true);
    expect(res.body.total_packages).toBeGreaterThanOrEqual(3);
    const pkg = res.body.packages[0];
    expect(pkg.source_id).toBe('SYNTH-SRC-2026-V1');
    expect(pkg.import_run_id).toBeDefined();
    expect(pkg.integrity_hash).toBeUndefined(); // Per-record integrity_hash removed
  });

  test('GET /api/official-support-routes returns generic informational card', async () => {
    const res = await request(app).get('/api/official-support-routes');
    expect(res.statusCode).toEqual(200);
    expect(res.body.informational_card).toContain('Information route shown; confirmation must occur through the relevant official process outside this prototype.');
  });

  test('GET /api/admin/analytics/summary returns operational telemetry', async () => {
    const res = await request(app).get('/api/admin/analytics/summary');
    expect(res.statusCode).toEqual(200);
    expect(res.body.total_sessions).toBeGreaterThanOrEqual(1);
    expect(res.body.completion_rate_percent).toBeDefined();
  });

  test('GET /api/admin/analytics/data-quality returns data quality audit ledger', async () => {
    const res = await request(app).get('/api/admin/analytics/data-quality');
    expect(res.statusCode).toEqual(200);
    expect(res.body.total_issues).toBeDefined();
    expect(Array.isArray(res.body.issues_by_severity)).toBe(true);
  });
});
