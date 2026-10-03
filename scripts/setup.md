# Project Setup & Execution Guide

This document outlines the step-by-step setup procedure for running the complete **Healthcare Access Guidance Prototype** vertical slice locally.

---

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Python**: v3.10 or higher
- **Git**

---

## 2. Database Initialization (7 Tables Schema)

The database schema defines 7 tables:
1. `source_document`: Reference source metadata, integrity hash, non-authoritative flag.
2. `source_import_run`: Execution audit log of seed imports.
3. `package_reference`: Controlled demonstration catalogue (fictional synthetic demo items).
4. `guidance_session`: Anonymous UUID-based session lifecycle and state machine tracking.
5. `guidance_event`: Database-enforced append-only audit event ledger (protected via trigger).
6. `data_quality_issue`: Integrity issue tracking ledger.
7. `analytics_summary`: Rollup summary table populated by the Python Data Engineering batch aggregation script.

Start the PostgreSQL service and execute:

```bash
# Connect to PostgreSQL and create database
createdb healthcare_guidance_db || psql -U postgres -c "CREATE DATABASE healthcare_guidance_db;"

# Navigate to project repository root
cd /Users/ishikajain/healthcare-access-guidance-capstone

# Apply database migration schema (Tables, Indexes, Constraints, Append-Only Trigger)
psql -U postgres -d healthcare_guidance_db -f database/migrations/001_initial_schema.sql

# Apply hardening patch migration (Foreign Keys, Backfill, NOT NULL, State Value Constraints)
psql -U postgres -d healthcare_guidance_db -f database/migrations/002_verification_hardening.sql

# Seed controlled student-team-reviewed synthetic reference records
psql -U postgres -d healthcare_guidance_db -f database/seeds/001_synthetic_seed.sql
```

Verify tables were created (expected: 7 relations) and unlinked packages (expected: 0):
```bash
psql -U postgres -d healthcare_guidance_db -c "\dt"
psql -U postgres -d healthcare_guidance_db -c "SELECT COUNT(*) AS unlinked_package_records FROM package_reference WHERE source_id IS NULL OR import_run_id IS NULL;"
```

---

## 3. Backend API Setup (`apps/api`)

```bash
# Navigate to backend directory
cd /Users/ishikajain/healthcare-access-guidance-capstone/apps/api

# Install dependencies
npm install

# Configure environment variables (defaults match localhost PostgreSQL)
cp ../../.env.example .env

# Run API test suite
npm test

# Start Express API server (runs on http://localhost:5000)
npm run dev
```

---

## 4. Frontend Web Application Setup (`apps/web`)

In a new terminal window:

```bash
# Navigate to frontend directory
cd /Users/ishikajain/healthcare-access-guidance-capstone/apps/web

# Install dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 5. Running the Data Engineering ETL Pipeline (`etl`)

In a third terminal window:

```bash
# Navigate to etl directory
cd /Users/ishikajain/healthcare-access-guidance-capstone/etl

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run ETL aggregation script
python transform_events.py
```

Check the generated output JSON:
```bash
cat output/analytics_metrics.json
```

---

## 6. End-to-End Smoke Testing via cURL (Canonical Unified Endpoints)

### A. Health Check
```bash
curl -s http://localhost:5000/api/health | jq .
```

### B. List Controlled Categories
```bash
curl -s http://localhost:5000/api/categories | jq .
```

### C. Start an Anonymous Guidance Session
```bash
SESSION_JSON=$(curl -s -X POST http://localhost:5000/api/guidance/sessions \
  -H "Content-Type: application/json" \
  -d '{}')
SESSION_ID=$(echo $SESSION_JSON | jq -r '.session_id')
echo "Initialized Session UUID: $SESSION_ID"
```

### D. Search Reference Package (Found Path)
```bash
curl -s -X POST http://localhost:5000/api/guidance/search \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"category_id\": \"DEMO_ALPHA\"
  }" | jq .
```

### E. View Official Route (Found Path)
```bash
curl -s -X POST http://localhost:5000/api/guidance/official-route \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\"
  }" | jq .
```

### F. Complete Guidance Session
```bash
curl -s -X POST http://localhost:5000/api/guidance/complete \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\"
  }" | jq .
```

### G. Inspect Session & Event Timeline
```bash
curl -s http://localhost:5000/api/guidance/sessions/$SESSION_ID | jq .
```

### H. Test Unmatched Category Search & Support Route
```bash
# 1. Start another session
S2_JSON=$(curl -s -X POST http://localhost:5000/api/guidance/sessions -H "Content-Type: application/json" -d '{}')
S2_ID=$(echo $S2_JSON | jq -r '.session_id')

# 2. Search unmatched category
curl -s -X POST http://localhost:5000/api/guidance/search \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$S2_ID\", \"category_id\": \"NO_MATCH_DEMO\"}" | jq .

# 3. View support route
curl -s -X POST http://localhost:5000/api/guidance/support-route \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$S2_ID\"}" | jq .

# 4. Complete session
curl -s -X POST http://localhost:5000/api/guidance/complete \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$S2_ID\"}" | jq .
```

### I. Reference Catalog & Official Informational Card
```bash
curl -s http://localhost:5000/api/reference-packages | jq .
curl -s http://localhost:5000/api/official-support-routes | jq .
```

### J. Admin Analytics & Data Quality Telemetry
```bash
curl -s http://localhost:5000/api/admin/analytics/summary | jq .
curl -s http://localhost:5000/api/admin/analytics/data-quality | jq .
```
