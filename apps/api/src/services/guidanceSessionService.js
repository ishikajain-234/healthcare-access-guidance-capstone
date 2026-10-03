const db = require('../db');
const { STATES, EVENT_TYPES, isValidTransition } = require('../constants/stateMachine');

class GuidanceSessionService {
  /**
   * Creates an anonymous guidance session and records the initial GUIDANCE_STARTED event.
   * Handles POST /api/guidance/sessions
   */
  async createSession() {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query(
        `INSERT INTO guidance_session (current_state, is_completed)
         VALUES ($1, FALSE)
         RETURNING session_id, current_state, is_completed, started_at;`,
        [STATES.GUIDANCE_STARTED]
      );
      const session = sessionResult.rows[0];

      await client.query(
        `INSERT INTO guidance_event (
          session_id, event_type, from_state, to_state, payload
        ) VALUES ($1, $2, $3, $4, $5);`,
        [
          session.session_id,
          EVENT_TYPES.SESSION_INITIALIZED,
          'INITIAL',
          STATES.GUIDANCE_STARTED,
          JSON.stringify({ note: 'Anonymous session initialized.' }),
        ]
      );

      await client.query('COMMIT');
      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Searches the synthetic reference catalogue using a controlled category.
   * Transitions: GUIDANCE_STARTED -> SERVICE_SEARCHED -> (PUBLIC_REFERENCE_FOUND | PUBLIC_REFERENCE_NOT_FOUND)
   * Handles POST /api/guidance/search
   */
  async searchCategory(sessionId, categoryId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT session_id, current_state, is_completed FROM guidance_session WHERE session_id = $1 FOR UPDATE;`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error(`Guidance session '${sessionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'SESSION_NOT_FOUND';
        throw error;
      }

      const session = sessionRes.rows[0];

      if (session.current_state !== STATES.GUIDANCE_STARTED) {
        const error = new Error(
          `Invalid state transition: Cannot search category from state '${session.current_state}'. Expected '${STATES.GUIDANCE_STARTED}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      // Step 1: Log intermediate SERVICE_SEARCHED event
      await client.query(
        `INSERT INTO guidance_event (session_id, event_type, from_state, to_state, payload)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          sessionId,
          EVENT_TYPES.SERVICE_CATEGORY_SELECTED,
          STATES.GUIDANCE_STARTED,
          STATES.SERVICE_SEARCHED,
          JSON.stringify({ category_id: categoryId }),
        ]
      );

      // Step 2: Query package_reference table for the controlled category
      const pkgRes = await client.query(
        `SELECT package_id, source_id, import_run_id, category_id, specialty_name, procedure_name, procedure_code,
                is_simulated_reference, data_status, simulation_notice,
                official_verification_channel, help_desk_contact, seed_version
         FROM package_reference
         WHERE category_id = $1
         LIMIT 1;`,
        [categoryId]
      );

      const isMatch = pkgRes.rows.length > 0 && categoryId !== 'NO_MATCH_DEMO';
      const targetState = isMatch ? STATES.PUBLIC_REFERENCE_FOUND : STATES.PUBLIC_REFERENCE_NOT_FOUND;
      const matchedPkg = isMatch ? pkgRes.rows[0] : null;

      // Step 3: Update session state in database
      const updateRes = await client.query(
        `UPDATE guidance_session
         SET current_state = $1,
             selected_category = $2,
             reference_found = $3,
             matched_package_id = $4,
             updated_at = NOW()
         WHERE session_id = $5
         RETURNING session_id, current_state, is_completed, selected_category, reference_found, matched_package_id, started_at, updated_at;`,
        [targetState, categoryId, isMatch, matchedPkg ? matchedPkg.package_id : null, sessionId]
      );

      // Step 4: Log resolution event
      await client.query(
        `INSERT INTO guidance_event (session_id, event_type, from_state, to_state, payload)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          sessionId,
          isMatch ? EVENT_TYPES.SERVICE_MATCH_FOUND : EVENT_TYPES.SERVICE_MATCH_NOT_FOUND,
          STATES.SERVICE_SEARCHED,
          targetState,
          JSON.stringify({
            category_id: categoryId,
            reference_found: isMatch,
            matched_package_id: matchedPkg ? matchedPkg.package_id : null,
          }),
        ]
      );

      await client.query('COMMIT');

      return {
        session: updateRes.rows[0],
        reference_found: isMatch,
        package: matchedPkg,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Advances session from PUBLIC_REFERENCE_FOUND to OFFICIAL_VERIFICATION_ROUTE_SHOWN.
   * Handles POST /api/guidance/official-route
   */
  async showOfficialRoute(sessionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT session_id, current_state, is_completed FROM guidance_session WHERE session_id = $1 FOR UPDATE;`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error(`Guidance session '${sessionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'SESSION_NOT_FOUND';
        throw error;
      }

      const session = sessionRes.rows[0];

      if (session.current_state !== STATES.PUBLIC_REFERENCE_FOUND) {
        const error = new Error(
          `Invalid state transition: Cannot show official route from state '${session.current_state}'. Expected '${STATES.PUBLIC_REFERENCE_FOUND}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE guidance_session
         SET current_state = $1, updated_at = NOW()
         WHERE session_id = $2
         RETURNING session_id, current_state, is_completed, selected_category, reference_found, matched_package_id, started_at, updated_at;`,
        [STATES.OFFICIAL_VERIFICATION_ROUTE_SHOWN, sessionId]
      );

      await client.query(
        `INSERT INTO guidance_event (session_id, event_type, from_state, to_state, payload)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          sessionId,
          EVENT_TYPES.OFFICIAL_ROUTE_VIEWED,
          STATES.PUBLIC_REFERENCE_FOUND,
          STATES.OFFICIAL_VERIFICATION_ROUTE_SHOWN,
          JSON.stringify({ route_type: 'OFFICIAL_VERIFICATION' }),
        ]
      );

      await client.query('COMMIT');

      return {
        session: updateRes.rows[0],
        route_info: {
          title: 'Official Scheme Information & Support Desk',
          informational_card:
            'Information route shown; confirmation must occur through the relevant official process outside this prototype. Use the relevant official scheme channel or authorized hospital support desk for current information. This prototype does not determine eligibility, coverage, approval, availability, cashless treatment, or legal status.',
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Advances session from PUBLIC_REFERENCE_NOT_FOUND to SUPPORT_ROUTE_SHOWN.
   * Handles POST /api/guidance/support-route
   */
  async showSupportRoute(sessionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT session_id, current_state, is_completed FROM guidance_session WHERE session_id = $1 FOR UPDATE;`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error(`Guidance session '${sessionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'SESSION_NOT_FOUND';
        throw error;
      }

      const session = sessionRes.rows[0];

      if (session.current_state !== STATES.PUBLIC_REFERENCE_NOT_FOUND) {
        const error = new Error(
          `Invalid state transition: Cannot show support route from state '${session.current_state}'. Expected '${STATES.PUBLIC_REFERENCE_NOT_FOUND}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE guidance_session
         SET current_state = $1, updated_at = NOW()
         WHERE session_id = $2
         RETURNING session_id, current_state, is_completed, selected_category, reference_found, matched_package_id, started_at, updated_at;`,
        [STATES.SUPPORT_ROUTE_SHOWN, sessionId]
      );

      await client.query(
        `INSERT INTO guidance_event (session_id, event_type, from_state, to_state, payload)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          sessionId,
          EVENT_TYPES.SUPPORT_ROUTE_VIEWED,
          STATES.PUBLIC_REFERENCE_NOT_FOUND,
          STATES.SUPPORT_ROUTE_SHOWN,
          JSON.stringify({ route_type: 'SUPPORT_ROUTE' }),
        ]
      );

      await client.query('COMMIT');

      return {
        session: updateRes.rows[0],
        route_info: {
          title: 'Official Scheme Information & Support Desk',
          informational_card:
            'Information route shown; confirmation must occur through the relevant official process outside this prototype. Use the relevant official scheme channel or authorized hospital support desk for current information. This prototype does not determine eligibility, coverage, approval, availability, cashless treatment, or legal status.',
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Advances session to GUIDANCE_COMPLETED from either OFFICIAL_VERIFICATION_ROUTE_SHOWN or SUPPORT_ROUTE_SHOWN.
   * Rejects out-of-order calls (e.g., from GUIDANCE_STARTED) with HTTP 409 INVALID_STATE_TRANSITION.
   * Handles POST /api/guidance/complete
   */
  async completeSession(sessionId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        `SELECT session_id, current_state, is_completed FROM guidance_session WHERE session_id = $1 FOR UPDATE;`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        const error = new Error(`Guidance session '${sessionId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'SESSION_NOT_FOUND';
        throw error;
      }

      const session = sessionRes.rows[0];
      const validPreStates = [STATES.OFFICIAL_VERIFICATION_ROUTE_SHOWN, STATES.SUPPORT_ROUTE_SHOWN];

      if (!validPreStates.includes(session.current_state)) {
        const error = new Error(
          `Invalid state transition: Cannot complete guidance session from state '${session.current_state}'. Expected '${STATES.OFFICIAL_VERIFICATION_ROUTE_SHOWN}' or '${STATES.SUPPORT_ROUTE_SHOWN}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE guidance_session
         SET current_state = $1, is_completed = TRUE, completed_at = NOW(), updated_at = NOW()
         WHERE session_id = $2
         RETURNING session_id, current_state, is_completed, selected_category, reference_found, matched_package_id, started_at, completed_at;`,
        [STATES.GUIDANCE_COMPLETED, sessionId]
      );

      await client.query(
        `INSERT INTO guidance_event (session_id, event_type, from_state, to_state, payload)
         VALUES ($1, $2, $3, $4, $5);`,
        [
          sessionId,
          EVENT_TYPES.GUIDANCE_ACKNOWLEDGED_AND_COMPLETED,
          session.current_state,
          STATES.GUIDANCE_COMPLETED,
          JSON.stringify({ acknowledged: true }),
        ]
      );

      await client.query('COMMIT');

      return {
        session: updateRes.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves session record and its append-only event ledger.
   * Handles GET /api/guidance/sessions/:id
   */
  async getSessionById(sessionId) {
    const sessionRes = await db.query(
      `SELECT session_id, current_state, is_completed, selected_category, reference_found, matched_package_id, started_at, completed_at, updated_at
       FROM guidance_session
       WHERE session_id = $1;`,
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      const error = new Error(`Guidance session '${sessionId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'SESSION_NOT_FOUND';
      throw error;
    }

    const eventsRes = await db.query(
      `SELECT event_id, session_id, event_type, from_state, to_state, payload, created_at
       FROM guidance_event
       WHERE session_id = $1
       ORDER BY created_at ASC;`,
      [sessionId]
    );

    return {
      session: sessionRes.rows[0],
      events: eventsRes.rows,
    };
  }
}

module.exports = new GuidanceSessionService();
