const db = require('../db');
const { BED_STATES, isValidBedTransition } = require('../constants/bedStateMachine');

class BedService {
  /**
   * Lists wards for a given hospital.
   * Handles GET /api/hospitals/:hospitalId/wards
   */
  async listWards(hospitalId) {
    const hospRes = await db.query(
      `SELECT hospital_id, hospital_name FROM hospital WHERE hospital_id = $1;`,
      [hospitalId]
    );
    if (hospRes.rows.length === 0) {
      const error = new Error(`Hospital '${hospitalId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'HOSPITAL_NOT_FOUND';
      throw error;
    }

    const wardsRes = await db.query(
      `SELECT ward_id, hospital_id, ward_code, ward_name, ward_type, total_capacity, is_simulated, created_at
       FROM bed_ward
       WHERE hospital_id = $1
       ORDER BY ward_name ASC;`,
      [hospitalId]
    );

    return {
      hospital_id: hospitalId,
      total_wards: wardsRes.rows.length,
      wards: wardsRes.rows,
    };
  }

  /**
   * Lists beds for a given hospital with optional filters.
   * Handles GET /api/hospitals/:hospitalId/beds
   */
  async listBeds(hospitalId, filters = {}) {
    const hospRes = await db.query(
      `SELECT hospital_id, hospital_name FROM hospital WHERE hospital_id = $1;`,
      [hospitalId]
    );
    if (hospRes.rows.length === 0) {
      const error = new Error(`Hospital '${hospitalId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'HOSPITAL_NOT_FOUND';
      throw error;
    }

    const conditions = ['b.hospital_id = $1'];
    const values = [hospitalId];

    if (filters.ward_id) {
      values.push(filters.ward_id);
      conditions.push(`b.ward_id = $${values.length}`);
    }

    if (filters.current_state) {
      values.push(filters.current_state);
      conditions.push(`b.current_state = $${values.length}`);
    }

    const queryText = `
      SELECT b.bed_id, b.hospital_id, b.ward_id, bw.ward_name, bw.ward_type,
             b.bed_number, b.current_state, b.last_status_change_at, b.is_simulated, b.created_at
      FROM bed b
      JOIN bed_ward bw ON b.hospital_id = bw.hospital_id AND b.ward_id = bw.ward_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.ward_id ASC, b.bed_number ASC;
    `;

    const bedsRes = await db.query(queryText, values);
    return {
      hospital_id: hospitalId,
      total_beds: bedsRes.rows.length,
      beds: bedsRes.rows,
    };
  }

  /**
   * Computes hospital-level operational bed availability and occupancy metrics.
   * Handles GET /api/hospitals/:hospitalId/beds/availability
   */
  async getHospitalBedAvailability(hospitalId) {
    const hospRes = await db.query(
      `SELECT hospital_id, hospital_name FROM hospital WHERE hospital_id = $1;`,
      [hospitalId]
    );
    if (hospRes.rows.length === 0) {
      const error = new Error(`Hospital '${hospitalId}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'HOSPITAL_NOT_FOUND';
      throw error;
    }

    // Query aggregated hospital-level bed counts
    const aggRes = await db.query(
      `SELECT
         COUNT(*)::INTEGER AS total_beds,
         COUNT(*) FILTER (WHERE current_state = 'AVAILABLE')::INTEGER AS available_beds,
         COUNT(*) FILTER (WHERE current_state = 'RESERVED')::INTEGER AS reserved_beds,
         COUNT(*) FILTER (WHERE current_state = 'OCCUPIED')::INTEGER AS occupied_beds,
         COUNT(*) FILTER (WHERE current_state = 'CLEANING')::INTEGER AS cleaning_beds,
         COUNT(*) FILTER (WHERE current_state = 'OUT_OF_SERVICE')::INTEGER AS out_of_service_beds
       FROM bed
       WHERE hospital_id = $1;`,
      [hospitalId]
    );

    const counts = aggRes.rows[0];
    const totalBeds = counts.total_beds;
    const occupiedBeds = counts.occupied_beds;
    const occupancyRate = totalBeds > 0
      ? Math.round((occupiedBeds / totalBeds) * 10000) / 100
      : 0;

    // Ward-level breakdown
    const wardRes = await db.query(
      `SELECT
         bw.ward_id,
         bw.ward_code,
         bw.ward_name,
         bw.ward_type,
         bw.total_capacity,
         COUNT(b.bed_id)::INTEGER AS total_beds,
         COUNT(b.bed_id) FILTER (WHERE b.current_state = 'AVAILABLE')::INTEGER AS available_beds,
         COUNT(b.bed_id) FILTER (WHERE b.current_state = 'RESERVED')::INTEGER AS reserved_beds,
         COUNT(b.bed_id) FILTER (WHERE b.current_state = 'OCCUPIED')::INTEGER AS occupied_beds,
         COUNT(b.bed_id) FILTER (WHERE b.current_state = 'CLEANING')::INTEGER AS cleaning_beds,
         COUNT(b.bed_id) FILTER (WHERE b.current_state = 'OUT_OF_SERVICE')::INTEGER AS out_of_service_beds
       FROM bed_ward bw
       LEFT JOIN bed b ON bw.hospital_id = b.hospital_id AND bw.ward_id = b.ward_id
       WHERE bw.hospital_id = $1
       GROUP BY bw.ward_id, bw.ward_code, bw.ward_name, bw.ward_type, bw.total_capacity
       ORDER BY bw.ward_name ASC;`,
      [hospitalId]
    );

    return {
      hospital_id: hospitalId,
      total_beds: totalBeds,
      available_beds: counts.available_beds,
      reserved_beds: counts.reserved_beds,
      occupied_beds: occupiedBeds,
      cleaning_beds: counts.cleaning_beds,
      out_of_service_beds: counts.out_of_service_beds,
      occupancy_rate: occupancyRate,
      ward_breakdown: wardRes.rows,
    };
  }

  /**
   * Executes transactional state change on a bed with row locking.
   */
  async transitionBed(bedId, targetState) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const bedRes = await client.query(
        `SELECT * FROM bed WHERE bed_id = $1 FOR UPDATE;`,
        [bedId]
      );
      if (bedRes.rows.length === 0) {
        const error = new Error(`Bed '${bedId}' not found.`);
        error.statusCode = 404;
        error.errorCode = 'BED_NOT_FOUND';
        throw error;
      }
      const bed = bedRes.rows[0];

      if (!isValidBedTransition(bed.current_state, targetState)) {
        const error = new Error(
          `Invalid bed state transition: Cannot change state from '${bed.current_state}' to '${targetState}'.`
        );
        error.statusCode = 409;
        error.errorCode = 'INVALID_STATE_TRANSITION';
        throw error;
      }

      const updateRes = await client.query(
        `UPDATE bed
         SET current_state = $1
         WHERE bed_id = $2
         RETURNING bed_id, hospital_id, ward_id, bed_number, current_state, last_status_change_at, is_simulated, created_at;`,
        [targetState, bedId]
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

  // Direct state actions
  reserveBed(bedId) {
    return this.transitionBed(bedId, BED_STATES.RESERVED);
  }

  occupyBed(bedId) {
    return this.transitionBed(bedId, BED_STATES.OCCUPIED);
  }

  cleanBed(bedId) {
    return this.transitionBed(bedId, BED_STATES.CLEANING);
  }

  releaseBed(bedId) {
    // Release is valid from CLEANING or RESERVED -> AVAILABLE
    return this.transitionBed(bedId, BED_STATES.AVAILABLE);
  }

  outOfServiceBed(bedId) {
    return this.transitionBed(bedId, BED_STATES.OUT_OF_SERVICE);
  }

  restoreBed(bedId) {
    return this.transitionBed(bedId, BED_STATES.AVAILABLE);
  }
}

module.exports = new BedService();
