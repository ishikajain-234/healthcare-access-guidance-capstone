const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Inventory Management Backend Vertical Slice (PS-75)', () => {
  const HOSP_A = 'TEST_HOSP_INV_A';
  const HOSP_B = 'TEST_HOSP_INV_B';
  const DEPT_A = 'TEST_DEPT_INV_A';
  const DEPT_B = 'TEST_DEPT_INV_B';

  const ITEM_A1 = 'TEST_ITEM_A1_MED';
  const ITEM_A2 = 'TEST_ITEM_A2_MED';
  const ITEM_A3 = 'TEST_ITEM_A3_CON';
  const ITEM_A4 = 'TEST_ITEM_A4_CON';
  const ITEM_B1 = 'TEST_ITEM_B1_MED';

  let opdTokenAId;
  let opdTokenBId;

  beforeAll(async () => {
    // 0. Ensure clean slate for test hospitals
    await db.query(`ALTER TABLE inventory_transaction DISABLE TRIGGER trg_prevent_inventory_transaction_mutation;`);
    await db.query(`DELETE FROM inventory_transaction WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`ALTER TABLE inventory_transaction ENABLE TRIGGER trg_prevent_inventory_transaction_mutation;`);
    await db.query(`DELETE FROM inventory_item WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM opd_token WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM department WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    await db.query(`DELETE FROM hospital WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);

    // 1. Setup Test Hospitals
    await db.query(`
      INSERT INTO hospital (hospital_id, hospital_code, hospital_name, city, is_simulated)
      VALUES
        ($1, 'HOSP_INV_A_CODE', 'Inventory Test Hospital A', 'Delhi', TRUE),
        ($2, 'HOSP_INV_B_CODE', 'Inventory Test Hospital B', 'Delhi', TRUE)
      ON CONFLICT (hospital_id) DO NOTHING;
    `, [HOSP_A, HOSP_B]);

    // 2. Setup Test Departments
    await db.query(`
      INSERT INTO department (department_id, hospital_id, department_code, department_name, is_simulated)
      VALUES
        ($1, $2, 'DEPT_INV_A', 'General Medicine Inv A', TRUE),
        ($3, $4, 'DEPT_INV_B', 'General Medicine Inv B', TRUE)
      ON CONFLICT (department_id) DO NOTHING;
    `, [DEPT_A, HOSP_A, DEPT_B, HOSP_B]);

    // 3. Setup OPD Tokens
    const tokenARes = await db.query(`
      INSERT INTO opd_token (hospital_id, department_id, token_number, status, is_simulated)
      VALUES ($1, $2, 'TK-INV-A01', 'WAITING', TRUE)
      RETURNING token_id;
    `, [HOSP_A, DEPT_A]);
    opdTokenAId = tokenARes.rows[0].token_id;

    const tokenBRes = await db.query(`
      INSERT INTO opd_token (hospital_id, department_id, token_number, status, is_simulated)
      VALUES ($1, $2, 'TK-INV-B01', 'WAITING', TRUE)
      RETURNING token_id;
    `, [HOSP_B, DEPT_B]);
    opdTokenBId = tokenBRes.rows[0].token_id;

    // 4. Setup Synthetic Inventory Items
    // ITEM_A1: 100 stock, 50 threshold -> IN_STOCK
    // ITEM_A2: 30 stock, 50 threshold -> LOW_STOCK
    // ITEM_A3: 0 stock, 20 threshold -> OUT_OF_STOCK
    // ITEM_A4: 200 stock, 100 threshold -> IN_STOCK (for transaction tests)
    // ITEM_B1: 50 stock, 20 threshold -> IN_STOCK (Hospital B)
    await db.query(`
      INSERT INTO inventory_item (
        item_id, hospital_id, item_code, item_name, item_type, unit_of_measure,
        current_stock, reorder_threshold, reorder_quantity, is_active, is_simulated
      ) VALUES
        ($1, $2, 'CODE_INV_A1', 'Synthetic Test Med Alpha', 'MEDICINE', 'TABLET', 100, 50, 200, TRUE, TRUE),
        ($3, $2, 'CODE_INV_A2', 'Synthetic Test Med Beta', 'MEDICINE', 'VIAL', 30, 50, 100, TRUE, TRUE),
        ($4, $2, 'CODE_INV_A3', 'Synthetic Test Consumable Gamma', 'CONSUMABLE', 'BOX', 0, 20, 50, TRUE, TRUE),
        ($5, $2, 'CODE_INV_A4', 'Synthetic Test Consumable Delta', 'CONSUMABLE', 'PIECE', 200, 100, 300, TRUE, TRUE),
        ($6, $7, 'CODE_INV_B1', 'Synthetic Test Med Hosp B', 'MEDICINE', 'TABLET', 50, 20, 100, TRUE, TRUE)
      ON CONFLICT (item_id) DO NOTHING;
    `, [
      ITEM_A1, HOSP_A,
      ITEM_A2,
      ITEM_A3,
      ITEM_A4,
      ITEM_B1, HOSP_B,
    ]);
  });

  afterAll(async () => {
    try {
      await db.query(`ALTER TABLE inventory_transaction DISABLE TRIGGER trg_prevent_inventory_transaction_mutation;`);
      await db.query(`DELETE FROM inventory_transaction WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
      await db.query(`ALTER TABLE inventory_transaction ENABLE TRIGGER trg_prevent_inventory_transaction_mutation;`);
      await db.query(`DELETE FROM inventory_item WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
      await db.query(`DELETE FROM opd_token WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
      await db.query(`DELETE FROM department WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
      await db.query(`DELETE FROM hospital WHERE hospital_id IN ($1, $2);`, [HOSP_A, HOSP_B]);
    } finally {
      await db.pool.end();
    }
  });

  // 1. List inventory items
  test('1. GET /api/inventory/items lists items with stock_status computation', async () => {
    const res = await request(app)
      .get('/api/inventory/items')
      .query({ hospital_id: HOSP_A });

    expect(res.statusCode).toBe(200);
    expect(res.body.total_items).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(res.body.items)).toBe(true);

    const a1 = res.body.items.find((i) => i.item_id === ITEM_A1);
    expect(a1).toBeDefined();
    expect(a1.item_code).toBe('CODE_INV_A1');
    expect(a1.current_stock).toBe(100);
    expect(a1.stock_status).toBe('IN_STOCK');
  });

  // 2. Get individual item
  test('2. GET /api/inventory/items/:itemId returns item details', async () => {
    const res = await request(app).get(`/api/inventory/items/${ITEM_A1}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.item_id).toBe(ITEM_A1);
    expect(res.body.hospital_id).toBe(HOSP_A);
    expect(res.body.item_type).toBe('MEDICINE');
    expect(res.body.stock_status).toBe('IN_STOCK');
  });

  // 3. Availability summary
  test('3. GET /api/inventory/availability returns aggregated stock counts', async () => {
    const res = await request(app)
      .get('/api/inventory/availability')
      .query({ hospital_id: HOSP_A });

    expect(res.statusCode).toBe(200);
    expect(res.body.hospital_id).toBe(HOSP_A);
    expect(res.body.total_items).toBe(4);
    expect(res.body.in_stock_items).toBe(2); // A1 (100) and A4 (200)
    expect(res.body.low_stock_items).toBe(1); // A2 (30 <= 50)
    expect(res.body.out_of_stock_items).toBe(1); // A3 (0)
  });

  // 4. RECEIPT increases stock
  test('4. POST /api/inventory/items/:itemId/receive increases stock by quantity', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/receive`)
      .send({
        quantity: 50,
        batch_number: 'BATCH-REC-01',
        audit_reason: 'Routine warehouse shipment arrival',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.item.current_stock).toBe(150); // 100 + 50
    expect(res.body.item.previous_stock).toBe(100);
    expect(res.body.transaction.transaction_type).toBe('RECEIPT');
    expect(res.body.transaction.quantity).toBe(50);
  });

  // 5. ISSUE decreases stock
  test('5. POST /api/inventory/items/:itemId/issue decreases stock by quantity', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 30,
        batch_number: 'BATCH-REC-01',
        audit_reason: 'Dispensary distribution to inpatient ward',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.item.current_stock).toBe(120); // 150 - 30
    expect(res.body.transaction.transaction_type).toBe('ISSUE');
    expect(res.body.transaction.quantity).toBe(30);
  });

  // 6. ISSUE cannot create negative stock
  test('6. POST /api/inventory/items/:itemId/issue rejects excessive reduction with HTTP 409 NEGATIVE_STOCK', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 9999, // Way more than 120
        audit_reason: 'Excessive requested issue',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('NEGATIVE_STOCK');
  });

  // 7. ADJUSTMENT positive
  test('7. POST /api/inventory/items/:itemId/adjust with positive quantity increases stock', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A4}/adjust`)
      .send({
        adjustment_quantity: 25,
        audit_reason: 'Physical inventory audit found uncounted boxes',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.item.current_stock).toBe(225); // 200 + 25
    expect(res.body.transaction.transaction_type).toBe('ADJUSTMENT');
    expect(res.body.transaction.quantity).toBe(25);
  });

  // 8. ADJUSTMENT negative
  test('8. POST /api/inventory/items/:itemId/adjust with negative quantity decreases stock', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A4}/adjust`)
      .send({
        adjustment_quantity: -15,
        audit_reason: 'Damaged packaging removed from shelf',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.item.current_stock).toBe(210); // 225 - 15
    expect(res.body.transaction.transaction_type).toBe('ADJUSTMENT');
    expect(res.body.transaction.quantity).toBe(15); // DB stores positive quantity
  });

  // 9. Negative adjustment cannot create negative stock
  test('9. POST /api/inventory/items/:itemId/adjust rejects negative adjustment exceeding stock with HTTP 409', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A4}/adjust`)
      .send({
        adjustment_quantity: -500, // Stock is 210
        audit_reason: 'Excessive negative write-off',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.error_code).toBe('NEGATIVE_STOCK');
  });

  // 10. TRANSFER_IN increases stock
  test('10. POST /api/inventory/items/:itemId/transfer-in increases stock by quantity', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A4}/transfer-in`)
      .send({
        quantity: 40,
        audit_reason: 'Inter-facility transfer received from regional store',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.item.current_stock).toBe(250); // 210 + 40
    expect(res.body.transaction.transaction_type).toBe('TRANSFER_IN');
    expect(res.body.transaction.quantity).toBe(40);
  });

  // 11. TRANSFER_OUT decreases stock
  test('11. POST /api/inventory/items/:itemId/transfer-out decreases stock by quantity', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A4}/transfer-out`)
      .send({
        quantity: 50,
        audit_reason: 'Dispatching emergency stock to community clinic',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.item.current_stock).toBe(200); // 250 - 50
    expect(res.body.transaction.transaction_type).toBe('TRANSFER_OUT');
    expect(res.body.transaction.quantity).toBe(50);
  });

  // 12. Transaction appears in ledger
  test('12. GET /api/inventory/transactions returns committed transactions in ledger', async () => {
    const res = await request(app)
      .get('/api/inventory/transactions')
      .query({ hospital_id: HOSP_A });

    expect(res.statusCode).toBe(200);
    expect(res.body.total_transactions).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.transactions[0].created_at).toBeDefined();
  });

  // 13. Transaction cannot be updated (DB trigger verification)
  test('13. Database trigger prevents UPDATE on inventory_transaction (append-only)', async () => {
    const txRow = await db.query(
      `SELECT transaction_id FROM inventory_transaction WHERE hospital_id = $1 LIMIT 1;`,
      [HOSP_A]
    );
    expect(txRow.rows.length).toBe(1);
    const txId = txRow.rows[0].transaction_id;

    await expect(
      db.query(`UPDATE inventory_transaction SET quantity = 999 WHERE transaction_id = $1;`, [txId])
    ).rejects.toThrow(/append-only: UPDATE and DELETE operations are strictly prohibited/);
  });

  // 14. Transaction cannot be deleted (DB trigger verification)
  test('14. Database trigger prevents DELETE on inventory_transaction (append-only)', async () => {
    const txRow = await db.query(
      `SELECT transaction_id FROM inventory_transaction WHERE hospital_id = $1 LIMIT 1;`,
      [HOSP_A]
    );
    expect(txRow.rows.length).toBe(1);
    const txId = txRow.rows[0].transaction_id;

    await expect(
      db.query(`DELETE FROM inventory_transaction WHERE transaction_id = $1;`, [txId])
    ).rejects.toThrow(/append-only: UPDATE and DELETE operations are strictly prohibited/);
  });

  // 15. Audit reason required
  test('15. Rejects transaction when audit_reason is missing or too short with HTTP 400', async () => {
    const resMissing = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/receive`)
      .send({
        quantity: 10,
      });
    expect(resMissing.statusCode).toBe(400);

    const resTooShort = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/receive`)
      .send({
        quantity: 10,
        audit_reason: 'ab', // < 3 characters
      });
    expect(resTooShort.statusCode).toBe(400);
  });

  // 16. Nonexistent item returns HTTP 404
  test('16. Operation on nonexistent item returns HTTP 404 ITEM_NOT_FOUND', async () => {
    const res = await request(app)
      .post('/api/inventory/items/NON_EXISTENT_ITEM/receive')
      .send({
        quantity: 10,
        audit_reason: 'Attempt on nonexistent item',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('ITEM_NOT_FOUND');
  });

  // 17. Hospital mismatch in query
  test('17. GET /api/inventory/availability for nonexistent hospital returns HTTP 404 HOSPITAL_NOT_FOUND', async () => {
    const res = await request(app)
      .get('/api/inventory/availability')
      .query({ hospital_id: 'NON_EXISTENT_HOSP' });

    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('HOSPITAL_NOT_FOUND');
  });

  // 18. Linked OPD token works
  test('18. ISSUE with valid linked OPD token from same hospital succeeds and persists token_id', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 5,
        linked_token_id: opdTokenAId,
        audit_reason: 'Medication dispensed following outpatient consult',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.transaction.linked_token_id).toBe(opdTokenAId);
  });

  // 19. Invalid linked token
  test('19. ISSUE with nonexistent linked OPD token returns HTTP 404 TOKEN_NOT_FOUND', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 5,
        linked_token_id: '00000000-0000-0000-0000-000000000999',
        audit_reason: 'Dispense attempt with ghost token',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error_code).toBe('TOKEN_NOT_FOUND');
  });

  // 20. Cross-hospital linked token rejected
  test('20. ISSUE with linked token from different hospital returns HTTP 400 CROSS_HOSPITAL_OPERATION_PROHIBITED', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 5,
        linked_token_id: opdTokenBId, // Belongs to HOSP_B, item is in HOSP_A
        audit_reason: 'Cross hospital link attempt',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('CROSS_HOSPITAL_OPERATION_PROHIBITED');
  });

  // 21. Zero quantity rejected
  test('21. Rejects zero quantity with HTTP 400', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/receive`)
      .send({
        quantity: 0,
        audit_reason: 'Zero quantity attempt',
      });

    expect(res.statusCode).toBe(400);
  });

  // 22. Negative quantity on receive rejected
  test('22. Rejects negative quantity on receive with HTTP 400', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/receive`)
      .send({
        quantity: -10,
        audit_reason: 'Negative quantity attempt',
      });

    expect(res.statusCode).toBe(400);
  });

  // 23. Unknown fields rejected
  test('23. Rejects unknown/unvalidated fields with HTTP 400 UNSUPPORTED_INPUT', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/receive`)
      .send({
        quantity: 10,
        audit_reason: 'Valid audit reason',
        malicious_field: 'injection_attempt',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  // 24. Prohibited PII rejected
  test('24. Rejects prohibited PII and clinical diagnosis fields with HTTP 400 UNSUPPORTED_INPUT', async () => {
    const resName = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 5,
        audit_reason: 'Dispense with patient name',
        patient_name: 'Anita Sharma',
      });
    expect(resName.statusCode).toBe(400);
    expect(resName.body.error_code).toBe('UNSUPPORTED_INPUT');

    const resAadhaar = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 5,
        audit_reason: 'Dispense with aadhaar',
        aadhaar: '987654321012',
      });
    expect(resAadhaar.statusCode).toBe(400);
    expect(resAadhaar.body.error_code).toBe('UNSUPPORTED_INPUT');

    const resDiag = await request(app)
      .post(`/api/inventory/items/${ITEM_A1}/issue`)
      .send({
        quantity: 5,
        audit_reason: 'Dispense with diagnosis',
        diagnosis: 'Hypertension',
      });
    expect(resDiag.statusCode).toBe(400);
    expect(resDiag.body.error_code).toBe('UNSUPPORTED_INPUT');
  });

  // 25. Concurrent issue operations cannot produce negative stock
  test('25. Concurrent issue operations cannot produce negative stock', async () => {
    // Current stock of ITEM_A2 is 30.
    // Fire two concurrent requests each trying to issue 20 (total requested: 40 > 30).
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/inventory/items/${ITEM_A2}/issue`)
        .send({
          quantity: 20,
          audit_reason: 'Concurrent issue request 1',
        }),
      request(app)
        .post(`/api/inventory/items/${ITEM_A2}/issue`)
        .send({
          quantity: 20,
          audit_reason: 'Concurrent issue request 2',
        }),
    ]);

    // Exactly one must succeed (200) and the other must be rejected with 409 NEGATIVE_STOCK
    const statuses = [res1.statusCode, res2.statusCode].sort();
    expect(statuses).toEqual([200, 409]);

    const failedRes = res1.statusCode === 409 ? res1 : res2;
    expect(failedRes.body.error_code).toBe('NEGATIVE_STOCK');

    // Final stock must be 30 - 20 = 10 (never negative)
    const checkRes = await request(app).get(`/api/inventory/items/${ITEM_A2}`);
    expect(checkRes.body.current_stock).toBe(10);
  });

  // 26. Low-stock status calculation
  test('26. Correctly computes LOW_STOCK when 0 < current_stock <= reorder_threshold', async () => {
    // ITEM_A2 now has 10 stock, threshold is 50 -> LOW_STOCK
    const res = await request(app).get(`/api/inventory/items/${ITEM_A2}`);
    expect(res.body.current_stock).toBe(10);
    expect(res.body.reorder_threshold).toBe(50);
    expect(res.body.stock_status).toBe('LOW_STOCK');
  });

  // 27. Out-of-stock status calculation
  test('27. Correctly computes OUT_OF_STOCK when current_stock === 0', async () => {
    // ITEM_A3 has 0 stock -> OUT_OF_STOCK
    const res = await request(app).get(`/api/inventory/items/${ITEM_A3}`);
    expect(res.body.current_stock).toBe(0);
    expect(res.body.stock_status).toBe('OUT_OF_STOCK');
  });
});
