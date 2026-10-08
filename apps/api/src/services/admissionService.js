const db = require('../db');
const { ADMISSION_STATES, isValidAdmissionTransition } = require('../constants/admissionStateMachine');
const { BED_STATES } = require('../constants/bedStateMachine');

class AdmissionService {
  /**
   * Creates an admission request in ADMISSION_REQUESTED status.
   * Handles POST /api/admissions
   */
  async createAdmission({ hospital_id, ward_id, linked_token_id = null, notes = null }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify hospital existence
      const hospRes = await client.query(
        `SELECT hospital_id, hospital_name FROM hospital WHERE hospital_id = $1;`,
        [hospital_id]
      );
      if (hospRes.rows.length === 0) {
        const error = new Error(`Hospital '${hospital_id}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'HOSPITAL_NOT_FOUND';
        throw error;
      }

      // 2. Verify ward belongs to hospital
      const wardRes = await client.query(
        `SELECT ward_id, ward_code, ward_name FROM bed_ward WHERE hospital_id = $1 AND ward_id = $2;`,
        [hospital_id, ward_id]
      );
      if (wardRes.rows.length === 0) {
        const anyWardRes = await client.query(
          `SELECT hospital_id FROM bed_ward WHERE ward_id = $1;`,
          [ward_id]
        );
        if (anyWardRes.rows.length > 0) {
          const error = new Error(`Ward '${ward_id}' does not belong to hospital '${hospital_id}'.`);
          error.statusCode = 400;
          error.errorCode = 'WARD_HOSPITAL_MISMATCH';
          throw error;
        } else {
          const error = new Error(`Ward '${ward_id}' not found.`);
          error.statusCode = 404;
          error.errorCode = 'WARD_NOT_FOUND';
          throw error;
        }
      }
      const ward = wardRes.rows[0];

      // 3. Optional linked OPD token validation (0..1 bridge)
      if (linked_token_id) {
        const tokenRes = await client.query(
          `SELECT token_id, hospital_id FROM opd_token WHERE token_id = $1;`,
          [linked_token_id]
        );
        if (tokenRes.rows.length === 0) {
          const error = new Error(`OPD Token '${linked_token_id}' not found.`);
          error.statusCode = 404;
          error.errorCode = 'TOKEN_NOT_FOUND';
          throw error;
        }

        const token = tokenRes.rows[0];
        if (token.hospital_id !== hospital_id) {
          const error = new Error(
            `Cross-hospital operation prohibited: Linked OPD token belongs to hospital '${token.hospital_id}', but admission is for hospital '${hospital_id}'.`
          );
          error.statusCode = 400;
          error.errorCode = 'CROSS_HOSPITAL_OPERATION_PROHIBITED';
          throw error;
        }

        const existingLinkRes = await client.query(
          `SELECT admission_id FROM admission WHERE linked_token_id = $1;`,
          [linked_token_id]
        );
        if (existingLinkRes.rows.length > 0) {
          const error = new Error(`OPD Token '${linked_token_id}' is already linked to an admission.`);
          error.statusCode = 409;
          error.errorCode = 'DUPLICATE_LINKED_TOKEN';
          throw error;
        }
      }

      // 4. Generate safe synthetic admission number
      const countRes = await client.query(
        `SELECT COUNT(*) + 1 AS next_seq FROM admission WHERE ward_id = $1;`,
        [ward_id]
      );
      const nextSeq = countRes.rows[0].next_seq;
      const wardCodeClean = ward.ward_code.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
      const admissionNumber = `ADM-${wardCodeClean}-${String(nextSeq).padStart(3, '0')}`;

      // 5. Insert admission row in ADMISSION_REQUESTED status
      const insertRes = await client.query(
        `INSERT INTO admission (
          hospital_id, ward_id, bed_id, linked_token_id, admission_number,
          status, requested_at, notes, is_simulated
        ) VALUES (
          $1, $2, NULL, $3, $4,
          'ADMISSION_REQUESTED', NOW(), $5, TRUE
        )
        RETURNING admission_id, hospital_id, ward_id, bed_id, linked_token_id,
                  admission_number, status, requested_at, assigned_at, admitted_at,
                  discharged_at, cancelled_at, notes, is_simulated, created_at;`,
        [hospital_id, ward_id, linked_token_id || null, admissionNumber, notes || null]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Lists admissions with optional filters.
   * Handles GET /api/admissions
   */
  async listAdmissions(filters = {}) {
    const conditions = [];
    const values = [];

    if (filters.hospital_id) {
      values.push(filters.hospital_id);
      conditions.push(`hospital_id = $${values.length}`);
    }

    if (filters.ward_id) {
      values.push(filters.ward_id);
      conditions.push(`ward_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT admission_id, hospital_id, ward_id, bed_id, linked_token_id,
             admission_number, status, requested_at, assigned_at, admitted_at,
             discharged_at, cancelled_at, notes, is_simulated, created_at
      FROM admission
      ${whereClause}
      ORDER BY requested_at DESC;
    `;

    const result = await db.query(queryText, values);
    return {
      total_admissions: result.rows.length,
      admissions: result.rows,
    };
  }

  /**
   * Retrieves admission by ID.
   * Handles GET /api/admissions/:admissionId
   */
  async getAdmissionById(admissionId) {
    const result = await db.query(
      `SELECT admission_id, hospital_id, ward_id, bed_id, linked_token_id,
              admission_number, status, requested_at, assigned_at, admitted_at,
              discharged_at, cancelled_at, notes, is_simulated, created_at
       FROM admission
       WHERE admission_id = $1;`,
      [admissionId]
    );

    if (result.rows.length === 0) {
      const error = new Error(`Admission '${admissionId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'ADMISSION_NOT_FOUND';
      throw error;
    }

    return result.rows[0];
  }

  /**
   * Advances admission to PENDING_REVIEW status.
   * Transition: ADMISSION_REQUESTED -> PENDING_REVIEW
   * Handles POST /api/admissions/:admissionId/pending-review
   */
  async markPendingReview(admissionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const admRes = await client.query(
        `SELECT * FROM admission WHERE admission_id = $1 FOR UPDATE;`,
        [admissionId]
      );
      if (admRes.rows.length === 0) {
        const error = new Error(`Admission '${admissionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ADMISSION_NOT_FOUND';
        throw error;
      }
      const adm = admRes.rows[0];

      if (!isValidAdmissionTransition(adm.status, ADMISSION_STATES.PENDING_REVIEW)) {
        const error = new Error(
          `Invalid admission state transition: Cannot mark pending review from status '${adm.status}'. Must be '${ADMISSION_STATES.ADMISSION_REQUESTED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE admission
         SET status = $1
         WHERE admission_id = $2
         RETURNING *;`,
        [ADMISSION_STATES.PENDING_REVIEW, admissionId]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Assigns an available bed to an admission under operational review.
   * Transition: PENDING_REVIEW -> BED_ASSIGNED
   * Bed Transition: AVAILABLE -> RESERVED
   * Handles POST /api/admissions/:admissionId/assign-bed
   */
  async assignBed(admissionId, { bed_id }) {
    if (!bed_id) {
      const error = new Error('bed_id is required for bed assignment.');
      error.statusCode = 400;
      error.errorCode = 'MISSING_BED_ID';
      throw error;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock admission row
      const admRes = await client.query(
        `SELECT * FROM admission WHERE admission_id = $1 FOR UPDATE;`,
        [admissionId]
      );
      if (admRes.rows.length === 0) {
        const error = new Error(`Admission '${admissionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ADMISSION_NOT_FOUND';
        throw error;
      }
      const adm = admRes.rows[0];

      if (!isValidAdmissionTransition(adm.status, ADMISSION_STATES.BED_ASSIGNED)) {
        const error = new Error(
          `Invalid admission state transition: Cannot assign bed to admission with status '${adm.status}'. Must be '${ADMISSION_STATES.PENDING_REVIEW}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      // 2. Lock bed row
      const bedRes = await client.query(
        `SELECT * FROM bed WHERE bed_id = $1 FOR UPDATE;`,
        [bed_id]
      );
      if (bedRes.rows.length === 0) {
        const error = new Error(`Bed '${bed_id}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'BED_NOT_FOUND';
        throw error;
      }
      const bed = bedRes.rows[0];

      // 3. Referential & Hierarchy Validations
      if (bed.hospital_id !== adm.hospital_id) {
        const error = new Error(
          `Cross-hospital operation prohibited: Bed belongs to hospital '${bed.hospital_id}', but admission is for hospital '${adm.hospital_id}'.`
        );
        error.statusCode = 400;
        error.errorCode = 'CROSS_HOSPITAL_OPERATION_PROHIBITED';
        throw error;
      }

      if (bed.ward_id !== adm.ward_id) {
        const error = new Error(
          `Bed ward mismatch: Bed belongs to ward '${bed.ward_id}', but admission is for ward '${adm.ward_id}'.`
        );
        error.statusCode = 400;
        error.errorCode = 'BED_WARD_MISMATCH';
        throw error;
      }

      // 4. Availability Check
      if (bed.current_state !== BED_STATES.AVAILABLE) {
        const error = new Error(
          `Bed is not available: Bed '${bed_id}' currently has status '${bed.current_state}' and cannot be assigned.`
        );
        error.statusCode = 409;
        error.errorCode = 'BED_NOT_AVAILABLE';
        throw error;
      }

      // 5. Duplicate Active Assignment Check
      const activeAdmRes = await client.query(
        `SELECT admission_id FROM admission
         WHERE bed_id = $1
           AND status IN ('BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED');`,
        [bed_id]
      );
      if (activeAdmRes.rows.length > 0) {
        const error = new Error(
          `Bed '${bed_id}' is already assigned to another active admission.`
        );
        error.statusCode = 409;
        error.errorCode = 'BED_ALREADY_ASSIGNED';
        throw error;
      }

      // 6. Transition Bed: AVAILABLE -> RESERVED
      await client.query(
        `UPDATE bed
         SET current_state = $1
         WHERE bed_id = $2;`,
        [BED_STATES.RESERVED, bed_id]
      );

      // 7. Transition Admission: PENDING_REVIEW -> BED_ASSIGNED
      const updateAdmRes = await client.query(
        `UPDATE admission
         SET status = $1,
             bed_id = $2,
             assigned_at = NOW()
         WHERE admission_id = $3
         RETURNING *;`,
        [ADMISSION_STATES.BED_ASSIGNED, bed_id, admissionId]
      );

      await client.query('COMMIT');
      return updateAdmRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirms admission details.
   * Transition: BED_ASSIGNED -> ADMISSION_CONFIRMED
   * Handles POST /api/admissions/:admissionId/confirm
   */
  async confirmAdmission(admissionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const admRes = await client.query(
        `SELECT * FROM admission WHERE admission_id = $1 FOR UPDATE;`,
        [admissionId]
      );
      if (admRes.rows.length === 0) {
        const error = new Error(`Admission '${admissionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ADMISSION_NOT_FOUND';
        throw error;
      }
      const adm = admRes.rows[0];

      if (!isValidAdmissionTransition(adm.status, ADMISSION_STATES.ADMISSION_CONFIRMED)) {
        const error = new Error(
          `Invalid admission state transition: Cannot confirm admission with status '${adm.status}'. Must be '${ADMISSION_STATES.BED_ASSIGNED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE admission
         SET status = $1
         WHERE admission_id = $2
         RETURNING *;`,
        [ADMISSION_STATES.ADMISSION_CONFIRMED, admissionId]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Officially admits patient into the hospital.
   * Transition: ADMISSION_CONFIRMED -> ADMITTED
   * Bed Transition: RESERVED -> OCCUPIED
   * Handles POST /api/admissions/:admissionId/admit
   */
  async admitPatient(admissionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const admRes = await client.query(
        `SELECT * FROM admission WHERE admission_id = $1 FOR UPDATE;`,
        [admissionId]
      );
      if (admRes.rows.length === 0) {
        const error = new Error(`Admission '${admissionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ADMISSION_NOT_FOUND';
        throw error;
      }
      const adm = admRes.rows[0];

      if (!isValidAdmissionTransition(adm.status, ADMISSION_STATES.ADMITTED)) {
        const error = new Error(
          `Invalid admission state transition: Cannot admit patient with status '${adm.status}'. Must be '${ADMISSION_STATES.ADMISSION_CONFIRMED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      // Lock bed row and transition to OCCUPIED
      const bedRes = await client.query(
        `SELECT * FROM bed WHERE bed_id = $1 FOR UPDATE;`,
        [adm.bed_id]
      );
      if (bedRes.rows.length === 0) {
        const error = new Error(`Allocated bed '${adm.bed_id}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'BED_NOT_FOUND';
        throw error;
      }

      await client.query(
        `UPDATE bed
         SET current_state = $1
         WHERE bed_id = $2;`,
        [BED_STATES.OCCUPIED, adm.bed_id]
      );

      const updateRes = await client.query(
        `UPDATE admission
         SET status = $1,
             admitted_at = NOW()
         WHERE admission_id = $2
         RETURNING *;`,
        [ADMISSION_STATES.ADMITTED, admissionId]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Discharges patient and transitions bed to CLEANING.
   * Transition: ADMITTED -> DISCHARGED
   * Bed Transition: OCCUPIED -> CLEANING (does NOT immediately mark AVAILABLE)
   * Handles POST /api/admissions/:admissionId/discharge
   */
  async dischargePatient(admissionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const admRes = await client.query(
        `SELECT * FROM admission WHERE admission_id = $1 FOR UPDATE;`,
        [admissionId]
      );
      if (admRes.rows.length === 0) {
        const error = new Error(`Admission '${admissionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ADMISSION_NOT_FOUND';
        throw error;
      }
      const adm = admRes.rows[0];

      if (!isValidAdmissionTransition(adm.status, ADMISSION_STATES.DISCHARGED)) {
        const error = new Error(
          `Invalid admission state transition: Cannot discharge patient with status '${adm.status}'. Must be '${ADMISSION_STATES.ADMITTED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      // Move occupied bed into CLEANING state
      if (adm.bed_id) {
        await client.query(
          `SELECT * FROM bed WHERE bed_id = $1 FOR UPDATE;`,
          [adm.bed_id]
        );

        await client.query(
          `UPDATE bed
           SET current_state = $1
           WHERE bed_id = $2;`,
          [BED_STATES.CLEANING, adm.bed_id]
        );
      }

      const updateRes = await client.query(
        `UPDATE admission
         SET status = $1,
             discharged_at = NOW()
         WHERE admission_id = $2
         RETURNING *;`,
        [ADMISSION_STATES.DISCHARGED, admissionId]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancels admission workflow. Releases allocated bed back to AVAILABLE if currently RESERVED.
   * Handles POST /api/admissions/:admissionId/cancel
   */
  async cancelAdmission(admissionId, { reason } = {}) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const admRes = await client.query(
        `SELECT * FROM admission WHERE admission_id = $1 FOR UPDATE;`,
        [admissionId]
      );
      if (admRes.rows.length === 0) {
        const error = new Error(`Admission '${admissionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'ADMISSION_NOT_FOUND';
        throw error;
      }
      const adm = admRes.rows[0];

      if (!isValidAdmissionTransition(adm.status, ADMISSION_STATES.CANCELLED)) {
        const error = new Error(
          `Invalid admission state transition: Cannot cancel admission with status '${adm.status}'. Allowed only before admission confirmation/intake.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      // If a bed was reserved for this admission, release it back to AVAILABLE
      if (adm.bed_id) {
        const bedRes = await client.query(
          `SELECT * FROM bed WHERE bed_id = $1 FOR UPDATE;`,
          [adm.bed_id]
        );
        if (bedRes.rows.length > 0 && bedRes.rows[0].current_state === BED_STATES.RESERVED) {
          await client.query(
            `UPDATE bed
             SET current_state = $1
             WHERE bed_id = $2;`,
            [BED_STATES.AVAILABLE, adm.bed_id]
          );
        }
      }

      const updateRes = await client.query(
        `UPDATE admission
         SET status = $1,
             cancelled_at = NOW()
         WHERE admission_id = $2
         RETURNING *;`,
        [ADMISSION_STATES.CANCELLED, admissionId]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new AdmissionService();
