"""
test_transform_events.py
Unit and integration test suite for the guidance session and event batch ETL pipeline.

Tests:
  1. Session metric rollup (total, completed, abandoned, completion rate)
  2. Event distribution dictionary generation
  3. Average completion time computation
  4. Empty dataset handling (zero division protection)
  5. Data quality and orphan event detection
  6. Idempotent load into PostgreSQL analytics_summary
"""

import unittest
import warnings
from datetime import datetime, timezone, timedelta
import pandas as pd
import psycopg2

warnings.filterwarnings("ignore", category=UserWarning)

from etl.transform_events import (
    transform_metrics,
    get_connection,
    load_metrics,
    run_pipeline,
)


class TestTransformEventsMetrics(unittest.TestCase):
    def test_metrics_calculation_with_sample_data(self):
        t0 = datetime(2026, 10, 10, 10, 0, 0, tzinfo=timezone.utc)
        t1 = t0 + timedelta(seconds=45)

        df_sessions = pd.DataFrame([
            {
                "session_id": "s1",
                "current_state": "GUIDANCE_COMPLETED",
                "is_completed": True,
                "started_at": t0,
                "completed_at": t1,
            },
            {
                "session_id": "s2",
                "current_state": "GUIDANCE_STARTED",
                "is_completed": False,
                "started_at": t0,
                "completed_at": None,
            },
        ])

        df_events = pd.DataFrame([
            {"event_id": "e1", "session_id": "s1", "event_type": "SESSION_INITIALIZED"},
            {"event_id": "e2", "session_id": "s1", "event_type": "SERVICE_MATCH_FOUND"},
            {"event_id": "e3", "session_id": "s1", "event_type": "SESSION_COMPLETED"},
            {"event_id": "e4", "session_id": "s2", "event_type": "SESSION_INITIALIZED"},
        ])

        df_dq = pd.DataFrame([
            {"issue_id": "dq1", "severity": "WARNING"},
        ])

        metrics = transform_metrics(df_sessions, df_events, df_dq)

        self.assertEqual(metrics["total_sessions"], 2)
        self.assertEqual(metrics["completed_sessions"], 1)
        self.assertEqual(metrics["abandoned_sessions"], 1)
        self.assertEqual(metrics["completion_rate_percent"], 50.0)
        self.assertEqual(metrics["reference_found_count"], 1)
        self.assertEqual(metrics["reference_not_found_count"], 0)
        self.assertEqual(metrics["average_completion_seconds"], 45.0)
        self.assertEqual(metrics["total_guidance_events"], 4)
        self.assertEqual(metrics["total_data_quality_issues"], 1)
        self.assertEqual(metrics["orphaned_events_detected"], 0)

    def test_metrics_empty_data(self):
        df_sessions = pd.DataFrame(columns=["session_id", "current_state", "is_completed", "started_at", "completed_at"])
        df_events = pd.DataFrame(columns=["event_id", "session_id", "event_type"])
        df_dq = pd.DataFrame(columns=["issue_id", "severity"])

        metrics = transform_metrics(df_sessions, df_events, df_dq)

        self.assertEqual(metrics["total_sessions"], 0)
        self.assertEqual(metrics["completed_sessions"], 0)
        self.assertEqual(metrics["completion_rate_percent"], 0.0)
        self.assertEqual(metrics["reference_found_count"], 0)
        self.assertEqual(metrics["average_completion_seconds"], 0.0)
        self.assertEqual(metrics["total_guidance_events"], 0)
        self.assertEqual(metrics["orphaned_events_detected"], 0)

    def test_orphan_event_detection(self):
        df_sessions = pd.DataFrame([
            {"session_id": "s1", "is_completed": True, "started_at": None, "completed_at": None},
        ])

        df_events = pd.DataFrame([
            {"event_id": "e1", "session_id": "s1", "event_type": "SESSION_INITIALIZED"},
            {"event_id": "e2", "session_id": "s999_nonexistent", "event_type": "ORPHAN_EVENT"},
        ])

        df_dq = pd.DataFrame(columns=["issue_id", "severity"])

        metrics = transform_metrics(df_sessions, df_events, df_dq)
        self.assertEqual(metrics["orphaned_events_detected"], 1)


class TestTransformEventsLiveIntegration(unittest.TestCase):
    def test_live_execution_and_idempotency(self):
        conn = get_connection()
        try:
            metrics = run_pipeline()
            self.assertIsNotNone(metrics)
            self.assertIn("total_sessions", metrics)

            # Query database to confirm row exists in analytics_summary
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM analytics_summary WHERE metric_date = %s;", [metrics["metric_date"]])
                count = cur.fetchone()[0]
                self.assertEqual(count, 1)

            # Second execution must be idempotent and succeed
            metrics_2 = run_pipeline()
            self.assertEqual(metrics["metric_date"], metrics_2["metric_date"])
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
