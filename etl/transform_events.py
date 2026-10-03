"""
transform_events.py
Healthcare Access Guidance Prototype - Data Engineering Batch Aggregator
Performs ETL rollup of append-only guidance events and sessions into aggregate telemetry metrics.
Strictly non-PII: extracts only counts, transition frequencies, and completion rates.
"""

import os
import sys
import json
from datetime import datetime, timezone
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/healthcare_guidance_db")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")


def get_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        return conn
    except Exception as e:
        print(f"[ETL ERROR] Failed to connect to database: {e}", file=sys.stderr)
        sys.exit(1)


def extract_data(conn):
    print("[ETL EXTRACT] Extracting sessions and events from PostgreSQL...")
    sessions_query = """
        SELECT session_id, current_state, is_completed, started_at, completed_at, updated_at
        FROM guidance_session;
    """
    events_query = """
        SELECT event_id, session_id, event_type, from_state, to_state, created_at, payload
        FROM guidance_event
        ORDER BY created_at ASC;
    """
    dq_query = """
        SELECT issue_id, issue_type, severity, description, status, detected_at
        FROM data_quality_issue;
    """

    df_sessions = pd.read_sql_query(sessions_query, conn)
    df_events = pd.read_sql_query(events_query, conn)
    df_dq = pd.read_sql_query(dq_query, conn)

    print(f"[ETL EXTRACT] Extracted {len(df_sessions)} sessions, {len(df_events)} events, {len(df_dq)} data quality issues.")
    return df_sessions, df_events, df_dq


def transform_metrics(df_sessions, df_events, df_dq):
    print("[ETL TRANSFORM] Calculating non-PII prototype interaction metrics...")
    today = datetime.now(timezone.utc).date()

    total_sessions = int(len(df_sessions))
    completed_sessions = int(df_sessions["is_completed"].sum()) if total_sessions > 0 else 0
    abandoned_sessions = total_sessions - completed_sessions
    completion_rate = round((completed_sessions / total_sessions * 100), 2) if total_sessions > 0 else 0.0

    # Counts from events
    found_events = 0
    not_found_events = 0
    event_distribution = {}

    if not df_events.empty:
        event_counts = df_events["event_type"].value_counts().to_dict()
        event_distribution = {k: int(v) for k, v in event_counts.items()}
        found_events = int(event_counts.get("SERVICE_MATCH_FOUND", 0))
        not_found_events = int(event_counts.get("SERVICE_MATCH_NOT_FOUND", 0))

    # Calculate average completion time for completed sessions
    avg_completion_seconds = 0.0
    if not df_sessions.empty and completed_sessions > 0:
        completed_subset = df_sessions[df_sessions["is_completed"] == True].copy()
        completed_subset["started_at"] = pd.to_datetime(completed_subset["started_at"])
        completed_subset["completed_at"] = pd.to_datetime(completed_subset["completed_at"])
        durations = (completed_subset["completed_at"] - completed_subset["started_at"]).dt.total_seconds()
        avg_completion_seconds = round(float(durations.mean()), 2)

    # Data Quality Metrics
    total_dq_issues = int(len(df_dq))
    dq_by_severity = {}
    if not df_dq.empty:
        dq_counts = df_dq["severity"].value_counts().to_dict()
        dq_by_severity = {k: int(v) for k, v in dq_counts.items()}

    # Check for orphaned events (events with no corresponding session)
    orphaned_events_count = 0
    if not df_events.empty and not df_sessions.empty:
        session_set = set(df_sessions["session_id"].astype(str))
        orphaned = df_events[~df_events["session_id"].astype(str).isin(session_set)]
        orphaned_events_count = int(len(orphaned))

    metrics = {
        "metric_date": str(today),
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "abandoned_sessions": abandoned_sessions,
        "completion_rate_percent": completion_rate,
        "reference_found_count": found_events,
        "reference_not_found_count": not_found_events,
        "average_completion_seconds": avg_completion_seconds,
        "total_guidance_events": int(len(df_events)),
        "event_type_distribution": event_distribution,
        "total_data_quality_issues": total_dq_issues,
        "data_quality_by_severity": dq_by_severity,
        "orphaned_events_detected": orphaned_events_count,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    return metrics


def load_metrics(conn, metrics):
    print("[ETL LOAD] Storing aggregate summary in PostgreSQL `analytics_summary` table...")
    upsert_sql = """
        INSERT INTO analytics_summary (
            metric_date,
            total_sessions,
            completed_sessions,
            reference_found_count,
            reference_not_found_count,
            completion_rate_percent,
            event_type_distribution,
            last_etl_run_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (metric_date)
        DO UPDATE SET
            total_sessions = EXCLUDED.total_sessions,
            completed_sessions = EXCLUDED.completed_sessions,
            reference_found_count = EXCLUDED.reference_found_count,
            reference_not_found_count = EXCLUDED.reference_not_found_count,
            completion_rate_percent = EXCLUDED.completion_rate_percent,
            event_type_distribution = EXCLUDED.event_type_distribution,
            last_etl_run_at = NOW();
    """

    cursor = conn.cursor()
    cursor.execute(
        upsert_sql,
        (
            metrics["metric_date"],
            metrics["total_sessions"],
            metrics["completed_sessions"],
            metrics["reference_found_count"],
            metrics["reference_not_found_count"],
            metrics["completion_rate_percent"],
            json.dumps(metrics["event_type_distribution"]),
        ),
    )
    conn.commit()
    cursor.close()
    print("[ETL LOAD] Database upsert completed successfully.")


def export_json(metrics):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_file = os.path.join(OUTPUT_DIR, "analytics_metrics.json")
    with open(out_file, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[ETL EXPORT] Aggregated metrics exported to {out_file}")


def main():
    print("=" * 60)
    print("Healthcare Access Guidance Prototype - ETL Pipeline")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    conn = get_connection()
    try:
        df_sessions, df_events, df_dq = extract_data(conn)
        metrics = transform_metrics(df_sessions, df_events, df_dq)
        load_metrics(conn, metrics)
        export_json(metrics)

        print("\n" + "=" * 60)
        print("SUMMARY REPORT")
        print("=" * 60)
        print(f"Date:                       {metrics['metric_date']}")
        print(f"Total Sessions:             {metrics['total_sessions']}")
        print(f"Completed Sessions:         {metrics['completed_sessions']}")
        print(f"Completion Rate:            {metrics['completion_rate_percent']}%")
        print(f"Reference Matches Found:    {metrics['reference_found_count']}")
        print(f"Reference Not Found:        {metrics['reference_not_found_count']}")
        print(f"Total Guidance Events:      {metrics['total_guidance_events']}")
        print(f"Avg Completion Duration:    {metrics['average_completion_seconds']}s")
        print(f"Data Quality Issues:        {metrics['total_data_quality_issues']}")
        print(f"Orphaned Events Detected:   {metrics['orphaned_events_detected']}")
        print("=" * 60)
        print("ETL execution completed with 0 errors.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
