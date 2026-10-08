const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Staff Operations Console - Backend API Integration Suite', () => {
  const HOSP_ID = 'HOSP_LNJP';
  const DEPT_ID = 'DEPT_LNJP_GEN';
  let createdTokenId = null;

  afterAll(async () => {
    if (createdTokenId) {
      await db.query(`DELETE FROM opd_token WHERE token_id = $1;`, [createdTokenId]);
    }
    await db.pool.end();
  });

  test('1. GET /api/hospitals returns registered facilities for console selector', async () => {
    const res = await request(app).get('/api/hospitals');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.hospitals)).toBe(true);
    expect(res.body.hospitals.length).toBeGreaterThan(0);

    const hosp = res.body.hospitals.find((h) => h.hospital_id === HOSP_ID);
    expect(hosp).toBeDefined();
    expect(hosp.is_simulated).toBe(true);
  });

  test('2. GET /api/hospitals/:hospitalId/departments returns department choices', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_ID}/departments`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.departments)).toBe(true);
    expect(res.body.departments.length).toBeGreaterThan(0);

    const dept = res.body.departments.find((d) => d.department_id === DEPT_ID);
    expect(dept).toBeDefined();
    expect(dept.department_code).toBe('GEN_MED');
  });

  test('3. GET /api/hospitals/:hospitalId/beds/availability returns finite-state bed summary & ICU', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_ID}/beds/availability`);
    expect(res.status).toBe(200);

    const data = res.body;
    expect(data.hospital_id).toBe(HOSP_ID);
    expect(data.total_beds).toBeGreaterThan(0);
    expect(data.available_beds).toBeDefined();
    expect(data.reserved_beds).toBeDefined();
    expect(data.occupied_beds).toBeDefined();
    expect(data.cleaning_beds).toBeDefined();
    expect(data.out_of_service_beds).toBeDefined();
    expect(typeof data.occupancy_rate).toBe('number');
    expect(Array.isArray(data.ward_breakdown)).toBe(true);
  });

  test('4. GET /api/inventory/availability returns stock status and reorder alerts', async () => {
    const res = await request(app).get(`/api/inventory/availability?hospital_id=${HOSP_ID}`);
    expect(res.status).toBe(200);

    const data = res.body;
    expect(data.hospital_id).toBe(HOSP_ID);
    expect(typeof data.total_items).toBe('number');
    expect(typeof data.in_stock_items).toBe('number');
    expect(typeof data.low_stock_items).toBe('number');
    expect(typeof data.out_of_stock_items).toBe('number');
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('5. GET /api/admissions returns inpatient pipeline list', async () => {
    const res = await request(app).get(`/api/admissions?hospital_id=${HOSP_ID}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total_admissions).toBe('number');
    expect(Array.isArray(res.body.admissions)).toBe(true);
  });

  test('6. GET /api/opd/tokens returns outpatient queue tokens filtered by department', async () => {
    const res = await request(app).get(`/api/opd/tokens?hospital_id=${HOSP_ID}&department_id=${DEPT_ID}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total_tokens).toBe('number');
    expect(Array.isArray(res.body.tokens)).toBe(true);
  });

  test('7. GET /api/opd/analytics returns active counters, observed wait, and M/M/c reference model', async () => {
    const res = await request(app).get(`/api/opd/analytics?hospital_id=${HOSP_ID}&department_id=${DEPT_ID}`);
    expect(res.status).toBe(200);

    const data = res.body;
    expect(data.scope.hospital_id).toBe(HOSP_ID);
    expect(data.scope.department_id).toBe(DEPT_ID);

    // Observed metrics
    expect(typeof data.observed.total_tokens).toBe('number');
    expect(typeof data.observed.waiting_tokens).toBe('number');
    expect(typeof data.observed.serving_tokens).toBe('number');
    expect(typeof data.observed.active_counters).toBe('number');
    expect(typeof data.observed.average_wait_minutes).toBe('number');
    expect(typeof data.observed.average_service_minutes).toBe('number');

    // M/M/c theoretical benchmark
    expect(data.mmc_benchmark).toBeDefined();
    expect(data.mmc_benchmark.servers).toBeDefined();
    expect(typeof data.mmc_benchmark.stable).toBe('boolean');
    expect(typeof data.mmc_benchmark.rho).toBe('number');
    expect(data.model_notice).toMatch(/M\/M\/c is a theoretical queueing benchmark/);

    // Comparison
    expect(data.comparison).toBeDefined();
    expect(typeof data.comparison.observed_wait_minutes).toBe('number');
  });

  test('8. End-to-end token creation and queue lifecycle integration', async () => {
    // 1. Issue a demonstration token
    const tokenRes = await request(app)
      .post('/api/opd/tokens')
      .send({ hospital_id: HOSP_ID, department_id: DEPT_ID, priority_level: 0 });
    expect(tokenRes.status).toBe(201);
    createdTokenId = tokenRes.body.token_id;
    expect(createdTokenId).toBeDefined();
    expect(tokenRes.body.status).toBe('WAITING');

    // 2. Query queue: should show token in WAITING
    const listRes = await request(app).get(`/api/opd/tokens?hospital_id=${HOSP_ID}&department_id=${DEPT_ID}&status=WAITING`);
    expect(listRes.status).toBe(200);
    const inQueue = listRes.body.tokens.find((t) => t.token_id === createdTokenId);
    expect(inQueue).toBeDefined();

    // 3. Call token to counter CTR_LNJP_G1
    const callRes = await request(app)
      .post(`/api/opd/tokens/${createdTokenId}/call`)
      .send({ counter_id: 'CTR_LNJP_G1' });
    expect(callRes.status).toBe(200);
    expect(callRes.body.status).toBe('CALLED');

    // 4. Start service
    const startRes = await request(app)
      .post(`/api/opd/tokens/${createdTokenId}/start`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe('IN_SERVICE');

    // 5. Complete service
    const completeRes = await request(app)
      .post(`/api/opd/tokens/${createdTokenId}/complete`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe('COMPLETED');
  });
});
