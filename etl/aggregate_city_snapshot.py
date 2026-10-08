"""
aggregate_city_snapshot.py
PS-75 Hospital Operations Coordination Platform - Operational Telemetry ETL Pipeline

Extracts operational data from PostgreSQL (OPD tokens, counters, beds, admissions, inventory)
and aggregates periodic synthetic snapshots into Table #17 `city_aggregate_snapshot`.

Hierarchical Aggregations:
  - DEPARTMENT level: Queue token volumes, active counters, and observed wait/service times.
  - HOSPITAL level: Cross-department queue metrics, bed capacities & occupancy, admissions pipeline, dispensary inventory.
  - CITY level: Municipal rollups across all monitored facilities in the region.

Safety & Governance:
  - Preserves distinction between observed operational metrics and simulated/reference data.
  - Strictly enforces is_simulated = TRUE and explicit data_confidence_notice.
  - Does NOT claim real-time municipal or government availability.
  - Idempotent upserts via PostgreSQL unique constraint arbiter index.
"""

import os
import sys
import json
import argparse
import warnings
from datetime import datetime, timezone
from decimal import Decimal
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Silence DBAPI2 connection warning
warnings.filterwarnings("ignore", category=UserWarning)

# Load environment configuration
load_dotenv()

DEFAULT_DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/healthcare_guidance_db")
DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
CONFIDENCE_NOTICE = "Simulated periodic operational snapshot. Does not represent live municipal availability."

VALID_PERIODS = ("15_MIN", "HOURLY", "DAILY", "CUSTOM")
VALID_LEVELS = ("CITY", "HOSPITAL", "DEPARTMENT")


def get_connection(db_url=None):
    """Establishes and returns a connection to the PostgreSQL database."""
    target_url = db_url or DEFAULT_DB_URL
    try:
        conn = psycopg2.connect(target_url)
        return conn
    except Exception as e:
        print(f"[ETL ERROR] Failed to connect to PostgreSQL: {e}", file=sys.stderr)
        raise


def extract_operational_data(conn):
    """
    Extracts raw operational data across all relevant operational tables.
    Returns a dictionary of pandas DataFrames.
    """
    print("[ETL EXTRACT] Reading operational datasets from PostgreSQL...")

    hospitals_query = """
        SELECT hospital_id, hospital_code, hospital_name, city, is_simulated
        FROM hospital
        ORDER BY hospital_id ASC;
    """
    departments_query = """
        SELECT hospital_id, department_id, department_code, department_name, is_simulated
        FROM department
        ORDER BY hospital_id ASC, department_id ASC;
    """
    counters_query = """
        SELECT counter_id, hospital_id, department_id, counter_number, is_active, is_simulated
        FROM opd_queue_counter;
    """
    tokens_query = """
        SELECT token_id, hospital_id, department_id, counter_id, status,
               priority_level, issued_at, called_at, service_started_at,
               service_completed_at, cancelled_at, is_simulated
        FROM opd_token;
    """
    wards_query = """
        SELECT ward_id, hospital_id, ward_code, ward_name, ward_type, total_capacity, is_simulated
        FROM bed_ward;
    """
    beds_query = """
        SELECT bed_id, hospital_id, ward_id, bed_number, current_state, is_simulated
        FROM bed;
    """
    admissions_query = """
        SELECT admission_id, hospital_id, ward_id, bed_id, linked_token_id,
               status, requested_at, assigned_at, admitted_at, discharged_at,
               cancelled_at, is_simulated
        FROM admission;
    """
    inventory_query = """
        SELECT item_id, hospital_id, item_code, item_name, item_type,
               current_stock, reorder_threshold, reorder_quantity, is_active, is_simulated
        FROM inventory_item;
    """

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        df_hospitals = pd.read_sql_query(hospitals_query, conn)
        df_departments = pd.read_sql_query(departments_query, conn)
        df_counters = pd.read_sql_query(counters_query, conn)
        df_tokens = pd.read_sql_query(tokens_query, conn)
        df_wards = pd.read_sql_query(wards_query, conn)
        df_beds = pd.read_sql_query(beds_query, conn)
        df_admissions = pd.read_sql_query(admissions_query, conn)
        df_inventory = pd.read_sql_query(inventory_query, conn)

    # Ensure timestamp parsing
    if not df_tokens.empty:
        df_tokens["issued_at"] = pd.to_datetime(df_tokens["issued_at"], utc=True)
        df_tokens["called_at"] = pd.to_datetime(df_tokens["called_at"], utc=True)
        df_tokens["service_started_at"] = pd.to_datetime(df_tokens["service_started_at"], utc=True)
        df_tokens["service_completed_at"] = pd.to_datetime(df_tokens["service_completed_at"], utc=True)
        df_tokens["cancelled_at"] = pd.to_datetime(df_tokens["cancelled_at"], utc=True)

    print(
        f"[ETL EXTRACT] Extracted: {len(df_hospitals)} hospitals, {len(df_departments)} departments, "
        f"{len(df_counters)} counters, {len(df_tokens)} tokens, {len(df_wards)} wards, "
        f"{len(df_beds)} beds, {len(df_admissions)} admissions, {len(df_inventory)} inventory items."
    )

    return {
        "hospitals": df_hospitals,
        "departments": df_departments,
        "counters": df_counters,
        "tokens": df_tokens,
        "wards": df_wards,
        "beds": df_beds,
        "admissions": df_admissions,
        "inventory": df_inventory,
    }


def compute_opd_metrics(df_tokens, df_counters):
    """
    Computes standard non-negative OPD queue counts and observed wait/service metrics.
    """
    total_tokens = int(len(df_tokens))
    waiting_tokens = int(len(df_tokens[df_tokens["status"] == "WAITING"])) if total_tokens > 0 else 0
    serving_tokens = int(len(df_tokens[df_tokens["status"].isin(["IN_SERVICE", "CALLED"])])) if total_tokens > 0 else 0
    completed_tokens = int(len(df_tokens[df_tokens["status"] == "COMPLETED"])) if total_tokens > 0 else 0
    cancelled_tokens = int(len(df_tokens[df_tokens["status"] == "CANCELLED"])) if total_tokens > 0 else 0

    active_counters = int(len(df_counters[df_counters["is_active"] == True])) if not df_counters.empty else 0

    # Average observed waiting time (service_started_at - issued_at in minutes)
    avg_wait_minutes = 0.00
    if total_tokens > 0:
        valid_wait = df_tokens[df_tokens["service_started_at"].notna() & df_tokens["issued_at"].notna()]
        if not valid_wait.empty:
            wait_diff = (valid_wait["service_started_at"] - valid_wait["issued_at"]).dt.total_seconds() / 60.0
            avg_wait_minutes = round(float(wait_diff.mean()), 2)
            if avg_wait_minutes < 0:
                avg_wait_minutes = 0.00

    # Average observed service time (service_completed_at - service_started_at in minutes)
    avg_service_minutes = 0.00
    if total_tokens > 0:
        valid_service = df_tokens[df_tokens["service_completed_at"].notna() & df_tokens["service_started_at"].notna()]
        if not valid_service.empty:
            service_diff = (valid_service["service_completed_at"] - valid_service["service_started_at"]).dt.total_seconds() / 60.0
            avg_service_minutes = round(float(service_diff.mean()), 2)
            if avg_service_minutes < 0:
                avg_service_minutes = 0.00

    return {
        "opd_total_tokens": total_tokens,
        "opd_waiting_tokens": waiting_tokens,
        "opd_serving_tokens": serving_tokens,
        "opd_completed_tokens": completed_tokens,
        "opd_cancelled_tokens": cancelled_tokens,
        "opd_active_counters": active_counters,
        "opd_avg_wait_minutes": avg_wait_minutes,
        "opd_avg_service_minutes": avg_service_minutes,
    }


def compute_bed_metrics(df_beds, df_wards):
    """
    Computes capacity, occupancy, and ICU breakdowns from beds and wards.
    """
    total_beds = int(len(df_beds))
    if total_beds == 0:
        return {
            "total_beds": 0,
            "available_beds": 0,
            "occupied_beds": 0,
            "reserved_beds": 0,
            "cleaning_beds": 0,
            "out_of_service_beds": 0,
            "icu_total_beds": 0,
            "icu_available_beds": 0,
            "icu_occupied_beds": 0,
            "bed_occupancy_rate": 0.00,
        }

    available_beds = int(len(df_beds[df_beds["current_state"] == "AVAILABLE"]))
    occupied_beds = int(len(df_beds[df_beds["current_state"] == "OCCUPIED"]))
    reserved_beds = int(len(df_beds[df_beds["current_state"] == "RESERVED"]))
    cleaning_beds = int(len(df_beds[df_beds["current_state"] == "CLEANING"]))
    out_of_service_beds = int(len(df_beds[df_beds["current_state"] == "OUT_OF_SERVICE"]))

    # ICU breakdown via ward link
    icu_total_beds = 0
    icu_available_beds = 0
    icu_occupied_beds = 0

    if not df_wards.empty:
        merged = df_beds.merge(df_wards[["ward_id", "ward_type"]], on="ward_id", how="left")
        icu_subset = merged[merged["ward_type"] == "ICU"]
        icu_total_beds = int(len(icu_subset))
        icu_available_beds = int(len(icu_subset[icu_subset["current_state"] == "AVAILABLE"]))
        icu_occupied_beds = int(len(icu_subset[icu_subset["current_state"] == "OCCUPIED"]))

    occupancy_rate = round((occupied_beds / total_beds) * 100.0, 2)
    occupancy_rate = min(100.00, max(0.00, occupancy_rate))

    return {
        "total_beds": total_beds,
        "available_beds": available_beds,
        "occupied_beds": occupied_beds,
        "reserved_beds": reserved_beds,
        "cleaning_beds": cleaning_beds,
        "out_of_service_beds": out_of_service_beds,
        "icu_total_beds": icu_total_beds,
        "icu_available_beds": icu_available_beds,
        "icu_occupied_beds": icu_occupied_beds,
        "bed_occupancy_rate": occupancy_rate,
    }


def compute_admission_metrics(df_admissions):
    """
    Computes admission totals, active pipeline, and discharged counts.
    """
    total = int(len(df_admissions))
    if total == 0:
        return {
            "admissions_total": 0,
            "admissions_active": 0,
            "admissions_discharged": 0,
        }

    active_statuses = ["ADMISSION_REQUESTED", "PENDING_REVIEW", "BED_ASSIGNED", "ADMISSION_CONFIRMED", "ADMITTED"]
    active_count = int(len(df_admissions[df_admissions["status"].isin(active_statuses)]))
    discharged_count = int(len(df_admissions[df_admissions["status"] == "DISCHARGED"]))

    return {
        "admissions_total": total,
        "admissions_active": active_count,
        "admissions_discharged": discharged_count,
    }


def compute_inventory_metrics(df_inventory):
    """
    Computes dispensary stock totals, low-stock threshold alerts, and out-of-stock items.
    """
    total = int(len(df_inventory))
    if total == 0:
        return {
            "inventory_items_total": 0,
            "inventory_low_stock_count": 0,
            "inventory_out_of_stock_count": 0,
        }

    out_of_stock = int(len(df_inventory[df_inventory["current_stock"] == 0]))
    low_stock = int(
        len(
            df_inventory[
                (df_inventory["current_stock"] > 0)
                & (df_inventory["current_stock"] <= df_inventory["reorder_threshold"])
            ]
        )
    )

    return {
        "inventory_items_total": total,
        "inventory_low_stock_count": low_stock,
        "inventory_out_of_stock_count": out_of_stock,
    }


def compute_department_snapshots(df_departments, df_counters, df_tokens, snapshot_timestamp, period="HOURLY"):
    """
    Generates DEPARTMENT-level snapshot records.
    Only OPD metrics are defined at the department level. Beds/admissions/inventory are hospital-scoped (0).
    """
    snapshots = []
    if df_departments.empty:
        return snapshots

    for _, dept in df_departments.iterrows():
        h_id = dept["hospital_id"]
        d_id = dept["department_id"]

        dept_tokens = (
            df_tokens[(df_tokens["hospital_id"] == h_id) & (df_tokens["department_id"] == d_id)]
            if not df_tokens.empty
            else pd.DataFrame()
        )
        dept_counters = (
            df_counters[(df_counters["hospital_id"] == h_id) & (df_counters["department_id"] == d_id)]
            if not df_counters.empty
            else pd.DataFrame()
        )

        opd_metrics = compute_opd_metrics(dept_tokens, dept_counters)

        snap = {
            "snapshot_timestamp": snapshot_timestamp,
            "snapshot_period": period,
            "aggregate_level": "DEPARTMENT",
            "hospital_id": h_id,
            "department_id": d_id,
            **opd_metrics,
            "total_beds": 0,
            "available_beds": 0,
            "occupied_beds": 0,
            "reserved_beds": 0,
            "cleaning_beds": 0,
            "out_of_service_beds": 0,
            "icu_total_beds": 0,
            "icu_available_beds": 0,
            "icu_occupied_beds": 0,
            "bed_occupancy_rate": 0.00,
            "admissions_total": 0,
            "admissions_active": 0,
            "admissions_discharged": 0,
            "inventory_items_total": 0,
            "inventory_low_stock_count": 0,
            "inventory_out_of_stock_count": 0,
            "is_simulated": True,
            "data_confidence_notice": CONFIDENCE_NOTICE,
        }
        snapshots.append(snap)

    return snapshots


def compute_hospital_snapshots(
    df_hospitals,
    df_counters,
    df_tokens,
    df_wards,
    df_beds,
    df_admissions,
    df_inventory,
    snapshot_timestamp,
    period="HOURLY",
):
    """
    Generates HOSPITAL-level snapshot records combining all departmental and facility domains.
    """
    snapshots = []
    if df_hospitals.empty:
        return snapshots

    for _, hosp in df_hospitals.iterrows():
        h_id = hosp["hospital_id"]

        hosp_tokens = df_tokens[df_tokens["hospital_id"] == h_id] if not df_tokens.empty else pd.DataFrame()
        hosp_counters = df_counters[df_counters["hospital_id"] == h_id] if not df_counters.empty else pd.DataFrame()
        hosp_wards = df_wards[df_wards["hospital_id"] == h_id] if not df_wards.empty else pd.DataFrame()
        hosp_beds = df_beds[df_beds["hospital_id"] == h_id] if not df_beds.empty else pd.DataFrame()
        hosp_admissions = (
            df_admissions[df_admissions["hospital_id"] == h_id] if not df_admissions.empty else pd.DataFrame()
        )
        hosp_inventory = df_inventory[df_inventory["hospital_id"] == h_id] if not df_inventory.empty else pd.DataFrame()

        opd_metrics = compute_opd_metrics(hosp_tokens, hosp_counters)
        bed_metrics = compute_bed_metrics(hosp_beds, hosp_wards)
        admission_metrics = compute_admission_metrics(hosp_admissions)
        inventory_metrics = compute_inventory_metrics(hosp_inventory)

        snap = {
            "snapshot_timestamp": snapshot_timestamp,
            "snapshot_period": period,
            "aggregate_level": "HOSPITAL",
            "hospital_id": h_id,
            "department_id": None,
            **opd_metrics,
            **bed_metrics,
            **admission_metrics,
            **inventory_metrics,
            "is_simulated": True,
            "data_confidence_notice": CONFIDENCE_NOTICE,
        }
        snapshots.append(snap)

    return snapshots


def compute_city_snapshots(
    df_counters,
    df_tokens,
    df_wards,
    df_beds,
    df_admissions,
    df_inventory,
    snapshot_timestamp,
    period="HOURLY",
):
    """
    Generates a single CITY-level snapshot aggregating metrics across all municipal hospitals.
    """
    opd_metrics = compute_opd_metrics(df_tokens, df_counters)
    bed_metrics = compute_bed_metrics(df_beds, df_wards)
    admission_metrics = compute_admission_metrics(df_admissions)
    inventory_metrics = compute_inventory_metrics(df_inventory)

    snap = {
        "snapshot_timestamp": snapshot_timestamp,
        "snapshot_period": period,
        "aggregate_level": "CITY",
        "hospital_id": None,
        "department_id": None,
        **opd_metrics,
        **bed_metrics,
        **admission_metrics,
        **inventory_metrics,
        "is_simulated": True,
        "data_confidence_notice": CONFIDENCE_NOTICE,
    }
    return [snap]


def aggregate_all(data, snapshot_timestamp=None, period="HOURLY"):
    """
    Executes complete hierarchical aggregation across DEPARTMENT, HOSPITAL, and CITY scopes.
    Returns list of snapshot dictionaries.
    """
    if snapshot_timestamp is None:
        snapshot_timestamp = datetime.now(timezone.utc).replace(microsecond=0)

    dept_snaps = compute_department_snapshots(
        data["departments"], data["counters"], data["tokens"], snapshot_timestamp, period
    )
    hosp_snaps = compute_hospital_snapshots(
        data["hospitals"],
        data["counters"],
        data["tokens"],
        data["wards"],
        data["beds"],
        data["admissions"],
        data["inventory"],
        snapshot_timestamp,
        period,
    )
    city_snaps = compute_city_snapshots(
        data["counters"],
        data["tokens"],
        data["wards"],
        data["beds"],
        data["admissions"],
        data["inventory"],
        snapshot_timestamp,
        period,
    )

    all_snapshots = dept_snaps + hosp_snaps + city_snaps
    print(
        f"[ETL TRANSFORM] Generated {len(all_snapshots)} aggregate snapshot records "
        f"({len(dept_snaps)} DEPARTMENT, {len(hosp_snaps)} HOSPITAL, {len(city_snaps)} CITY)."
    )
    return all_snapshots


def load_snapshots_to_db(conn, snapshots):
    """
    Persists aggregated snapshots into `city_aggregate_snapshot` using PostgreSQL batch upsert.
    Enforces atomic transaction and idempotent ON CONFLICT arbiter index handling.
    """
    if not snapshots:
        print("[ETL LOAD] No snapshots to persist.")
        return 0

    print(f"[ETL LOAD] Persisting {len(snapshots)} snapshots into PostgreSQL `city_aggregate_snapshot`...")

    upsert_sql = """
        INSERT INTO city_aggregate_snapshot (
            snapshot_timestamp,
            snapshot_period,
            aggregate_level,
            hospital_id,
            department_id,
            opd_total_tokens,
            opd_waiting_tokens,
            opd_serving_tokens,
            opd_completed_tokens,
            opd_cancelled_tokens,
            opd_active_counters,
            opd_avg_wait_minutes,
            opd_avg_service_minutes,
            total_beds,
            available_beds,
            occupied_beds,
            reserved_beds,
            cleaning_beds,
            out_of_service_beds,
            icu_total_beds,
            icu_available_beds,
            icu_occupied_beds,
            bed_occupancy_rate,
            admissions_total,
            admissions_active,
            admissions_discharged,
            inventory_items_total,
            inventory_low_stock_count,
            inventory_out_of_stock_count,
            is_simulated,
            data_confidence_notice
        ) VALUES (
            %(snapshot_timestamp)s,
            %(snapshot_period)s,
            %(aggregate_level)s,
            %(hospital_id)s,
            %(department_id)s,
            %(opd_total_tokens)s,
            %(opd_waiting_tokens)s,
            %(opd_serving_tokens)s,
            %(opd_completed_tokens)s,
            %(opd_cancelled_tokens)s,
            %(opd_active_counters)s,
            %(opd_avg_wait_minutes)s,
            %(opd_avg_service_minutes)s,
            %(total_beds)s,
            %(available_beds)s,
            %(occupied_beds)s,
            %(reserved_beds)s,
            %(cleaning_beds)s,
            %(out_of_service_beds)s,
            %(icu_total_beds)s,
            %(icu_available_beds)s,
            %(icu_occupied_beds)s,
            %(bed_occupancy_rate)s,
            %(admissions_total)s,
            %(admissions_active)s,
            %(admissions_discharged)s,
            %(inventory_items_total)s,
            %(inventory_low_stock_count)s,
            %(inventory_out_of_stock_count)s,
            %(is_simulated)s,
            %(data_confidence_notice)s
        )
        ON CONFLICT (
            snapshot_timestamp,
            snapshot_period,
            aggregate_level,
            COALESCE(hospital_id, '__CITY__'),
            COALESCE(department_id, '__ALL__')
        )
        DO UPDATE SET
            opd_total_tokens = EXCLUDED.opd_total_tokens,
            opd_waiting_tokens = EXCLUDED.opd_waiting_tokens,
            opd_serving_tokens = EXCLUDED.opd_serving_tokens,
            opd_completed_tokens = EXCLUDED.opd_completed_tokens,
            opd_cancelled_tokens = EXCLUDED.opd_cancelled_tokens,
            opd_active_counters = EXCLUDED.opd_active_counters,
            opd_avg_wait_minutes = EXCLUDED.opd_avg_wait_minutes,
            opd_avg_service_minutes = EXCLUDED.opd_avg_service_minutes,
            total_beds = EXCLUDED.total_beds,
            available_beds = EXCLUDED.available_beds,
            occupied_beds = EXCLUDED.occupied_beds,
            reserved_beds = EXCLUDED.reserved_beds,
            cleaning_beds = EXCLUDED.cleaning_beds,
            out_of_service_beds = EXCLUDED.out_of_service_beds,
            icu_total_beds = EXCLUDED.icu_total_beds,
            icu_available_beds = EXCLUDED.icu_available_beds,
            icu_occupied_beds = EXCLUDED.icu_occupied_beds,
            bed_occupancy_rate = EXCLUDED.bed_occupancy_rate,
            admissions_total = EXCLUDED.admissions_total,
            admissions_active = EXCLUDED.admissions_active,
            admissions_discharged = EXCLUDED.admissions_discharged,
            inventory_items_total = EXCLUDED.inventory_items_total,
            inventory_low_stock_count = EXCLUDED.inventory_low_stock_count,
            inventory_out_of_stock_count = EXCLUDED.inventory_out_of_stock_count,
            is_simulated = EXCLUDED.is_simulated,
            data_confidence_notice = EXCLUDED.data_confidence_notice,
            created_at = NOW();
    """

    cursor = conn.cursor()
    cursor.executemany(upsert_sql, snapshots)
    conn.commit()
    cursor.close()
    print(f"[ETL LOAD] Successfully upserted {len(snapshots)} rows to `city_aggregate_snapshot`.")
    return len(snapshots)


def export_json(snapshots, output_file=None):
    """
    Exports aggregate snapshot payload to JSON for inspection and auditing.
    """
    os.makedirs(DEFAULT_OUTPUT_DIR, exist_ok=True)
    target_path = output_file or os.path.join(DEFAULT_OUTPUT_DIR, "city_aggregate_snapshots.json")

    # Serialize datetimes and Decimals
    def json_serializer(obj):
        if isinstance(obj, (datetime, pd.Timestamp)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Type {type(obj)} not serializable")

    with open(target_path, "w") as f:
        json.dump(snapshots, f, indent=2, default=json_serializer)

    print(f"[ETL EXPORT] Exported snapshots to {target_path}")
    return target_path


def run_pipeline(period="HOURLY", timestamp_str=None, dry_run=False, output_json=True, db_url=None):
    """
    End-to-end execution of the operational telemetry ETL pipeline.
    """
    print("=" * 70)
    print("PS-75 Hospital Operations Coordination Platform - Operational Telemetry ETL")
    print(f"Execution Period: {period}")
    print("=" * 70)

    if period not in VALID_PERIODS:
        raise ValueError(f"Invalid period '{period}'. Must be one of {VALID_PERIODS}")

    snapshot_timestamp = None
    if timestamp_str:
        snapshot_timestamp = datetime.fromisoformat(timestamp_str)
    else:
        snapshot_timestamp = datetime.now(timezone.utc).replace(microsecond=0)

    conn = get_connection(db_url)
    try:
        raw_data = extract_operational_data(conn)
        snapshots = aggregate_all(raw_data, snapshot_timestamp, period=period)

        if output_json:
            export_json(snapshots)

        if dry_run:
            print("[ETL DRY-RUN] Skipping database persistence (--dry-run flag enabled).")
        else:
            load_snapshots_to_db(conn, snapshots)

        # Print quick telemetry summary
        city_snap = next((s for s in snapshots if s["aggregate_level"] == "CITY"), None)
        if city_snap:
            print("\n" + "=" * 70)
            print("CITY-WIDE OPERATIONAL TELEMETRY SNAPSHOT")
            print("=" * 70)
            print(f"Timestamp:              {city_snap['snapshot_timestamp']}")
            print(f"Period:                 {city_snap['snapshot_period']}")
            print(f"Total Monitored Beds:   {city_snap['total_beds']}")
            print(f"Available Beds:         {city_snap['available_beds']}")
            print(f"Occupied Beds:          {city_snap['occupied_beds']}")
            print(f"Bed Occupancy Rate:     {city_snap['bed_occupancy_rate']}%")
            print(f"ICU Total / Available:  {city_snap['icu_total_beds']} / {city_snap['icu_available_beds']}")
            print(f"OPD Waiting Tokens:     {city_snap['opd_waiting_tokens']}")
            print(f"OPD Active Counters:    {city_snap['opd_active_counters']}")
            print(f"Admissions Pipeline:    {city_snap['admissions_active']} active ({city_snap['admissions_total']} total)")
            print(f"Low Stock Alerts:       {city_snap['inventory_low_stock_count']}")
            print(f"Out of Stock Alerts:    {city_snap['inventory_out_of_stock_count']}")
            print(f"Simulated Flag:         {city_snap['is_simulated']}")
            print(f"Confidence Notice:      {city_snap['data_confidence_notice']}")
            print("=" * 70)

        return snapshots
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Generate periodic operational aggregate city snapshots.")
    parser.add_argument(
        "--period",
        choices=VALID_PERIODS,
        default="HOURLY",
        help="Snapshot period granularity (default: HOURLY)",
    )
    parser.add_argument(
        "--timestamp",
        type=str,
        default=None,
        help="ISO-8601 formatted snapshot timestamp (e.g. 2026-10-08T18:00:00Z)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract and compute without writing to database",
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Do not export snapshots to JSON file",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Override database connection URL",
    )

    args = parser.parse_args()
    run_pipeline(
        period=args.period,
        timestamp_str=args.timestamp,
        dry_run=args.dry_run,
        output_json=not args.no_json,
        db_url=args.db_url,
    )


if __name__ == "__main__":
    main()
