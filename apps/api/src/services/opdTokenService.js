const db = require('../db');
const { OPD_TOKEN_STATES, isValidOpdTransition } = require('../constants/opdStateMachine');

class OpdTokenService {
  /**
   * Creates an anonymous OPD token in WAITING status.
   * Handles POST /api/opd/tokens
   */
  async createToken({ hospital_id, department_id, linked_session_id, priority_level = 0 }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validate hospital exists
      const hospRes = await client.query(
        `SELECT hospital_id, hospital_code FROM hospital WHERE hospital_id = $1;`,
        [hospital_id]
      );
      if (hospRes.rows.length === 0) {
        const error = new Error(`Hospital '${hospital_id}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'HOSPITAL_NOT_FOUND';
        throw error;
      }

      // 2. Validate department belongs to hospital
      const deptRes = await client.query(
        `SELECT department_id, department_code FROM department WHERE hospital_id = $1 AND department_id = $2;`,
        [hospital_id, department_id]
      );
      if (deptRes.rows.length === 0) {
        // Check if department exists under a different hospital
        const anyDeptRes = await client.query(
          `SELECT hospital_id FROM department WHERE department_id = $1;`,
          [department_id]
        );
        if (anyDeptRes.rows.length > 0) {
          const error = new Error(`Department '${department_id}' does not belong to hospital '${hospital_id}'.`);
          error.statusCode = 400;
          error.errorCode = 'DEPARTMENT_HOSPITAL_MISMATCH';
          throw error;
        } else {
          const error = new Error(`Department '${department_id}' not found.`);
          error.statusCode = 404;
          error.errorCode = 'DEPARTMENT_NOT_FOUND';
          throw error;
        }
      }
      const dept = deptRes.rows[0];

      // 3. Validate optional linked_session_id
      if (linked_session_id) {
        const sessionRes = await client.query(
          `SELECT session_id, current_state FROM guidance_session WHERE session_id = $1;`,
          [linked_session_id]
        );
        if (sessionRes.rows.length === 0) {
          const error = new Error(`Guidance session '${linked_session_id}' not found.`);
          error.statusCode = 404;
          error.errorCode = 'SESSION_NOT_FOUND';
          throw error;
        }

        // Check if session is already linked to another token
        const existingLinkRes = await client.query(
          `SELECT token_id, token_number FROM opd_token WHERE linked_session_id = $1;`,
          [linked_session_id]
        );
        if (existingLinkRes.rows.length > 0) {
          const error = new Error(`Guidance session '${linked_session_id}' is already linked to an OPD token.`);
          error.statusCode = 409;
          error.errorCode = 'DUPLICATE_LINKED_SESSION';
          throw error;
        }
      }

      // 4. Generate safe synthetic token number within hospital/department context
      const countRes = await client.query(
        `SELECT COUNT(*) + 1 AS next_seq FROM opd_token WHERE department_id = $1;`,
        [department_id]
      );
      const nextSeq = countRes.rows[0].next_seq;
      const deptCodeClean = dept.department_code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const tokenNumber = `TK-${deptCodeClean}-${String(nextSeq).padStart(3, '0')}`;

      // 5. Insert token in WAITING status (counter_id is NULL)
      const insertRes = await client.query(
        `INSERT INTO opd_token (
          hospital_id, department_id, counter_id, linked_session_id,
          token_number, status, priority_level, issued_at, is_simulated
        ) VALUES ($1, $2, NULL, $3, $4, $5, $6, NOW(), TRUE)
        RETURNING token_id, hospital_id, department_id, counter_id, linked_session_id,
                  token_number, status, priority_level, issued_at, called_at,
                  service_started_at, service_completed_at, cancelled_at, is_simulated, created_at;`,
        [
          hospital_id,
          department_id,
          linked_session_id || null,
          tokenNumber,
          OPD_TOKEN_STATES.WAITING,
          priority_level,
        ]
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
   * Lists OPD tokens with optional filters (hospital, department, status, counter).
   * FIFO ordering by issued_at represents the logical department queue when status = 'WAITING'.
   * Handles GET /api/opd/tokens
   */
  async listTokens(filters = {}) {
    const conditions = [];
    const values = [];

    if (filters.hospital_id) {
      values.push(filters.hospital_id);
      conditions.push(`hospital_id = $${values.length}`);
    }

    if (filters.department_id) {
      values.push(filters.department_id);
      conditions.push(`department_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }

    if (filters.counter_id) {
      values.push(filters.counter_id);
      conditions.push(`counter_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT token_id, hospital_id, department_id, counter_id, linked_session_id,
             token_number, status, priority_level, issued_at, called_at,
             service_started_at, service_completed_at, cancelled_at, is_simulated, created_at
      FROM opd_token
      ${whereClause}
      ORDER BY issued_at ASC;
    `;

    const result = await db.query(queryText, values);
    return {
      total_tokens: result.rows.length,
      tokens: result.rows,
    };
  }

  /**
   * Calls a WAITING token to a counter.
   * Transition: WAITING -> CALLED
   * Handles POST /api/opd/tokens/:tokenId/call
   */
  async callToken(tokenId, { counter_id }) {
    if (!counter_id) {
      const error = new Error('counter_id is required to call a token.');
      error.statusCode = 400;
      error.errorCode = 'MISSING_COUNTER';
      throw error;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock token row
      const tokenRes = await client.query(
        `SELECT * FROM opd_token WHERE token_id = $1 FOR UPDATE;`,
        [tokenId]
      );
      if (tokenRes.rows.length === 0) {
        const error = new Error(`OPD token '${tokenId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'TOKEN_NOT_FOUND';
        throw error;
      }
      const token = tokenRes.rows[0];

      // 2. Validate state transition
      if (!isValidOpdTransition(token.status, OPD_TOKEN_STATES.CALLED)) {
        const error = new Error(
          `Invalid state transition: Cannot call token with status '${token.status}'. Must be '${OPD_TOKEN_STATES.WAITING}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      // 3. Validate counter existence and department hierarchy
      const counterRes = await client.query(
        `SELECT counter_id, department_id, hospital_id, is_active FROM opd_queue_counter WHERE counter_id = $1;`,
        [counter_id]
      );
      if (counterRes.rows.length === 0) {
        const error = new Error(`Queue counter '${counter_id}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'COUNTER_NOT_FOUND';
        throw error;
      }
      const counter = counterRes.rows[0];

      // Check cross-hospital match
      if (counter.hospital_id !== token.hospital_id) {
        const error = new Error(
          `Cross-hospital operation prohibited: Counter belongs to hospital '${counter.hospital_id}', but token is for hospital '${token.hospital_id}'.`
        );
        error.statusCode = 400;
        error.errorCode = 'CROSS_HOSPITAL_OPERATION_PROHIBITED';
        throw error;
      }

      // Check department match
      if (counter.department_id !== token.department_id) {
        const error = new Error(
          `Counter department mismatch: Counter belongs to department '${counter.department_id}', but token is for department '${token.department_id}'.`
        );
        error.statusCode = 400;
        error.errorCode = 'COUNTER_DEPARTMENT_MISMATCH';
        throw error;
      }

      // Check counter active status
      if (!counter.is_active) {
        const error = new Error(`Counter '${counter_id}' is currently inactive and cannot serve tokens.`);
        error.statusCode = 409;
        error.errorCode = 'INACTIVE_COUNTER';
        throw error;
      }

      // 4. Update token to CALLED
      const updateRes = await client.query(
        `UPDATE opd_token
         SET status = $1,
             counter_id = $2,
             called_at = NOW()
         WHERE token_id = $3
         RETURNING token_id, hospital_id, department_id, counter_id, linked_session_id,
                   token_number, status, priority_level, issued_at, called_at,
                   service_started_at, service_completed_at, cancelled_at, is_simulated, created_at;`,
        [OPD_TOKEN_STATES.CALLED, counter_id, tokenId]
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
   * Starts service for a CALLED token.
   * Transition: CALLED -> IN_SERVICE
   * Handles POST /api/opd/tokens/:tokenId/start
   */
  async startService(tokenId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT * FROM opd_token WHERE token_id = $1 FOR UPDATE;`,
        [tokenId]
      );
      if (tokenRes.rows.length === 0) {
        const error = new Error(`OPD token '${tokenId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'TOKEN_NOT_FOUND';
        throw error;
      }
      const token = tokenRes.rows[0];

      if (!isValidOpdTransition(token.status, OPD_TOKEN_STATES.IN_SERVICE)) {
        const error = new Error(
          `Invalid state transition: Cannot start service for token with status '${token.status}'. Must be '${OPD_TOKEN_STATES.CALLED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE opd_token
         SET status = $1,
             service_started_at = NOW()
         WHERE token_id = $2
         RETURNING token_id, hospital_id, department_id, counter_id, linked_session_id,
                   token_number, status, priority_level, issued_at, called_at,
                   service_started_at, service_completed_at, cancelled_at, is_simulated, created_at;`,
        [OPD_TOKEN_STATES.IN_SERVICE, tokenId]
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
   * Completes service for an IN_SERVICE token.
   * Transition: IN_SERVICE -> COMPLETED
   * Handles POST /api/opd/tokens/:tokenId/complete
   */
  async completeService(tokenId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT * FROM opd_token WHERE token_id = $1 FOR UPDATE;`,
        [tokenId]
      );
      if (tokenRes.rows.length === 0) {
        const error = new Error(`OPD token '${tokenId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'TOKEN_NOT_FOUND';
        throw error;
      }
      const token = tokenRes.rows[0];

      if (!isValidOpdTransition(token.status, OPD_TOKEN_STATES.COMPLETED)) {
        const error = new Error(
          `Invalid state transition: Cannot complete token with status '${token.status}'. Must be '${OPD_TOKEN_STATES.IN_SERVICE}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE opd_token
         SET status = $1,
             service_completed_at = NOW()
         WHERE token_id = $2
         RETURNING token_id, hospital_id, department_id, counter_id, linked_session_id,
                   token_number, status, priority_level, issued_at, called_at,
                   service_started_at, service_completed_at, cancelled_at, is_simulated, created_at;`,
        [OPD_TOKEN_STATES.COMPLETED, tokenId]
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
   * Cancels a token from WAITING or CALLED state.
   * Transitions: WAITING -> CANCELLED, CALLED -> CANCELLED
   * Handles POST /api/opd/tokens/:tokenId/cancel
   */
  async cancelToken(tokenId, { reason } = {}) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const tokenRes = await client.query(
        `SELECT * FROM opd_token WHERE token_id = $1 FOR UPDATE;`,
        [tokenId]
      );
      if (tokenRes.rows.length === 0) {
        const error = new Error(`OPD token '${tokenId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'TOKEN_NOT_FOUND';
        throw error;
      }
      const token = tokenRes.rows[0];

      if (!isValidOpdTransition(token.status, OPD_TOKEN_STATES.CANCELLED)) {
        const error = new Error(
          `Invalid state transition: Cannot cancel token with status '${token.status}'. Allowed only from '${OPD_TOKEN_STATES.WAITING}' or '${OPD_TOKEN_STATES.CALLED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE opd_token
         SET status = $1,
             cancelled_at = NOW()
         WHERE token_id = $2
         RETURNING token_id, hospital_id, department_id, counter_id, linked_session_id,
                   token_number, status, priority_level, issued_at, called_at,
                   service_started_at, service_completed_at, cancelled_at, is_simulated, created_at;`,
        [OPD_TOKEN_STATES.CANCELLED, tokenId]
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

module.exports = new OpdTokenService();
