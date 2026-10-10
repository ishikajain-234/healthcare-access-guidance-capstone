const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('City Aggregate Snapshot API Integration Suite (Table #17)', () => {
  afterAll(async () => {
    await db.pool.end();
  });

  test('1. GET /api/city/overview returns latest municipal rollup and facility breakdowns', async () => {
    const res = await request(app).get('/api/city/overview');
    expect(res.status).toBe(200);
    expect(res.body.is_simulated).toBe(true);
    expect(res.body.data_confidence_notice).toBeDefined();

    if (res.body.status === 'POPULATED') {
      expect(res.body.city_totals).toBeDefined();
      expect(res.body.city_totals.aggregate_level).toBe('CITY');
      expect(res.body.city_totals.total_beds).toBeGreaterThan(0);
      expect(Array.isArray(res.body.hospitals)).toBe(true);
      expect(res.body.hospitals.length).toBeGreaterThanOrEqual(2);

      // Verify that hospital-level records are included
      const lnjp = res.body.hospitals.find((h) => h.hospital_id === 'HOSP_LNJP');
      expect(lnjp).toBeDefined();
      expect(lnjp.aggregate_level).toBe('HOSPITAL');
    }
  });

  test('2. GET /api/city/snapshots lists historical snapshots with level filtering', async () => {
    const res = await request(app)
      .get('/api/city/snapshots')
      .query({ level: 'HOSPITAL', limit: 10 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.snapshots)).toBe(true);

    for (const snap of res.body.snapshots) {
      expect(snap.aggregate_level).toBe('HOSPITAL');
      expect(snap.hospital_id).toBeDefined();
    }
  });

  test('3. GET /api/city/snapshots filters by hospital_id', async () => {
    const res = await request(app)
      .get('/api/city/snapshots')
      .query({ hospital_id: 'HOSP_LNJP', limit: 5 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.snapshots)).toBe(true);

    for (const snap of res.body.snapshots) {
      expect(snap.hospital_id).toBe('HOSP_LNJP');
    }
  });

  test('4. GET /api/city/snapshots rejects unknown query parameter with HTTP 400', async () => {
    const res = await request(app)
      .get('/api/city/snapshots')
      .query({ unknown_key: 'malicious_input' });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  test('5. GET /api/city/snapshots rejects invalid level enum with HTTP 400', async () => {
    const res = await request(app)
      .get('/api/city/snapshots')
      .query({ level: 'INVALID_LEVEL' });

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_INPUT');
  });
});
