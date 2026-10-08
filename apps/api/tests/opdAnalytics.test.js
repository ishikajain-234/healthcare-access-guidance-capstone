const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('OPD Queue Analytics & M/M/c Benchmark Integration Tests', () => {
  const HOSP_ID = 'TEST_HOSP_ANALYTICS';
  const HOSP_FOREIGN = 'TEST_HOSP_FOREIGN';
  const DEPT_ID = 'TEST_DEPT_ANALYTICS';
  const DEPT_FOREIGN = 'TEST_DEPT_FOREIGN';

  beforeAll(async () => {
    // 1. Setup Parent Hospitals
    await db.query(`
      INSERT INTO hospital (hospital_id, hospital_code, hospital_name, city, is_simulated)
      VALUES 
        ($1, 'HOSP_AN_01', 'Analytics Test Facility', 'Delhi', TRUE),
        ($2, 'HOSP_AN_02', 'Foreign Test Facility', 'Delhi', TRUE)
      ON CONFLICT (hospital_id) DO NOTHING;
    `, [HOSP_ID, HOSP_FOREIGN]);

    // 2. Setup Departments
    await db.query(`
      INSERT INTO department (department_id, hospital_id, department_code, department_name, is_simulated)
      VALUES 
        ($1, $2, 'AN_MED', 'Analytics Internal Medicine', TRUE),
        ($3, $4, 'AN_ORT', 'Analytics Orthopedics', TRUE)
      ON CONFLICT (department_id) DO NOTHING;
    `, [DEPT_ID, HOSP_ID, DEPT_FOREIGN, HOSP_FOREIGN]);

    // 3. Setup 4 Active Counters + 1 Inactive Counter for DEPT_ID (c = 4)
    await db.query(`
      INSERT INTO opd_queue_counter (counter_id, hospital_id, department_id, counter_number, counter_name, is_active, is_simulated)
      VALUES 
        ('CTR_AN_01', $1, $2, 1, 'Counter 1 Active', TRUE, TRUE),
        ('CTR_AN_02', $1, $2, 2, 'Counter 2 Active', TRUE, TRUE),
        ('CTR_AN_03', $1, $2, 3, 'Counter 3 Active', TRUE, TRUE),
        ('CTR_AN_04', $1, $2, 4, 'Counter 4 Active', TRUE, TRUE),
        ('CTR_AN_05', $1, $2, 5, 'Counter 5 Inactive', FALSE, TRUE)
      ON CONFLICT (counter_id) DO NOTHING;
    `, [HOSP_ID, DEPT_ID]);

    // 4. Setup Seed Tokens with exact deterministic durations
    // Token 1: COMPLETED. Wait = 20 mins, Service = 10 mins
    await db.query(`
      INSERT INTO opd_token (
        token_id, hospital_id, department_id, counter_id, token_number, status,
        issued_at, called_at, service_started_at, service_completed_at, is_simulated
      ) VALUES (
        '11111111-1111-1111-1111-111111111111', $1, $2, 'CTR_AN_01', 'TK-AN-001', 'COMPLETED',
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '10 minutes',
        NOW(),
        TRUE
      );
    `, [HOSP_ID, DEPT_ID]);

    // Token 2: COMPLETED. Wait = 40 mins, Service = 10 mins
    await db.query(`
      INSERT INTO opd_token (
        token_id, hospital_id, department_id, counter_id, token_number, status,
        issued_at, called_at, service_started_at, service_completed_at, is_simulated
      ) VALUES (
        '22222222-2222-2222-2222-222222222222', $1, $2, 'CTR_AN_02', 'TK-AN-002', 'COMPLETED',
        NOW() - INTERVAL '50 minutes',
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '10 minutes',
        NOW(),
        TRUE
      );
    `, [HOSP_ID, DEPT_ID]);

    // Token 3: IN_SERVICE. Wait = 15 mins
    await db.query(`
      INSERT INTO opd_token (
        token_id, hospital_id, department_id, counter_id, token_number, status,
        issued_at, called_at, service_started_at, is_simulated
      ) VALUES (
        '33333333-3333-3333-3333-333333333333', $1, $2, 'CTR_AN_03', 'TK-AN-003', 'IN_SERVICE',
        NOW() - INTERVAL '25 minutes',
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '10 minutes',
        TRUE
      );
    `, [HOSP_ID, DEPT_ID]);

    // Token 4: WAITING
    await db.query(`
      INSERT INTO opd_token (
        token_id, hospital_id, department_id, token_number, status,
        issued_at, is_simulated
      ) VALUES (
        '44444444-4444-4444-4444-444444444444', $1, $2, 'TK-AN-004', 'WAITING',
        NOW() - INTERVAL '5 minutes',
        TRUE
      );
    `, [HOSP_ID, DEPT_ID]);

    // Token 5: CANCELLED
    await db.query(`
      INSERT INTO opd_token (
        token_id, hospital_id, department_id, token_number, status,
        issued_at, cancelled_at, is_simulated
      ) VALUES (
        '55555555-5555-5555-5555-555555555555', $1, $2, 'TK-AN-005', 'CANCELLED',
        NOW() - INTERVAL '40 minutes',
        NOW() - INTERVAL '35 minutes',
        TRUE
      );
    `, [HOSP_ID, DEPT_ID]);
  });

  afterAll(async () => {
    await db.query(`DELETE FROM opd_token WHERE hospital_id IN ($1, $2);`, [HOSP_ID, HOSP_FOREIGN]);
    await db.query(`DELETE FROM opd_queue_counter WHERE hospital_id IN ($1, $2);`, [HOSP_ID, HOSP_FOREIGN]);
    await db.query(`DELETE FROM department WHERE hospital_id IN ($1, $2);`, [HOSP_ID, HOSP_FOREIGN]);
    await db.query(`DELETE FROM hospital WHERE hospital_id IN ($1, $2);`, [HOSP_ID, HOSP_FOREIGN]);
    await db.pool.end();
  });

  // 1. Analytics endpoint succeeds
  test('1. GET /api/opd/analytics returns HTTP 200 with structured response', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    expect(res.body.scope).toBeDefined();
    expect(res.body.observed).toBeDefined();
    expect(res.body.mmc_benchmark).toBeDefined();
    expect(res.body.comparison).toBeDefined();
    expect(res.body.model_notice).toMatch(/M\/M\/c is a theoretical queueing benchmark/);
  });

  // 2. Correct token counts
  test('2. Correctly aggregates token counts across statuses', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    const obs = res.body.observed;
    expect(obs.total_tokens).toBe(5);
    expect(obs.waiting_tokens).toBe(1);
    expect(obs.serving_tokens).toBe(1);
    expect(obs.completed_tokens).toBe(2);
    expect(obs.cancelled_tokens).toBe(1);
  });

  // 3. Observed waiting time calculation
  test('3. Calculates observed waiting time: mean(service_started_at - issued_at)', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    // Token 1 wait = 20m, Token 2 wait = 40m, Token 3 wait = 15m.
    // Mean = (20 + 40 + 15) / 3 = 25.00 mins
    expect(res.body.observed.average_wait_minutes).toBeCloseTo(25.00, 0);
  });

  // 4. Observed service time calculation
  test('4. Calculates observed service time: mean(service_completed_at - service_started_at)', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    // Token 1 service = 10m, Token 2 service = 10m.
    // Mean = (10 + 10) / 2 = 10.00 mins
    expect(res.body.observed.average_service_minutes).toBeCloseTo(10.00, 0);
  });

  // 5. Active counter count (must exclude inactive counters)
  test('5. Queries active counters from opd_queue_counter (excludes is_active=false)', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    // 4 active counters seeded, 1 inactive counter
    expect(res.body.observed.active_counters).toBe(4);
    expect(res.body.mmc_benchmark.servers).toBe(4);
  });

  // 6. Default lambda and mu values (lambda=30, mu=8)
  test('6. Uses frozen default parameters lambda=30, mu=8 when omitted', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    expect(res.body.mmc_benchmark.lambda_per_hour).toBe(30);
    expect(res.body.mmc_benchmark.mu_per_counter_per_hour).toBe(8);
    expect(res.body.mmc_benchmark.rho).toBe(0.9375);
    expect(res.body.mmc_benchmark.wq_minutes).toBeCloseTo(25.95, 2);
  });

  // 7. Custom lambda and mu values
  test('7. Accepts valid custom lambda and mu parameters', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({
        hospital_id: HOSP_ID,
        department_id: DEPT_ID,
        lambda: 20,
        mu: 6,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.mmc_benchmark.lambda_per_hour).toBe(20);
    expect(res.body.mmc_benchmark.mu_per_counter_per_hour).toBe(6);
    // c=4, lambda=20, mu=6 -> rho = 20 / 24 = 0.8333
    expect(res.body.mmc_benchmark.rho).toBeCloseTo(0.8333, 4);
    expect(res.body.mmc_benchmark.stable).toBe(true);
  });

  // 8. Rejects invalid lambda (zero or negative)
  test('8. Rejects zero or negative lambda with HTTP 400', async () => {
    const resZero = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID, lambda: 0 });
    expect(resZero.statusCode).toBe(400);
    expect(resZero.body.error_code).toBe('UNSUPPORTED_INPUT');

    const resNeg = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID, lambda: -5 });
    expect(resNeg.statusCode).toBe(400);
    expect(resNeg.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  // 9. Rejects invalid mu (zero or negative)
  test('9. Rejects zero or negative mu with HTTP 400', async () => {
    const resZero = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID, mu: 0 });
    expect(resZero.statusCode).toBe(400);
    expect(resZero.body.error_code).toBe('UNSUPPORTED_INPUT');

    const resNeg = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID, mu: -8 });
    expect(resNeg.statusCode).toBe(400);
    expect(resNeg.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  // 10. Rejects unknown query parameters
  test('10. Rejects unknown query parameters with HTTP 400', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({
        hospital_id: HOSP_ID,
        department_id: DEPT_ID,
        unknown_filter: 'malicious_input',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  // 11. Rejects department/hospital mismatch
  test('11. Rejects department not belonging to hospital with HTTP 400', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({
        hospital_id: HOSP_ID,
        department_id: DEPT_FOREIGN, // belongs to HOSP_FOREIGN
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('DEPARTMENT_HOSPITAL_MISMATCH');
  });

  // 12. Theoretical values for c=4 benchmark
  test('12. Verifies theoretical values for baseline c=4 (rho=0.9375, wq=25.95 mins)', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    const mmc = res.body.mmc_benchmark;
    expect(mmc.servers).toBe(4);
    expect(mmc.rho).toBe(0.9375);
    expect(mmc.p0).toBeCloseTo(0.006561, 6);
    expect(mmc.p_wait).toBeCloseTo(0.865030, 5);
    expect(mmc.lq).toBeCloseTo(12.98, 2);
    expect(mmc.wq_minutes).toBeCloseTo(25.95, 2);
    expect(mmc.stable).toBe(true);
  });

  // 13. Unstable rho >= 1 handling
  test('13. Marks theoretical queue as unstable when arrival rate exceeds capacity (rho >= 1)', async () => {
    // With 4 counters and mu=8, capacity is 32. Provide lambda=40 -> rho = 40/32 = 1.25 >= 1
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({
        hospital_id: HOSP_ID,
        department_id: DEPT_ID,
        lambda: 40,
        mu: 8,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.mmc_benchmark.stable).toBe(false);
    expect(res.body.mmc_benchmark.rho).toBe(1.25);
    expect(res.body.mmc_benchmark.wq_minutes).toBeNull();
    expect(res.body.comparison.theoretical_wait_minutes).toBeNull();
    expect(res.body.comparison.wait_delta_minutes).toBeNull();
  });

  // 14. Observed vs theoretical delta calculation
  test('14. Computes observed_wait_minutes - theoretical_wait_minutes delta', async () => {
    const res = await request(app)
      .get('/api/opd/analytics')
      .query({ hospital_id: HOSP_ID, department_id: DEPT_ID });

    expect(res.statusCode).toBe(200);
    const comp = res.body.comparison;
    expect(typeof comp.observed_wait_minutes).toBe('number');
    expect(typeof comp.theoretical_wait_minutes).toBe('number');
    expect(comp.wait_delta_minutes).toBeCloseTo(
      comp.observed_wait_minutes - comp.theoretical_wait_minutes,
      2
    );
  });
});
