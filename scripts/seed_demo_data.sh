#!/usr/bin/env bash
# ==============================================================================
# seed_demo_data.sh
# Healthcare Access Guidance & Operations Platform
# Master Demonstration Dataset Seeding Script
#
# Idempotently initializes the synthetic demonstration state across all 17 tables:
# 1. 001_synthetic_seed.sql: Reference catalogue & source documents
# 2. 002_hospital_operations_seed.sql: Hospitals, departments, counters, beds,
#    OPD tokens, inpatient admissions, and inventory items/transactions
# 3. aggregate_city_snapshot.py: Computes citywide Table #17 aggregate rollups
# 4. transform_events.py: Computes Table #6 guidance telemetry rollups
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DB_NAME="${DB_NAME:-healthcare_guidance_db}"
DB_USER="${DB_USER:-postgres}"

echo "======================================================================"
echo "Healthcare Access Guidance & Operations Platform - Demo Data Seeding"
echo "Target Database: ${DB_NAME}"
echo "======================================================================"

echo "--> [1/4] Seeding synthetic reference catalogue..."
psql -d "${DB_NAME}" -f "${ROOT_DIR}/database/seeds/001_synthetic_seed.sql"

echo "--> [2/4] Seeding multi-hospital operational datasets..."
psql -d "${DB_NAME}" -f "${ROOT_DIR}/database/seeds/002_hospital_operations_seed.sql"

echo "--> [3/4] Executing Operational Telemetry ETL (Table #17)..."
PYTHON_CMD="python"
if [ -f "${ROOT_DIR}/etl/venv/bin/python" ]; then
    PYTHON_CMD="${ROOT_DIR}/etl/venv/bin/python"
fi

PYTHONPATH="${ROOT_DIR}" "${PYTHON_CMD}" "${ROOT_DIR}/etl/aggregate_city_snapshot.py"

echo "--> [4/4] Executing Guidance Telemetry ETL (Table #6)..."
PYTHONPATH="${ROOT_DIR}" "${PYTHON_CMD}" "${ROOT_DIR}/etl/transform_events.py"

echo "======================================================================"
echo "Demonstration seeding successfully completed across all 17 tables."
echo "======================================================================"
