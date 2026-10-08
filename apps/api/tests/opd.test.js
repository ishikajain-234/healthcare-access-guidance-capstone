const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('OPD Token Lifecycle & Hospital Management Integration Tests (PS-75)', () => {
  const HOSP_A = 'TEST_HOSP_ALPHA';
  const HOSP_B = 'TEST_HOSP_BETA';
  const DEPT_A1 = 'TEST_DEPT_MED_A1';
  const DEPT_A2 = 'TEST_DEPT_PED_A2';
  const DEPT_B1 = 'TEST_DEPT_ORT_B1';
  const CTR_A1 = 'TEST_CTR_A1_01';
  const CTR_A1_INACTIVE = 'TEST_CTR_A1_INACT';
  const CTR_B1 = 'TEST_CTR_B1_01';

  let testSessionId;
  let sampleTokenId;

  beforeAll(async () => {
    // 1. Seed Parent Hospitals
    await db.query(`
      INSERT INTO hospital (hospital_id, hospital_code, hospital_name, city, is_simulated)
      VALUES 
        ($1, 'HOSP_ALPHA_TEST', 'Test Hospital Alpha', 'Delhi', TRUE),
        ($2, 'HOSP_BETA_TEST', 'Test Hospital Beta', 'Delhi', TRUE)
      ON CONFLICT (hospital_id) DO NOTHING;
    `, [HOSP_A, HOSP_B]);

    // 2. Seed Departments
    await db.query(`
      INSERT INTO department (department_id, hospital_id, department_code, department_name, is_simulated)
      VALUES
        ($1, $2, 'GENMED', 'General Medicine Demo', TRUE),
        ($3, $2, 'PED', 'Pediatrics Demo', TRUE),
        ($4, $5, 'ORTHO', 'Orthopedics Demo', TRUE)
      ON CONFLICT (department_id) DO NOTHING;
    `, [DEPT_A1, HOSP_A, DEPT_A2, DEPT_B1, HOSP_B]);

    // 3. Seed Counters
    await db.query(`
      INSERT INTO opd_queue_counter (counter_id, hospital_id, department_id, counter_number, counter_name, is_active, is_simulated)
      VALUES
        ($1, $2, $3, 1, 'Counter 1 Demo', TRUE, TRUE),
        ($4, $2, $3, 2, 'Counter Inactive Demo', FALSE, TRUE),
        ($5, $6, $7, 1, 'Counter B1 Demo', TRUE, TRUE)
      ON CONFLICT (counter_id) DO NOTHING;
    `, [CTR_A1, HOSP_A, DEPT_A1, CTR_A1_INACTIVE, CTR_B1, HOSP_B, DEPT_B1]);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query(`DELETE FROM opd_token WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM opd_queue_counter WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM department WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM hospital WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.pool.end();
  });

  // 1. Hospital listing
  test('1. GET /api/hospitals returns hospital listing', async () => {
    const res = await request(app).get('/api/hospitals');
    expect(res.statusCode).toBe(200);
    expect(res.body.total_hospitals).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.hospitals)).toBe(true);

    const alpha = res.body.hospitals.find(h => h.hospital_id === HOSP_A);
    expect(alpha).toBeDefined();
    expect(alpha.hospital_name).toBe('Test Hospital Alpha');
    expect(alpha.is_simulated).toBe(true);
  });

  // 2. Department listing for a hospital
  test('2. GET /api/hospitals/:hospitalId/departments returns departments for valid hospital', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_A}/departments`);
    expect(res.statusCode).toBe(200);
    expect(res.body.hospital_id).toBe(HOSP_A);
    expect(res.body.total_departments).toBe(2);
    expect(Array.isArray(res.body.departments)).toBe(true);

    const depts = res.body.departments.map(d => d.department_id);
    expect(depts).toContain(DEPT_A1);
    expect(depts).toContain(DEPT_A2);
  });

  test('2b. GET /api/hospitals/:hospitalId/departments returns 404 for non-existent hospital', async () => {
    const res = await request(app).get('/api/hospitals/NON_EXISTENT_HOSP/departments');
    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('HOSPITAL_NOT_FOUND');
  });

  // 3. Valid token creation
  test('3. POST /api/opd/tokens creates an anonymous OPD token in WAITING state', async () => {
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.token_id).toBeDefined();
    expect(res.body.hospital_id).toBe(HOSP_A);
    expect(res.body.department_id).toBe(DEPT_A1);
    expect(res.body.status).toBe('WAITING');
    expect(res.body.counter_id).toBeNull();
    expect(res.body.token_number).toMatch(/^TK-GENMED-\d{3}$/);
    expect(res.body.issued_at).toBeDefined();
    expect(res.body.is_simulated).toBe(true);

    sampleTokenId = res.body.token_id;
  });

  // 4. Invalid hospital rejection
  test('4. POST /api/opd/tokens rejects non-existent hospital with HTTP 404', async () => {
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: 'NON_EXISTENT_HOSP',
        department_id: DEPT_A1,
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('HOSPITAL_NOT_FOUND');
  });

  // 5. Invalid department rejection
  test('5. POST /api/opd/tokens rejects non-existent department with HTTP 404', async () => {
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: 'NON_EXISTENT_DEPT',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('DEPARTMENT_NOT_FOUND');
  });

  // 6. Department/hospital mismatch rejection
  test('6. POST /api/opd/tokens rejects department belonging to a different hospital with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_B1, // belongs to HOSP_B
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('DEPARTMENT_HOSPITAL_MISMATCH');
  });

  // 7. WAITING → CALLED transition
  test('7. POST /api/opd/tokens/:tokenId/call transitions token from WAITING to CALLED', async () => {
    const res = await request(app)
      .post(`/api/opd/tokens/${sampleTokenId}/call`)
      .send({
        counter_id: CTR_A1,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token_id).toBe(sampleTokenId);
    expect(res.body.status).toBe('CALLED');
    expect(res.body.counter_id).toBe(CTR_A1);
    expect(res.body.called_at).toBeDefined();
  });

  // 8. CALLED → IN_SERVICE transition
  test('8. POST /api/opd/tokens/:tokenId/start transitions token from CALLED to IN_SERVICE', async () => {
    const res = await request(app)
      .post(`/api/opd/tokens/${sampleTokenId}/start`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.token_id).toBe(sampleTokenId);
    expect(res.body.status).toBe('IN_SERVICE');
    expect(res.body.service_started_at).toBeDefined();
  });

  // 9. IN_SERVICE → COMPLETED transition
  test('9. POST /api/opd/tokens/:tokenId/complete transitions token from IN_SERVICE to COMPLETED', async () => {
    const res = await request(app)
      .post(`/api/opd/tokens/${sampleTokenId}/complete`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.token_id).toBe(sampleTokenId);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.service_completed_at).toBeDefined();
  });

  // 10. WAITING → CANCELLED transition
  test('10. POST /api/opd/tokens/:tokenId/cancel transitions token from WAITING to CANCELLED', async () => {
    // Create new token in WAITING
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
      });
    expect(createRes.statusCode).toBe(201);
    const cancelTokenId = createRes.body.token_id;

    // Cancel token
    const res = await request(app)
      .post(`/api/opd/tokens/${cancelTokenId}/cancel`)
      .send({ reason: 'Citizen departed facility' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token_id).toBe(cancelTokenId);
    expect(res.body.status).toBe('CANCELLED');
    expect(res.body.cancelled_at).toBeDefined();
  });

  // 10b. CALLED → CANCELLED transition
  test('10b. POST /api/opd/tokens/:tokenId/cancel transitions token from CALLED to CANCELLED', async () => {
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_A, department_id: DEPT_A1 });
    expect(createRes.statusCode).toBe(201);
    const tokenId = createRes.body.token_id;

    await request(app)
      .post(`/api/opd/tokens/${tokenId}/call`)
      .send({ counter_id: CTR_A1 });

    const cancelRes = await request(app)
      .post(`/api/opd/tokens/${tokenId}/cancel`)
      .send({ reason: 'No-show after call chime' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.status).toBe('CANCELLED');
  });

  // 11. Invalid state transitions
  test('11. Rejects invalid state transitions with HTTP 409', async () => {
    // Create new token in WAITING state
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_A, department_id: DEPT_A1 });
    const freshTokenId = createRes.body.token_id;

    // Attempt WAITING -> IN_SERVICE (skipping CALLED)
    const invalidStartRes = await request(app)
      .post(`/api/opd/tokens/${freshTokenId}/start`)
      .send({});
    expect(invalidStartRes.statusCode).toBe(409);
    expect(invalidStartRes.body.error_code).toBe('INVALID_STATE_TRANSITION');

    // Attempt WAITING -> COMPLETED (skipping CALLED, IN_SERVICE)
    const invalidCompleteRes = await request(app)
      .post(`/api/opd/tokens/${freshTokenId}/complete`)
      .send({});
    expect(invalidCompleteRes.statusCode).toBe(409);
    expect(invalidCompleteRes.body.error_code).toBe('INVALID_STATE_TRANSITION');

    // Transition on already COMPLETED token (sampleTokenId)
    const completedCallRes = await request(app)
      .post(`/api/opd/tokens/${sampleTokenId}/call`)
      .send({ counter_id: CTR_A1 });
    expect(completedCallRes.statusCode).toBe(409);
    expect(completedCallRes.body.error_code).toBe('INVALID_STATE_TRANSITION');

    // Attempt cancel on already COMPLETED token
    const completedCancelRes = await request(app)
      .post(`/api/opd/tokens/${sampleTokenId}/cancel`)
      .send({});
    expect(completedCancelRes.statusCode).toBe(409);
    expect(completedCancelRes.body.error_code).toBe('INVALID_STATE_TRANSITION');
  });

  // 12. Missing / Invalid / Inactive counter
  test('12. Rejects missing counter_id with HTTP 400', async () => {
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_A, department_id: DEPT_A1 });
    const tokenId = createRes.body.token_id;

    const res = await request(app)
      .post(`/api/opd/tokens/${tokenId}/call`)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  test('12b. Rejects non-existent counter with HTTP 404', async () => {
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_A, department_id: DEPT_A1 });
    const tokenId = createRes.body.token_id;

    const res = await request(app)
      .post(`/api/opd/tokens/${tokenId}/call`)
      .send({ counter_id: 'NON_EXISTENT_CTR' });
    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('COUNTER_NOT_FOUND');
  });

  test('12c. Rejects inactive counter with HTTP 409', async () => {
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_A, department_id: DEPT_A1 });
    const tokenId = createRes.body.token_id;

    const res = await request(app)
      .post(`/api/opd/tokens/${tokenId}/call`)
      .send({ counter_id: CTR_A1_INACTIVE });
    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('INACTIVE_COUNTER');
  });

  // 13. Counter department mismatch
  test('13. Rejects counter belonging to different department/hospital with HTTP 400', async () => {
    const createRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_A, department_id: DEPT_A1 });
    const tokenId = createRes.body.token_id;

    // CTR_B1 belongs to Hospital B / Department B1
    const res = await request(app)
      .post(`/api/opd/tokens/${tokenId}/call`)
      .send({ counter_id: CTR_B1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('CROSS_HOSPITAL_OPERATION_PROHIBITED');
  });

  // 14. Cross-hospital operation
  test('14. Cross-hospital token creation rejected when department is from another hospital', async () => {
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_B,
        department_id: DEPT_A1, // belongs to HOSP_A
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('DEPARTMENT_HOSPITAL_MISMATCH');
  });

  // 15. Linked guidance session token creation
  test('15. POST /api/opd/tokens links an anonymous guidance session (0..1 bridge)', async () => {
    // 1. Create a guidance session
    const sessionRes = await request(app)
      .post('/api/guidance/sessions')
      .send({});
    expect(sessionRes.statusCode).toBe(201);
    testSessionId = sessionRes.body.session_id;

    // 2. Create token referencing session
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
        linked_session_id: testSessionId,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.linked_session_id).toBe(testSessionId);
  });

  // 16. Duplicate linked guidance session rejection
  test('16. Rejects duplicate token creation for same linked guidance session with HTTP 409', async () => {
    const res = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
        linked_session_id: testSessionId,
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('DUPLICATE_LINKED_SESSION');
  });

  // 17. Rejects prohibited PII and clinical diagnosis fields
  test('17. Rejects prohibited identity and clinical fields with HTTP 400 UNSUPPORTED_INPUT', async () => {
    const resName = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
        name: 'Ramesh Kumar',
      });
    expect(resName.statusCode).toBe(400);
    expect(resName.body.error_code).toBe('UNSUPPORTED_INPUT');

    const resSymptom = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
        symptoms: 'chest pain',
      });
    expect(resSymptom.statusCode).toBe(400);
    expect(resSymptom.body.error_code).toBe('UNSUPPORTED_INPUT');

    const resAadhaar = await request(app)
      .post('/api/opd/tokens')
      .send({
        hospital_id: HOSP_A,
        department_id: DEPT_A1,
        aadhaar: '123456789012',
      });
    expect(resAadhaar.statusCode).toBe(400);
    expect(resAadhaar.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  // 18. Queue inspection & FIFO ordering
  test('18. GET /api/opd/tokens lists tokens ordered by FIFO issued_at', async () => {
    const res = await request(app)
      .get('/api/opd/tokens')
      .query({ department_id: DEPT_A1, status: 'WAITING' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tokens)).toBe(true);

    // Verify FIFO ordering
    for (let i = 1; i < res.body.tokens.length; i++) {
      const prevDate = new Date(res.body.tokens[i - 1].issued_at);
      const currDate = new Date(res.body.tokens[i].issued_at);
      expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
    }
  });
});
