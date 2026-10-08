"""
test_aggregate_city_snapshot.py
Focused unit and integration test suite for the Operational Telemetry ETL Pipeline.

Tests:
  1. OPD metric aggregation correctness (token statuses, durations, counters)
  2. Bed capacity and occupancy metric calculation (ward joining, ICU filtering, rate capping)
  3. Admission pipeline tracking (active statuses vs discharged vs cancelled)
  4. Dispensary inventory alert calculations (reorder threshold vs out-of-stock)
  5. Empty and zero-data edge cases (no division by zero)
  6. Structural hierarchy and data confidence safety guarantees
  7. Live PostgreSQL integration and idempotent upserts
"""

import unittest
import warnings
from datetime import datetime, timezone, timedelta
import pandas as pd
import psycopg2

# Silence pandas DBAPI2 warning
warnings.filterwarnings("ignore", category=UserWarning)

from etl.aggregate_city_snapshot import (
    compute_opd_metrics,
    compute_bed_metrics,
    compute_admission_metrics,
    compute_inventory_metrics,
    compute_department_snapshots,
    compute_hospital_snapshots,
    compute_city_snapshots,
    aggregate_all,
    run_pipeline,
    get_connection,
    CONFIDENCE_NOTICE,
    VALID_PERIODS,
    VALID_LEVELS,
)


class TestOpdMetrics(unittest.TestCase):
    def test_opd_metrics_with_sample_tokens(self):
        t0 = datetime(2026, 10, 8, 10, 0, 0, tzinfo=timezone.utc)
        t_called = t0 + timedelta(minutes=10)
        t_start = t0 + timedelta(minutes=15)
        t_done = t0 + timedelta(minutes=30)

        df_tokens = pd.DataFrame([
            {
                "token_id": "tok-1",
                "status": "WAITING",
                "issued_at": t0,
                "called_at": None,
                "service_started_at": None,
                "service_completed_at": None,
            },
            {
                "token_id": "tok-2",
                "status": "CALLED",
                "issued_at": t0,
                "called_at": t_called,
                "service_started_at": None,
                "service_completed_at": None,
            },
            {
                "token_id": "tok-3",
                "status": "IN_SERVICE",
                "issued_at": t0,
                "called_at": t_called,
                "service_started_at": t_start,
                "service_completed_at": None,
            },
            {
                "token_id": "tok-4",
                "status": "COMPLETED",
                "issued_at": t0,
                "called_at": t_called,
                "service_started_at": t_start,
                "service_completed_at": t_done,
            },
            {
                "token_id": "tok-5",
                "status": "CANCELLED",
                "issued_at": t0,
                "called_at": None,
                "service_started_at": None,
                "service_completed_at": None,
            },
        ])

        df_counters = pd.DataFrame([
            {"counter_id": "c1", "is_active": True},
            {"counter_id": "c2", "is_active": True},
            {"counter_id": "c3", "is_active": False},
        ])

        metrics = compute_opd_metrics(df_tokens, df_counters)

        self.assertEqual(metrics["opd_total_tokens"], 5)
        self.assertEqual(metrics["opd_waiting_tokens"], 1)
        self.assertEqual(metrics["opd_serving_tokens"], 2)  # CALLED + IN_SERVICE
        self.assertEqual(metrics["opd_completed_tokens"], 1)
        self.assertEqual(metrics["opd_cancelled_tokens"], 1)
        self.assertEqual(metrics["opd_active_counters"], 2)

        # tok-3 and tok-4 both had 15 minutes wait time
        self.assertEqual(metrics["opd_avg_wait_minutes"], 15.00)
        # tok-4 had 15 minutes service time (10:15 to 10:30)
        self.assertEqual(metrics["opd_avg_service_minutes"], 15.00)

    def test_opd_metrics_empty_data(self):
        df_tokens = pd.DataFrame(columns=["token_id", "status", "issued_at", "service_started_at", "service_completed_at"])
        df_counters = pd.DataFrame(columns=["counter_id", "is_active"])

        metrics = compute_opd_metrics(df_tokens, df_counters)

        self.assertEqual(metrics["opd_total_tokens"], 0)
        self.assertEqual(metrics["opd_waiting_tokens"], 0)
        self.assertEqual(metrics["opd_serving_tokens"], 0)
        self.assertEqual(metrics["opd_completed_tokens"], 0)
        self.assertEqual(metrics["opd_cancelled_tokens"], 0)
        self.assertEqual(metrics["opd_active_counters"], 0)
        self.assertEqual(metrics["opd_avg_wait_minutes"], 0.00)
        self.assertEqual(metrics["opd_avg_service_minutes"], 0.00)


class TestBedMetrics(unittest.TestCase):
    def test_bed_metrics_calculation(self):
        df_wards = pd.DataFrame([
            {"ward_id": "w_gen", "ward_type": "GENERAL"},
            {"ward_id": "w_icu", "ward_type": "ICU"},
        ])

        df_beds = pd.DataFrame([
            {"bed_id": "b1", "ward_id": "w_gen", "current_state": "AVAILABLE"},
            {"bed_id": "b2", "ward_id": "w_gen", "current_state": "OCCUPIED"},
            {"bed_id": "b3", "ward_id": "w_gen", "current_state": "RESERVED"},
            {"bed_id": "b4", "ward_id": "w_gen", "current_state": "CLEANING"},
            {"bed_id": "b5", "ward_id": "w_gen", "current_state": "OUT_OF_SERVICE"},
            {"bed_id": "b6", "ward_id": "w_icu", "current_state": "AVAILABLE"},
            {"bed_id": "b7", "ward_id": "w_icu", "current_state": "OCCUPIED"},
        ])

        metrics = compute_bed_metrics(df_beds, df_wards)

        self.assertEqual(metrics["total_beds"], 7)
        self.assertEqual(metrics["available_beds"], 2)  # b1, b6
        self.assertEqual(metrics["occupied_beds"], 2)   # b2, b7
        self.assertEqual(metrics["reserved_beds"], 1)
        self.assertEqual(metrics["cleaning_beds"], 1)
        self.assertEqual(metrics["out_of_service_beds"], 1)

        # ICU breakdown
        self.assertEqual(metrics["icu_total_beds"], 2)
        self.assertEqual(metrics["icu_available_beds"], 1)
        self.assertEqual(metrics["icu_occupied_beds"], 1)

        # Occupancy rate: 2 occupied out of 7 total = 28.57%
        self.assertAlmostEqual(metrics["bed_occupancy_rate"], 28.57, places=2)

    def test_bed_metrics_empty_data(self):
        df_wards = pd.DataFrame(columns=["ward_id", "ward_type"])
        df_beds = pd.DataFrame(columns=["bed_id", "ward_id", "current_state"])

        metrics = compute_bed_metrics(df_beds, df_wards)

        self.assertEqual(metrics["total_beds"], 0)
        self.assertEqual(metrics["available_beds"], 0)
        self.assertEqual(metrics["occupied_beds"], 0)
        self.assertEqual(metrics["bed_occupancy_rate"], 0.00)
        self.assertEqual(metrics["icu_total_beds"], 0)


class TestAdmissionMetrics(unittest.TestCase):
    def test_admission_status_classification(self):
        df_admissions = pd.DataFrame([
            {"admission_id": "a1", "status": "ADMISSION_REQUESTED"},
            {"admission_id": "a2", "status": "PENDING_REVIEW"},
            {"admission_id": "a3", "status": "BED_ASSIGNED"},
            {"admission_id": "a4", "status": "ADMISSION_CONFIRMED"},
            {"admission_id": "a5", "status": "ADMITTED"},
            {"admission_id": "a6", "status": "DISCHARGED"},
            {"admission_id": "a7", "status": "CANCELLED"},
        ])

        metrics = compute_admission_metrics(df_admissions)

        self.assertEqual(metrics["admissions_total"], 7)
        self.assertEqual(metrics["admissions_active"], 5)     # a1 through a5
        self.assertEqual(metrics["admissions_discharged"], 1) # a6

    def test_admission_empty_data(self):
        df_admissions = pd.DataFrame(columns=["admission_id", "status"])
        metrics = compute_admission_metrics(df_admissions)

        self.assertEqual(metrics["admissions_total"], 0)
        self.assertEqual(metrics["admissions_active"], 0)
        self.assertEqual(metrics["admissions_discharged"], 0)


class TestInventoryMetrics(unittest.TestCase):
    def test_inventory_alert_classification(self):
        df_inventory = pd.DataFrame([
            {"item_id": "i1", "current_stock": 150, "reorder_threshold": 50},  # IN_STOCK
            {"item_id": "i2", "current_stock": 50, "reorder_threshold": 50},   # LOW_STOCK (stock == threshold)
            {"item_id": "i3", "current_stock": 20, "reorder_threshold": 50},   # LOW_STOCK (stock < threshold)
            {"item_id": "i4", "current_stock": 0, "reorder_threshold": 50},    # OUT_OF_STOCK
        ])

        metrics = compute_inventory_metrics(df_inventory)

        self.assertEqual(metrics["inventory_items_total"], 4)
        self.assertEqual(metrics["inventory_low_stock_count"], 2)   # i2 and i3
        self.assertEqual(metrics["inventory_out_of_stock_count"], 1) # i4

    def test_inventory_empty_data(self):
        df_inventory = pd.DataFrame(columns=["item_id", "current_stock", "reorder_threshold"])
        metrics = compute_inventory_metrics(df_inventory)

        self.assertEqual(metrics["inventory_items_total"], 0)
        self.assertEqual(metrics["inventory_low_stock_count"], 0)
        self.assertEqual(metrics["inventory_out_of_stock_count"], 0)


class TestHierarchyAndSafety(unittest.TestCase):
    def setUp(self):
        self.timestamp = datetime(2026, 10, 8, 12, 0, 0, tzinfo=timezone.utc)
        self.hospitals = pd.DataFrame([
            {"hospital_id": "HOSP_A", "hospital_name": "Hospital A"},
            {"hospital_id": "HOSP_B", "hospital_name": "Hospital B"},
        ])
        self.departments = pd.DataFrame([
            {"hospital_id": "HOSP_A", "department_id": "DEPT_A1"},
            {"hospital_id": "HOSP_B", "department_id": "DEPT_B1"},
        ])
        self.counters = pd.DataFrame([
            {"counter_id": "c1", "hospital_id": "HOSP_A", "department_id": "DEPT_A1", "is_active": True},
        ])
        self.tokens = pd.DataFrame(columns=["token_id", "hospital_id", "department_id", "status", "issued_at", "service_started_at", "service_completed_at"])
        self.wards = pd.DataFrame(columns=["ward_id", "hospital_id", "ward_type"])
        self.beds = pd.DataFrame(columns=["bed_id", "hospital_id", "ward_id", "current_state"])
        self.admissions = pd.DataFrame(columns=["admission_id", "hospital_id", "status"])
        self.inventory = pd.DataFrame(columns=["item_id", "hospital_id", "current_stock", "reorder_threshold"])

        self.data = {
            "hospitals": self.hospitals,
            "departments": self.departments,
            "counters": self.counters,
            "tokens": self.tokens,
            "wards": self.wards,
            "beds": self.beds,
            "admissions": self.admissions,
            "inventory": self.inventory,
        }

    def test_structural_hierarchy_constraints(self):
        snapshots = aggregate_all(self.data, self.timestamp, period="HOURLY")

        dept_snaps = [s for s in snapshots if s["aggregate_level"] == "DEPARTMENT"]
        hosp_snaps = [s for s in snapshots if s["aggregate_level"] == "HOSPITAL"]
        city_snaps = [s for s in snapshots if s["aggregate_level"] == "CITY"]

        self.assertEqual(len(dept_snaps), 2)
        self.assertEqual(len(hosp_snaps), 2)
        self.assertEqual(len(city_snaps), 1)

        # Hierarchy validation matching chk_city_snap_hierarchy
        for s in dept_snaps:
            self.assertIsNotNone(s["hospital_id"])
            self.assertIsNotNone(s["department_id"])

        for s in hosp_snaps:
            self.assertIsNotNone(s["hospital_id"])
            self.assertIsNone(s["department_id"])

        for s in city_snaps:
            self.assertIsNone(s["hospital_id"])
            self.assertIsNone(s["department_id"])

    def test_safety_metadata_and_notices(self):
        snapshots = aggregate_all(self.data, self.timestamp, period="HOURLY")

        for s in snapshots:
            self.assertTrue(s["is_simulated"])
            self.assertEqual(s["data_confidence_notice"], CONFIDENCE_NOTICE)
            self.assertIn(s["snapshot_period"], VALID_PERIODS)
            self.assertIn(s["aggregate_level"], VALID_LEVELS)
            # Ensure all counts are non-negative
            self.assertGreaterEqual(s["opd_total_tokens"], 0)
            self.assertGreaterEqual(s["total_beds"], 0)
            self.assertGreaterEqual(s["admissions_total"], 0)
            self.assertGreaterEqual(s["inventory_items_total"], 0)
            self.assertGreaterEqual(s["bed_occupancy_rate"], 0.00)
            self.assertLessEqual(s["bed_occupancy_rate"], 100.00)


class TestLivePostgresIntegration(unittest.TestCase):
    def test_pipeline_execution_and_idempotency(self):
        conn = get_connection()
        try:
            # First run: writes snapshots
            snaps_1 = run_pipeline(period="HOURLY", dry_run=False, output_json=True)
            self.assertGreater(len(snaps_1), 0)

            # Query database to verify rows exist
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM city_aggregate_snapshot;")
                count_after_1 = cur.fetchone()[0]
                self.assertGreater(count_after_1, 0)

                # Verify check constraints hold in live DB
                cur.execute("""
                    SELECT COUNT(*)
                    FROM city_aggregate_snapshot
                    WHERE (aggregate_level = 'CITY' AND (hospital_id IS NOT NULL OR department_id IS NOT NULL))
                       OR (aggregate_level = 'HOSPITAL' AND (hospital_id IS NULL OR department_id IS NOT NULL))
                       OR (aggregate_level = 'DEPARTMENT' AND (hospital_id IS NULL OR department_id IS NULL));
                """)
                invalid_hierarchy_count = cur.fetchone()[0]
                self.assertEqual(invalid_hierarchy_count, 0)

            # Second run: must be idempotent and succeed without duplicate key errors
            snaps_2 = run_pipeline(period="HOURLY", dry_run=False, output_json=False)
            self.assertEqual(len(snaps_1), len(snaps_2))

        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
