const db = require('../db');

class CitySnapshotService {
  /**
   * Retrieves the most recent city-wide overview combining the latest
   * municipal snapshot and facility-level breakdowns from Table #17 `city_aggregate_snapshot`.
   */
  async getCityOverview() {
    // 1. Fetch latest CITY-level snapshot
    const cityRes = await db.query(`
      SELECT snapshot_id, snapshot_timestamp, snapshot_period, aggregate_level,
             opd_total_tokens, opd_waiting_tokens, opd_serving_tokens, opd_completed_tokens,
             opd_cancelled_tokens, opd_active_counters, opd_avg_wait_minutes, opd_avg_service_minutes,
             total_beds, available_beds, occupied_beds, reserved_beds, cleaning_beds, out_of_service_beds,
             icu_total_beds, icu_available_beds, icu_occupied_beds, bed_occupancy_rate,
             admissions_total, admissions_active, admissions_discharged,
             inventory_items_total, inventory_low_stock_count, inventory_out_of_stock_count,
             is_simulated, data_confidence_notice, created_at
      FROM city_aggregate_snapshot
      WHERE aggregate_level = 'CITY'
      ORDER BY snapshot_timestamp DESC
      LIMIT 1;
    `);

    const citySnapshot = cityRes.rows[0] || null;

    // 2. Fetch latest snapshot for each hospital
    const hospRes = await db.query(`
      SELECT DISTINCT ON (s.hospital_id)
             s.snapshot_id, s.snapshot_timestamp, s.snapshot_period, s.aggregate_level, s.hospital_id,
             h.hospital_name, h.city,
             s.opd_total_tokens, s.opd_waiting_tokens, s.opd_serving_tokens, s.opd_completed_tokens,
             s.opd_cancelled_tokens, s.opd_active_counters, s.opd_avg_wait_minutes, s.opd_avg_service_minutes,
             s.total_beds, s.available_beds, s.occupied_beds, s.reserved_beds, s.cleaning_beds, s.out_of_service_beds,
             s.icu_total_beds, s.icu_available_beds, s.icu_occupied_beds, s.bed_occupancy_rate,
             s.admissions_total, s.admissions_active, s.admissions_discharged,
             s.inventory_items_total, s.inventory_low_stock_count, s.inventory_out_of_stock_count,
             s.is_simulated, s.data_confidence_notice, s.created_at
      FROM city_aggregate_snapshot s
      LEFT JOIN hospital h ON s.hospital_id = h.hospital_id
      WHERE s.aggregate_level = 'HOSPITAL'
      ORDER BY s.hospital_id, s.snapshot_timestamp DESC;
    `);

    // Calculate snapshot age and staleness
    let ageMinutes = null;
    let isStale = false;
    if (citySnapshot) {
      const snapTime = new Date(citySnapshot.snapshot_timestamp).getTime();
      ageMinutes = Math.max(0, Math.round((Date.now() - snapTime) / (1000 * 60)));
      isStale = ageMinutes > 180; // Over 3 hours old
    }

    return {
      status: citySnapshot ? 'POPULATED' : 'EMPTY',
      snapshot_timestamp: citySnapshot?.snapshot_timestamp || null,
      snapshot_period: citySnapshot?.snapshot_period || 'HOURLY',
      age_minutes: ageMinutes,
      is_stale: isStale,
      data_confidence_notice: citySnapshot?.data_confidence_notice ||
        'Simulated periodic operational snapshot. Does not represent live municipal availability.',
      is_simulated: true,
      city_totals: citySnapshot,
      hospitals: hospRes.rows,
    };
  }

  /**
   * Lists persisted historical snapshots with optional filters.
   */
  async listSnapshots(filters = {}) {
    const conditions = [];
    const values = [];

    if (filters.period) {
      values.push(filters.period);
      conditions.push(`s.snapshot_period = $${values.length}`);
    }

    if (filters.level) {
      values.push(filters.level);
      conditions.push(`s.aggregate_level = $${values.length}`);
    }

    if (filters.hospital_id) {
      values.push(filters.hospital_id);
      conditions.push(`s.hospital_id = $${values.length}`);
    }

    if (filters.department_id) {
      values.push(filters.department_id);
      conditions.push(`s.department_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    values.push(limit);

    const query = `
      SELECT s.*, h.hospital_name, d.department_name
      FROM city_aggregate_snapshot s
      LEFT JOIN hospital h ON s.hospital_id = h.hospital_id
      LEFT JOIN department d ON s.hospital_id = d.hospital_id AND s.department_id = d.department_id
      ${whereClause}
      ORDER BY s.snapshot_timestamp DESC
      LIMIT $${values.length};
    `;

    const res = await db.query(query, values);
    return {
      total_snapshots: res.rows.length,
      snapshots: res.rows,
    };
  }
}

module.exports = new CitySnapshotService();
