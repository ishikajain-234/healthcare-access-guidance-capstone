const db = require('../db');
const { calculateMmc } = require('../utils/mmc');

class OpdAnalyticsService {
  /**
   * Retrieves operational queue metrics and computes M/M/c theoretical benchmark.
   * Handles GET /api/opd/analytics
   *
   * @param {Object} params
   * @param {string} params.hospital_id
   * @param {string} params.department_id
   * @param {number} [params.lambda=30]
   * @param {number} [params.mu=8]
   * @returns {Promise<Object>}
   */
  async getDepartmentAnalytics({ hospital_id, department_id, lambda = 30, mu = 8 }) {
    // 1. Verify hospital existence
    const hospRes = await db.query(
      `SELECT hospital_id, hospital_name FROM hospital WHERE hospital_id = $1;`,
      [hospital_id]
    );
    if (hospRes.rows.length === 0) {
      const error = new Error(`Hospital '${hospital_id}' not found.`);
      error.statusCode = 404;
      error.errorCode = 'HOSPITAL_NOT_FOUND';
      throw error;
    }

    // 2. Verify department and hospital hierarchy
    const deptRes = await db.query(
      `SELECT department_id, department_name FROM department WHERE hospital_id = $1 AND department_id = $2;`,
      [hospital_id, department_id]
    );
    if (deptRes.rows.length === 0) {
      const anyDeptRes = await db.query(
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

    // 3. Query active counters from opd_queue_counter (do not infer from tokens)
    const counterRes = await db.query(
      `SELECT COUNT(*)::INTEGER AS active_counters
       FROM opd_queue_counter
       WHERE hospital_id = $1 AND department_id = $2 AND is_active = TRUE;`,
      [hospital_id, department_id]
    );
    const activeCounters = counterRes.rows[0].active_counters;

    // 4. Query observed token metrics and timestamp-based durations
    const tokenMetricsRes = await db.query(
      `SELECT
         COUNT(*)::INTEGER AS total_tokens,
         COUNT(*) FILTER (WHERE status = 'WAITING')::INTEGER AS waiting_tokens,
         COUNT(*) FILTER (WHERE status IN ('IN_SERVICE', 'CALLED'))::INTEGER AS serving_tokens,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER AS completed_tokens,
         COUNT(*) FILTER (WHERE status = 'CANCELLED')::INTEGER AS cancelled_tokens,
         COALESCE(
           ROUND(
             AVG(EXTRACT(EPOCH FROM (service_started_at - issued_at)) / 60.0)
             FILTER (WHERE service_started_at IS NOT NULL AND issued_at IS NOT NULL)
           , 2), 0.00
         )::NUMERIC AS average_wait_minutes,
         COALESCE(
           ROUND(
             AVG(EXTRACT(EPOCH FROM (service_completed_at - service_started_at)) / 60.0)
             FILTER (WHERE service_completed_at IS NOT NULL AND service_started_at IS NOT NULL)
           , 2), 0.00
         )::NUMERIC AS average_service_minutes
       FROM opd_token
       WHERE hospital_id = $1 AND department_id = $2;`,
      [hospital_id, department_id]
    );

    const observedRow = tokenMetricsRes.rows[0];
    const observedWaitMinutes = parseFloat(observedRow.average_wait_minutes);
    const observedServiceMinutes = parseFloat(observedRow.average_service_minutes);

    // 5. Evaluate theoretical M/M/c Erlang-C benchmark
    const mmcBenchmark = calculateMmc({
      lambda,
      mu,
      c: activeCounters,
    });

    // 6. Calculate observed vs theoretical comparison
    const theoreticalWaitMinutes = mmcBenchmark.stable ? mmcBenchmark.wq_minutes : null;
    let waitDeltaMinutes = null;
    if (theoreticalWaitMinutes !== null) {
      waitDeltaMinutes = Math.round((observedWaitMinutes - theoreticalWaitMinutes) * 100) / 100;
    }

    return {
      scope: {
        hospital_id,
        department_id,
      },
      observed: {
        total_tokens: observedRow.total_tokens,
        waiting_tokens: observedRow.waiting_tokens,
        serving_tokens: observedRow.serving_tokens,
        completed_tokens: observedRow.completed_tokens,
        cancelled_tokens: observedRow.cancelled_tokens,
        active_counters: activeCounters,
        average_wait_minutes: observedWaitMinutes,
        average_service_minutes: observedServiceMinutes,
      },
      mmc_benchmark: mmcBenchmark,
      comparison: {
        observed_wait_minutes: observedWaitMinutes,
        theoretical_wait_minutes: theoreticalWaitMinutes,
        wait_delta_minutes: waitDeltaMinutes,
      },
      model_notice: 'M/M/c is a theoretical queueing benchmark, not a prediction or guarantee.',
    };
  }
}

module.exports = new OpdAnalyticsService();
