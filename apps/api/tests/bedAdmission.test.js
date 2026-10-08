const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Bed Availability & Inpatient Admission Coordination (PS-75)', () => {
  const HOSP_A = 'TEST_HOSP_ADM_A';
  const HOSP_B = 'TEST_HOSP_ADM_B';
  const HOSP_ZERO = 'TEST_HOSP_ZERO_BED';
  const WARD_A1 = 'TEST_WARD_A1_GEN';
  const WARD_A2 = 'TEST_WARD_A2_ICU';
  const WARD_B1 = 'TEST_WARD_B1_GEN';
  const DEPT_A = 'TEST_DEPT_ADM_A';
  const DEPT_B = 'TEST_DEPT_ADM_B';

  const BED_A1_01 = 'TEST_BED_A1_01';
  const BED_A1_02 = 'TEST_BED_A1_02';
  const BED_A1_03 = 'TEST_BED_A1_03';
  const BED_A1_04 = 'TEST_BED_A1_04';
  const BED_A2_01 = 'TEST_BED_A2_01';
  const BED_B1_01 = 'TEST_BED_B1_01';

  let opdTokenAId;
  let opdTokenBId;

  beforeAll(async () => {
    // 1. Setup Test Hospitals
    await db.query(`
      INSERT INTO hospital (hospital_id, hospital_code, hospital_name, city, is_simulated)
      VALUES
        ($1, 'HOSP_ADM_A_CODE', 'Admission Test Hospital A', 'Delhi', TRUE),
        ($2, 'HOSP_ADM_B_CODE', 'Admission Test Hospital B', 'Delhi', TRUE),
        ($3, 'HOSP_ZERO_CODE', 'Zero Bed Test Hospital', 'Delhi', TRUE)
      ON CONFLICT (hospital_id) DO NOTHING;
    `, [HOSP_A, HOSP_B, HOSP_ZERO]);

    // 2. Setup Departments
    await db.query(`
      INSERT INTO department (department_id, hospital_id, department_code, department_name, is_simulated)
      VALUES
        ($1, $2, 'DEPT_ADM_A', 'General Medicine A', TRUE),
        ($3, $4, 'DEPT_ADM_B', 'General Medicine B', TRUE)
      ON CONFLICT (department_id) DO NOTHING;
    `, [DEPT_A, HOSP_A, DEPT_B, HOSP_B]);

    // 3. Setup Wards
    await db.query(`
      INSERT INTO bed_ward (ward_id, hospital_id, ward_code, ward_name, ward_type, total_capacity, is_simulated)
      VALUES
        ($1, $2, 'GEN-A1', 'General Ward A1', 'GENERAL', 10, TRUE),
        ($3, $2, 'ICU-A2', 'ICU Ward A2', 'ICU', 5, TRUE),
        ($4, $5, 'GEN-B1', 'General Ward B1', 'GENERAL', 10, TRUE)
      ON CONFLICT (ward_id) DO NOTHING;
    `, [WARD_A1, HOSP_A, WARD_A2, WARD_B1, HOSP_B]);

    // 4. Setup Beds
    await db.query(`
      INSERT INTO bed (bed_id, hospital_id, ward_id, bed_number, current_state, is_simulated)
      VALUES
        ($1, $2, $3, 'A1-01', 'AVAILABLE', TRUE),
        ($4, $2, $3, 'A1-02', 'AVAILABLE', TRUE),
        ($5, $2, $3, 'A1-03', 'AVAILABLE', TRUE),
        ($6, $2, $3, 'A1-04', 'AVAILABLE', TRUE),
        ($7, $2, $8, 'A2-01', 'AVAILABLE', TRUE),
        ($9, $10, $11, 'B1-01', 'AVAILABLE', TRUE)
      ON CONFLICT (bed_id) DO NOTHING;
    `, [
      BED_A1_01, HOSP_A, WARD_A1,
      BED_A1_02,
      BED_A1_03,
      BED_A1_04,
      BED_A2_01, WARD_A2,
      BED_B1_01, HOSP_B, WARD_B1,
    ]);

    // 5. Setup OPD Tokens for linking
    const tokenARes = await db.query(`
      INSERT INTO opd_token (hospital_id, department_id, token_number, status, is_simulated)
      VALUES ($1, $2, 'TK-ADM-A01', 'WAITING', TRUE)
      RETURNING token_id;
    `, [HOSP_A, DEPT_A]);
    opdTokenAId = tokenARes.rows[0].token_id;

    const tokenBRes = await db.query(`
      INSERT INTO opd_token (hospital_id, department_id, token_number, status, is_simulated)
      VALUES ($1, $2, 'TK-ADM-B01', 'WAITING', TRUE)
      RETURNING token_id;
    `, [HOSP_B, DEPT_B]);
    opdTokenBId = tokenBRes.rows[0].token_id;
  });

  afterAll(async () => {
    await db.query(`DELETE FROM admission WHERE hospital_id IN ($1, $2, $3);`, [HOSP_A, HOSP_B, HOSP_ZERO]);
    await db.query(`DELETE FROM opd_token WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM bed WHERE hospital_id IN ($1, $2, $3);`, [HOSP_A, HOSP_B, HOSP_ZERO]);
    await db.query(`DELETE FROM bed_ward WHERE hospital_id IN ($1, $2, $3);`, [HOSP_A, HOSP_B, HOSP_ZERO]);
    await db.query(`DELETE FROM department WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM hospital WHERE hospital_id IN ($1, $2, $3);`, [HOSP_A, HOSP_B, HOSP_ZERO]);
    await db.pool.end();
  });

  // ----------------------------------------------------
  // SECTION 1: BED AVAILABILITY & DIRECT STATE MACHINE
  // ----------------------------------------------------

  // 1. List wards
  test('1. GET /api/hospitals/:hospitalId/wards returns list of wards', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_A}/wards`);
    expect(res.statusCode).toBe(200);
    expect(res.body.total_wards).toBe(2);
    expect(res.body.wards.map(w => w.ward_id)).toContain(WARD_A1);
    expect(res.body.wards.map(w => w.ward_id)).toContain(WARD_A2);
  });

  // 2. List beds
  test('2. GET /api/hospitals/:hospitalId/beds returns list of beds', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_A}/beds`);
    expect(res.statusCode).toBe(200);
    expect(res.body.total_beds).toBe(5);
    expect(Array.isArray(res.body.beds)).toBe(true);
  });

  // 3. Availability summary
  test('3. GET /api/hospitals/:hospitalId/beds/availability returns operational counts', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_A}/beds/availability`);
    expect(res.statusCode).toBe(200);
    expect(res.body.hospital_id).toBe(HOSP_A);
    expect(res.body.total_beds).toBe(5);
    expect(res.body.available_beds).toBe(5);
    expect(res.body.reserved_beds).toBe(0);
    expect(res.body.occupied_beds).toBe(0);
    expect(res.body.cleaning_beds).toBe(0);
    expect(res.body.out_of_service_beds).toBe(0);
    expect(res.body.occupancy_rate).toBe(0);
    expect(Array.isArray(res.body.ward_breakdown)).toBe(true);
  });

  // 4. AVAILABLE -> RESERVED
  test('4. POST /api/beds/:bedId/reserve transitions bed from AVAILABLE to RESERVED', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_01}/reserve`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.bed_id).toBe(BED_A1_01);
    expect(res.body.current_state).toBe('RESERVED');
  });

  // 5. RESERVED -> OCCUPIED
  test('5. POST /api/beds/:bedId/occupy transitions bed from RESERVED to OCCUPIED', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_01}/occupy`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.current_state).toBe('OCCUPIED');
  });

  // 6. OCCUPIED -> CLEANING
  test('6. POST /api/beds/:bedId/clean transitions bed from OCCUPIED to CLEANING', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_01}/clean`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.current_state).toBe('CLEANING');
  });

  // 7. CLEANING -> AVAILABLE
  test('7. POST /api/beds/:bedId/release transitions bed from CLEANING to AVAILABLE', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_01}/release`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.current_state).toBe('AVAILABLE');
  });

  // 8. AVAILABLE -> OUT_OF_SERVICE
  test('8. POST /api/beds/:bedId/out-of-service transitions bed from AVAILABLE to OUT_OF_SERVICE', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_02}/out-of-service`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.current_state).toBe('OUT_OF_SERVICE');
  });

  // 9. OUT_OF_SERVICE -> AVAILABLE
  test('9. POST /api/beds/:bedId/restore transitions bed from OUT_OF_SERVICE to AVAILABLE', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_02}/restore`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.current_state).toBe('AVAILABLE');
  });

  // 10. RESERVED -> AVAILABLE
  test('10. POST /api/beds/:bedId/release transitions bed from RESERVED to AVAILABLE', async () => {
    // First reserve BED_A1_03
    await request(app).post(`/api/beds/${BED_A1_03}/reserve`).send({});
    // Then release back to AVAILABLE
    const res = await request(app).post(`/api/beds/${BED_A1_03}/release`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.current_state).toBe('AVAILABLE');
  });

  // 11. Invalid bed state transition rejected
  test('11. Rejects invalid transition (AVAILABLE -> OCCUPIED directly) with HTTP 409', async () => {
    const res = await request(app).post(`/api/beds/${BED_A1_04}/occupy`).send({});
    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('INVALID_STATE_TRANSITION');
  });

  // 12. Nonexistent bed returns 404
  test('12. Rejects operation on nonexistent bed with HTTP 404', async () => {
    const res = await request(app).post('/api/beds/NONEXISTENT_BED/reserve').send({});
    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('BED_NOT_FOUND');
  });

  // 13. Cross-hospital bed query
  test('13. Querying beds for nonexistent hospital returns 404', async () => {
    const res = await request(app).get('/api/hospitals/NONEXISTENT_HOSP/beds');
    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('HOSPITAL_NOT_FOUND');
  });

  // 14. Occupancy rate calculation
  test('14. Correctly computes occupancy rate: occupied / total * 100', async () => {
    // Put BED_A1_04 in OCCUPIED state (AVAILABLE -> RESERVED -> OCCUPIED)
    await request(app).post(`/api/beds/${BED_A1_04}/reserve`).send({});
    await request(app).post(`/api/beds/${BED_A1_04}/occupy`).send({});

    const res = await request(app).get(`/api/hospitals/${HOSP_A}/beds/availability`);
    expect(res.statusCode).toBe(200);
    expect(res.body.occupied_beds).toBe(1);
    expect(res.body.total_beds).toBe(5);
    // 1 / 5 * 100 = 20.00%
    expect(res.body.occupancy_rate).toBe(20);

    // Clean and release BED_A1_04 back to AVAILABLE for subsequent tests
    await request(app).post(`/api/beds/${BED_A1_04}/clean`).send({});
    await request(app).post(`/api/beds/${BED_A1_04}/release`).send({});
  });

  // 15. Zero-bed hospital handling
  test('15. Zero-bed hospital returns total_beds=0 and occupancy_rate=0 without division by zero', async () => {
    const res = await request(app).get(`/api/hospitals/${HOSP_ZERO}/beds/availability`);
    expect(res.statusCode).toBe(200);
    expect(res.body.total_beds).toBe(0);
    expect(res.body.occupied_beds).toBe(0);
    expect(res.body.occupancy_rate).toBe(0);
  });

  // ----------------------------------------------------
  // SECTION 2: ADMISSION COORDINATION & BED ALLOCATION
  // ----------------------------------------------------

  let admission1Id;
  let admissionLinkedId;

  // 16. Create admission without OPD token
  test('16. POST /api/admissions creates an admission without OPD token', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .send({
        hospital_id: HOSP_A,
        ward_id: WARD_A1,
        notes: 'Direct emergency intake demo',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.admission_id).toBeDefined();
    expect(res.body.hospital_id).toBe(HOSP_A);
    expect(res.body.ward_id).toBe(WARD_A1);
    expect(res.body.bed_id).toBeNull();
    expect(res.body.linked_token_id).toBeNull();
    expect(res.body.status).toBe('ADMISSION_REQUESTED');
    expect(res.body.admission_number).toMatch(/^ADM-GEN-A1-\d{3}$/);

    admission1Id = res.body.admission_id;
  });

  // 17. Create admission linked to OPD token
  test('17. POST /api/admissions creates an admission linked to OPD token (0..1 bridge)', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .send({
        hospital_id: HOSP_A,
        ward_id: WARD_A1,
        linked_token_id: opdTokenAId,
        notes: 'Inpatient admission following outpatient referral',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.linked_token_id).toBe(opdTokenAId);
    expect(res.body.status).toBe('ADMISSION_REQUESTED');

    admissionLinkedId = res.body.admission_id;
  });

  // 18. ADMISSION_REQUESTED -> PENDING_REVIEW
  test('18. POST /api/admissions/:admissionId/pending-review transitions to PENDING_REVIEW', async () => {
    const res = await request(app)
      .post(`/api/admissions/${admission1Id}/pending-review`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('PENDING_REVIEW');
  });

  // 19. Assign valid bed (PENDING_REVIEW -> BED_ASSIGNED; bed AVAILABLE -> RESERVED)
  test('19. POST /api/admissions/:admissionId/assign-bed assigns bed and reserves it', async () => {
    const res = await request(app)
      .post(`/api/admissions/${admission1Id}/assign-bed`)
      .send({ bed_id: BED_A1_01 });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('BED_ASSIGNED');
    expect(res.body.bed_id).toBe(BED_A1_01);
    expect(res.body.assigned_at).toBeDefined();

    // Verify bed transitioned to RESERVED in database
    const bedCheck = await db.query(`SELECT current_state FROM bed WHERE bed_id = $1;`, [BED_A1_01]);
    expect(bedCheck.rows[0].current_state).toBe('RESERVED');
  });

  // 20. Reject wrong hospital bed
  test('20. Rejects assigning bed belonging to another hospital with HTTP 400', async () => {
    // Create new admission in Hospital A
    const admRes = await request(app)
      .post('/api/admissions')
      .send({ hospital_id: HOSP_A, ward_id: WARD_A1 });
    const admId = admRes.body.admission_id;

    await request(app).post(`/api/admissions/${admId}/pending-review`).send({});

    // Attempt to assign BED_B1_01 (which belongs to Hospital B)
    const res = await request(app)
      .post(`/api/admissions/${admId}/assign-bed`)
      .send({ bed_id: BED_B1_01 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('CROSS_HOSPITAL_OPERATION_PROHIBITED');
  });

  // 21. Reject wrong ward bed
  test('21. Rejects assigning bed belonging to another ward with HTTP 400', async () => {
    // Create new admission for WARD_A1
    const admRes = await request(app)
      .post('/api/admissions')
      .send({ hospital_id: HOSP_A, ward_id: WARD_A1 });
    const admId = admRes.body.admission_id;

    await request(app).post(`/api/admissions/${admId}/pending-review`).send({});

    // Attempt to assign BED_A2_01 (which belongs to WARD_A2 ICU)
    const res = await request(app)
      .post(`/api/admissions/${admId}/assign-bed`)
      .send({ bed_id: BED_A2_01 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('BED_WARD_MISMATCH');
  });

  // 22. Reject unavailable bed
  test('22. Rejects assigning bed that is already RESERVED or OCCUPIED with HTTP 409', async () => {
    // Create new admission in WARD_A1
    const admRes = await request(app)
      .post('/api/admissions')
      .send({ hospital_id: HOSP_A, ward_id: WARD_A1 });
    const admId = admRes.body.admission_id;

    await request(app).post(`/api/admissions/${admId}/pending-review`).send({});

    // BED_A1_01 is already RESERVED by admission1Id
    const res = await request(app)
      .post(`/api/admissions/${admId}/assign-bed`)
      .send({ bed_id: BED_A1_01 });

    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('BED_NOT_AVAILABLE');
  });

  // 23. Prevent duplicate active assignment
  test('23. Prevents duplicate active bed assignment with HTTP 409', async () => {
    const admRes = await request(app)
      .post('/api/admissions')
      .send({ hospital_id: HOSP_A, ward_id: WARD_A1 });
    const admId = admRes.body.admission_id;
    await request(app).post(`/api/admissions/${admId}/pending-review`).send({});

    // Attempt to assign BED_A1_01
    const res = await request(app)
      .post(`/api/admissions/${admId}/assign-bed`)
      .send({ bed_id: BED_A1_01 });

    expect(res.statusCode).toBe(409);
  });

  // 24. BED_ASSIGNED -> ADMISSION_CONFIRMED
  test('24. POST /api/admissions/:admissionId/confirm transitions to ADMISSION_CONFIRMED', async () => {
    const res = await request(app)
      .post(`/api/admissions/${admission1Id}/confirm`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ADMISSION_CONFIRMED');
  });

  // 25. ADMISSION_CONFIRMED -> ADMITTED (Bed transitions to OCCUPIED)
  test('25. POST /api/admissions/:admissionId/admit transitions to ADMITTED and bed to OCCUPIED', async () => {
    const res = await request(app)
      .post(`/api/admissions/${admission1Id}/admit`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ADMITTED');
    expect(res.body.admitted_at).toBeDefined();

    // Verify bed is now OCCUPIED
    const bedCheck = await db.query(`SELECT current_state FROM bed WHERE bed_id = $1;`, [BED_A1_01]);
    expect(bedCheck.rows[0].current_state).toBe('OCCUPIED');
  });

  // 26. ADMITTED -> DISCHARGED
  test('26. POST /api/admissions/:admissionId/discharge transitions to DISCHARGED', async () => {
    const res = await request(app)
      .post(`/api/admissions/${admission1Id}/discharge`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('DISCHARGED');
    expect(res.body.discharged_at).toBeDefined();
  });

  // 27. Discharge leaves bed in CLEANING (not immediately AVAILABLE)
  test('27. Discharging patient moves occupied bed into CLEANING state', async () => {
    const bedCheck = await db.query(`SELECT current_state FROM bed WHERE bed_id = $1;`, [BED_A1_01]);
    expect(bedCheck.rows[0].current_state).toBe('CLEANING');

    // Clean and release the bed back to AVAILABLE
    await request(app).post(`/api/beds/${BED_A1_01}/release`).send({});
    const bedCleanCheck = await db.query(`SELECT current_state FROM bed WHERE bed_id = $1;`, [BED_A1_01]);
    expect(bedCleanCheck.rows[0].current_state).toBe('AVAILABLE');
  });

  // 28. Invalid admission transition rejected
  test('28. Rejects invalid transition (e.g. ADMISSION_REQUESTED directly to ADMITTED) with HTTP 409', async () => {
    const admRes = await request(app)
      .post('/api/admissions')
      .send({ hospital_id: HOSP_A, ward_id: WARD_A1 });
    const freshAdmId = admRes.body.admission_id;

    const res = await request(app)
      .post(`/api/admissions/${freshAdmId}/admit`)
      .send({});

    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('INVALID_STATE_TRANSITION');
  });

  // 29. Cancel valid workflow and release reserved bed
  test('29. POST /api/admissions/:admissionId/cancel releases allocated bed back to AVAILABLE', async () => {
    // 1. Create admission and assign BED_A1_02
    const admRes = await request(app)
      .post('/api/admissions')
      .send({ hospital_id: HOSP_A, ward_id: WARD_A1 });
    const admId = admRes.body.admission_id;

    await request(app).post(`/api/admissions/${admId}/pending-review`).send({});
    await request(app).post(`/api/admissions/${admId}/assign-bed`).send({ bed_id: BED_A1_02 });

    // Bed is currently RESERVED
    const bedBefore = await db.query(`SELECT current_state FROM bed WHERE bed_id = $1;`, [BED_A1_02]);
    expect(bedBefore.rows[0].current_state).toBe('RESERVED');

    // 2. Cancel admission
    const cancelRes = await request(app)
      .post(`/api/admissions/${admId}/cancel`)
      .send({ reason: 'Patient family opted for home care' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.status).toBe('CANCELLED');
    expect(cancelRes.body.cancelled_at).toBeDefined();

    // Bed must be released back to AVAILABLE
    const bedAfter = await db.query(`SELECT current_state FROM bed WHERE bed_id = $1;`, [BED_A1_02]);
    expect(bedAfter.rows[0].current_state).toBe('AVAILABLE');
  });

  // 30. Invalid linked token returns 404
  test('30. Rejects non-existent linked OPD token with HTTP 404', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .send({
        hospital_id: HOSP_A,
        ward_id: WARD_A1,
        linked_token_id: '00000000-0000-0000-0000-000000000099',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('TOKEN_NOT_FOUND');
  });

  // 31. Cross-hospital linked token returns 400
  test('31. Rejects linked OPD token from different hospital with HTTP 400', async () => {
    // opdTokenBId belongs to HOSP_B, but admission is requested for HOSP_A
    const res = await request(app)
      .post('/api/admissions')
      .send({
        hospital_id: HOSP_A,
        ward_id: WARD_A1,
        linked_token_id: opdTokenBId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('CROSS_HOSPITAL_OPERATION_PROHIBITED');
  });
});
