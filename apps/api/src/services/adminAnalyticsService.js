const db = require('../db');

class AdminAnalyticsService {
  async getSummaryMetrics() {
    const sessionStats = await db.query(`
      SELECT 
        COUNT(session_id)::int AS total_sessions,
        COUNT(CASE WHEN is_completed = TRUE THEN 1 END)::int AS completed_sessions,
        COUNT(CASE WHEN reference_found = TRUE THEN 1 END)::int AS reference_found_count,
        COUNT(CASE WHEN reference_found = FALSE THEN 1 END)::int AS reference_not_found_count
      FROM guidance_session;
    `);

    const eventCounts = await db.query(`
      SELECT event_type, COUNT(*)::int AS count
      FROM guidance_event
      GROUP BY event_type
      ORDER BY count DESC;
    `);

    const recentEvents = await db.query(`
      SELECT event_id, session_id, event_type, from_state, to_state, created_at, payload
      FROM guidance_event
      ORDER BY created_at DESC
      LIMIT 20;
    `);

    const stats = sessionStats.rows[0];
    const total = stats.total_sessions || 0;
    const completed = stats.completed_sessions || 0;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00';

    return {
      total_sessions: total,
      completed_sessions: completed,
      reference_found_count: stats.reference_found_count || 0,
      reference_not_found_count: stats.reference_not_found_count || 0,
      completion_rate_percent: parseFloat(completionRate),
      event_counts: eventCounts.rows,
      recent_events: recentEvents.rows,
      simulation_notice: 'All metrics derived from simulated prototype sessions. Zero real patient or hospital records.',
    };
  }

  async getDataQualitySummary() {
    const res = await db.query(`
      SELECT issue_type, severity, COUNT(*)::int AS count
      FROM data_quality_issue
      GROUP BY issue_type, severity;
    `);

    const issues = await db.query(`
      SELECT issue_id, entity_type, entity_id, issue_type, severity, description, status, detected_at
      FROM data_quality_issue
      ORDER BY detected_at DESC
      LIMIT 20;
    `);

    return {
      total_issues: res.rows.reduce((acc, r) => acc + r.count, 0),
      issues_by_severity: res.rows,
      recent_issues: issues.rows,
    };
  }
}

module.exports = new AdminAnalyticsService();
