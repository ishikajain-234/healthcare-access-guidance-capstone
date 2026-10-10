# Healthcare Access Guidance & Operations Platform

> **Academic Capstone Notice**: This repository contains the complete implementation for an Application Programming (AP) and Data Engineering (DE) capstone project. It is an **educational, safe, simulated prototype** evaluating administrative public-reference guidance mechanisms and municipal hospital operational coordination.
>
> **CRITICAL SAFETY BOUNDARIES**:
> - **NOT a clinical triage or medical diagnosis system**: Zero symptom intake, clinical triage, medical advice, or treatment decisions.
> - **NOT an official government portal, PM-JAY system, or live hospital EHR**: Does not determine or guarantee scheme eligibility, coverage, cashless treatment, or claim pre-authorization.
> - **ZERO Personal Health Data (No PII)**: No Aadhaar numbers, ABHA IDs, mobile numbers, patient names, or personal health records are stored, accepted, or logged.
> - **Student-Team-Reviewed Synthetic Demonstration Data Only**: All entities (facilities, departments, counters, beds, admissions, medications, and aggregate snapshots) are strictly synthetic and explicitly labeled with `is_simulated = TRUE`.
> - **Controlled Dropdown Inputs Only**: Citizen guidance inputs are restricted to allowlisted dropdown enums (`DEMO_ALPHA`, `DEMO_BETA`, `DEMO_GAMMA`, `NO_MATCH_DEMO`). Free-text query bars and file uploads are disabled by design.
> - **Generic Informational Guidance**: Displays standardized informational cards directing citizens to official statutory channels without claiming live verification.

---

## 1. System Architecture & Relational Schema (17 Tables — Architecture Freeze v2.1)

Authoritative architectural blueprints, engineering justifications, and Mermaid diagrams are located in [`docs/architecture/`](./docs/architecture/README.md):
- **[Architecture Overview & Index](./docs/architecture/README.md)**
- **[Technology Stack & Justification](./docs/architecture/tech-stack.md)**
- **[17-Table Entity-Relationship Diagram](./docs/architecture/er-diagram.md)**
- **[Data Flow Diagram — Level 0 (System Context)](./docs/architecture/dfd-level-0.md)**
- **[Data Flow Diagram — Level 1 (Subsystem Processes)](./docs/architecture/dfd-level-1.md)**
- **[End-to-End System Architecture](./docs/architecture/system-architecture.md)**
- **[Production Deployment & Containerization Guide](./docs/deployment.md)**

The PostgreSQL database enforces exactly **17 tables** across three operational domains:

1. **Citizen Guidance Core (7 Tables)**:
   - `source_document`: Reference source specification, SHA-256 integrity hash, non-authoritative flag.
   - `source_import_run`: Audit execution ledger of seed imports (`STUDENT_TEAM_REVIEWED_SYNTHETIC`).
   - `package_reference`: Controlled demonstration catalogue of synthetic reference items (`DEMO-ALPHA-001`).
   - `guidance_session`: Anonymous UUID session tracker and deterministic 7-state finite state machine.
   - `guidance_event`: Append-only audit event ledger (protected via `trg_prevent_guidance_event_mutation`).
   - `data_quality_issue`: Automated integrity and orphan-event anomaly ledger.
   - `analytics_summary`: Rollup telemetry table populated by `etl/transform_events.py`.
2. **Hospital Operations Foundation (9 Tables)**:
   - `hospital`: Municipal facility registry (LNJP, GTB, DDU).
   - `department`: Department hierarchy per hospital (General Medicine, Cardiology, Orthopedics, Emergency).
   - `opd_queue_counter`: Physical and virtual consultation counters per department.
   - `opd_token`: Logical FIFO queue tokens with state machine and timestamp tracking (`chk_opd_token_status`).
   - `bed_ward`: Hospital wards with capacity tracking (`GENERAL`, `ICU`, `EMERGENCY`).
   - `bed`: Physical bed inventory with finite state machine (`trg_validate_bed_state_transition`).
   - `admission`: Inpatient admission pipeline with bed allocation validation (`trg_validate_admission_bed_hierarchy`).
   - `inventory_item`: Synthetic medicine and consumable dispensary inventory.
   - `inventory_transaction`: Append-only stock ledger (protected via `trg_prevent_inventory_transaction_mutation`).
3. **Municipal Operational Telemetry (1 Table)**:
   - `city_aggregate_snapshot`: Periodic offline multi-tier operational telemetry snapshots (`DEPARTMENT`, `HOSPITAL`, `CITY` levels) populated by `etl/aggregate_city_snapshot.py`.

```
 Citizen Browser               Hospital Staff Console           Municipal Public Portal
       │                                  │                                │
       ▼                                  ▼                                ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         Web Frontend (apps/web)                             │
 │   - Anonymous Guidance Journey         - Operational Dashboard              │
 │   - Category Reference Lookup          - Live OPD Queue Manager             │
 │   - Emergency Route Cards              - Ward Bed Allocator                 │
 │   - Public City Overview               - Dispensary Inventory Tracker       │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ Canonical REST API (JSON)
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         Express REST API (apps/api)                         │
 │   - Helmet Security Headers            - In-Memory IP Rate Limiting         │
 │   - requireAdmin Authorization         - requireStaff Authorization         │
 │   - Zod Strict Schema Validation       - M/M/c Erlang-C Theoretical Engine  │
 │   - Finite State Controllers           - pg.Pool Connection Manager         │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ Parameterized SQL Queries
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                    PostgreSQL Database (17 Tables)                          │
 │   - Guidance Core (7 tables)           - Hospital Ops Foundation (9 tables) │
 │   - Municipal Telemetry (1 table)      - Database Immutability Triggers     │
 └──────────────────────────────────────▲──────────────────────────────────────┘
                                        │ Periodic Batch Rollups
 ┌──────────────────────────────────────┴──────────────────────────────────────┐
 │                         Python ETL Pipelines (etl/)                         │
 │   - transform_events.py: Session rollup -> analytics_summary                │
 │   - aggregate_city_snapshot.py: Facility metrics -> city_aggregate_snapshot│
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Authorization Reference

### Public Endpoints (Zero Credentials / Zero PII)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check with environment and uptime status |
| `GET` | `/api/categories` | Controlled guidance categories allowlist |
| `POST` | `/api/guidance/sessions` | Create anonymous guidance session (rate-limited) |
| `POST` | `/api/guidance/search` | Search synthetic reference catalogue by category |
| `POST` | `/api/guidance/official-route` | View official statutory confirmation route |
| `POST` | `/api/guidance/support-route` | View non-matched recovery support route |
| `POST` | `/api/guidance/complete` | Conclude session and finalize audit timeline |
| `GET` | `/api/guidance/sessions/:id` | Retrieve anonymous session timeline and events |
| `GET` | `/api/reference-packages` | List synthetic demonstration reference packages |
| `GET` | `/api/official-support-routes` | Generic statutory routing card |
| `GET` | `/api/city/overview` | Latest municipal operational telemetry rollup |
| `GET` | `/api/city/snapshots` | Filterable historical municipal telemetry snapshots |
| `GET` | `/api/hospitals` | Municipal hospital directory |
| `GET` | `/api/hospitals/:id/departments`| Hospital department directory |
| `GET` | `/api/hospitals/:id/departments/:deptId/counters` | Department consultation counters |
| `GET` | `/api/opd/tokens` | Public queue inspection |
| `POST` | `/api/opd/tokens` | Anonymous queue token issuance kiosk |
| `GET` | `/api/opd/analytics` | Observed queue metrics and theoretical M/M/c benchmark |
| `GET` | `/api/beds` | Bed availability inspection |
| `GET` | `/api/admissions` | Inpatient admission status inspection |
| `GET` | `/api/inventory/items` | Dispensary stock inspection |
| `GET` | `/api/inventory/availability` | Low-stock and out-of-stock supply alerts |

### Staff Operations Endpoints (`requireStaff`)
Protected by `requireStaff` middleware. In production, requests require `Authorization: Bearer <staff-token>` (or admin token).
| Method | Endpoint | Action |
| :--- | :--- | :--- |
| `POST` | `/api/opd/tokens/:id/call` | Call waiting token to consultation counter (`WAITING` &rarr; `CALLED`) |
| `POST` | `/api/opd/tokens/:id/start` | Begin consultation service (`CALLED` &rarr; `IN_SERVICE`) |
| `POST` | `/api/opd/tokens/:id/complete` | Complete consultation service (`IN_SERVICE` &rarr; `COMPLETED`) |
| `POST` | `/api/opd/tokens/:id/cancel` | Cancel consultation token (`CANCELLED`) |
| `POST` | `/api/beds/:id/reserve` | Reserve available bed for transport (`AVAILABLE` &rarr; `RESERVED`) |
| `POST` | `/api/beds/:id/occupy` | Occupy reserved bed (`RESERVED` &rarr; `OCCUPIED`) |
| `POST` | `/api/beds/:id/clean` | Mark vacated bed for sanitation (`OCCUPIED` &rarr; `CLEANING`) |
| `POST` | `/api/beds/:id/release` | Release sanitized bed to pool (`CLEANING` &rarr; `AVAILABLE`) |
| `POST` | `/api/beds/:id/out-of-service` | Mark bed for maintenance (`OUT_OF_SERVICE`) |
| `POST` | `/api/beds/:id/restore` | Restore maintained bed to pool (`AVAILABLE`) |
| `POST` | `/api/admissions` | Create inpatient admission request |
| `POST` | `/api/admissions/:id/pending-review` | Mark admission for bed coordinator review |
| `POST` | `/api/admissions/:id/assign-bed` | Allocate available ward bed to patient |
| `POST` | `/api/admissions/:id/confirm` | Confirm intake transport logistics |
| `POST` | `/api/admissions/:id/admit` | Officially admit patient to ward |
| `POST` | `/api/admissions/:id/discharge` | Discharge patient and route bed for cleaning |
| `POST` | `/api/admissions/:id/cancel` | Cancel admission request and release allocated bed |
| `POST` | `/api/inventory/items/:id/receive` | Receive synthetic stock shipment (`RECEIPT`) |
| `POST` | `/api/inventory/items/:id/issue` | Dispense synthetic stock to ward (`ISSUE`) |
| `POST` | `/api/inventory/items/:id/adjust` | Reconcile physical inventory (`ADJUSTMENT`) |
| `POST` | `/api/inventory/items/:id/transfer-in` | Inter-facility stock transfer in (`TRANSFER_IN`) |
| `POST` | `/api/inventory/items/:id/transfer-out` | Inter-facility stock transfer out (`TRANSFER_OUT`) |

### Admin Endpoints (`requireAdmin`)
Protected by `requireAdmin` middleware. In production, requests require `Authorization: Bearer <admin-token>`.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/analytics/summary` | Telemetry rollup: sessions, completion rate, event frequencies |
| `GET` | `/api/admin/analytics/data-quality` | Data quality audit log and orphan event detection |

---

## 3. Quickstart & Demonstration Execution

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Python**: v3.10 or higher with `venv`
- **Git**

### Step 1: Database Setup
```bash
# Create local PostgreSQL database
createdb healthcare_guidance_db

# Apply all 10 schema migrations in sequence
for f in database/migrations/*.sql; do
    psql -d healthcare_guidance_db -f "$f"
done
```

### Step 2: Seed Complete Demonstration Dataset
A single master command idempotently seeds all 17 tables and executes both ETL aggregators:
```bash
./scripts/seed_demo_data.sh
```
*Alternatively, from the backend directory:*
```bash
cd apps/api && npm run seed
```

### Step 3: Run Backend API & Tests
```bash
cd apps/api
cp .env.example .env
npm install
npm test              # Executes 150/150 integration tests across 9 test suites
node src/server.js    # Runs API on http://localhost:5001
```

### Step 4: Run Web Frontend & Tests
```bash
cd apps/web
npm install
npm test              # Executes 13/13 frontend operational tests
npm run build         # Verifies Vite production build (1542 modules transformed)
npm run dev           # Starts development server on http://localhost:5173
```

### Step 5: Run Python ETL Aggregators & Tests
```bash
cd etl
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m unittest discover -s . -p "test_*.py"  # Executes 15/15 ETL tests
python aggregate_city_snapshot.py               # Generates Table #17 city snapshots
python transform_events.py                      # Generates Table #6 guidance telemetry
```

---

## 4. Automated Verification Results

All automated test suites pass cleanly across every subsystem:

| Subsystem | Suite / Command | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | `npm test` in `apps/api` | **150 / 150** | 0 | **PASSING** |
| **Frontend Web** | `npm test` in `apps/web` | **13 / 13** | 0 | **PASSING** |
| **Frontend Build**| `npm run build` in `apps/web` | **1542 modules** | 0 | **CLEAN BUILD** |
| **Python ETL** | `python -m unittest discover` in `etl` | **15 / 15** | 0 | **PASSING** |
| **Database Seed**| `./scripts/seed_demo_data.sh` | **17 tables** | 0 | **100% IDEMPOTENT** |

---

## 5. Demonstration Walkthrough Guide

### Journey 1: Anonymous Citizen Guidance Flow
1. Navigate to `http://localhost:5173/`.
2. Review the academic safety disclaimer (Zero clinical triage / non-governmental status).
3. Click **"Start Anonymous Guidance"** &rarr; session is initialized without storing names, phone numbers, or Aadhaar numbers.
4. Select a controlled demonstration category (e.g. `DEMO_ALPHA` or `NO_MATCH_DEMO`).
5. **Match Found**: View synthetic procedure record (`DEMO-ALPHA-001`), followed by the official statutory route card.
6. **No Match**: View the safe recovery route card explaining prototype scope limitations.
7. Click **"Acknowledge & Complete"** &rarr; session transitions to `GUIDANCE_COMPLETED` and appends immutable timeline events.

### Journey 2: Hospital Staff Operations Console
1. Navigate to `http://localhost:5173/dashboard`.
2. Select a hospital (e.g., **Lok Nayak Jai Prakash Hospital - LNJP**).
3. **OPD Queue**:
   - Inspect General Medicine queue.
   - Issue a new token &rarr; token enters `WAITING` status.
   - Click **"Call Token"** &rarr; assigned to Counter 1 (`CALLED`).
   - Click **"Start Service"** &rarr; transitions to `IN_SERVICE`.
   - Click **"Complete Service"** &rarr; service duration recorded, transitions to `COMPLETED`.
4. **Queue Theory Benchmark**:
   - Compare observed waiting time against theoretical M/M/c queue prediction.
   - Adjust arrival rate $\lambda$ and service rate $\mu$ to observe traffic intensity $\rho$ and stability condition $\rho < 1$.
5. **Bed Management**:
   - Inspect General Ward and ICU bed availability.
   - Transition bed states: `AVAILABLE` &rarr; `RESERVED` &rarr; `OCCUPIED` &rarr; `CLEANING` &rarr; `AVAILABLE`.
6. **Inpatient Admissions**:
   - Progress admission from `ADMISSION_REQUESTED` &rarr; `PENDING_REVIEW` &rarr; `BED_ASSIGNED` &rarr; `CONFIRMED` &rarr; `ADMITTED` &rarr; `DISCHARGED`.
7. **Dispensary Inventory**:
   - Inspect stock levels with color-coded alerts (Low Stock, Out of Stock).
   - Record an append-only stock dispensation or receipt with audit rationale.

### Journey 3: Municipal Citywide Telemetry & Admin Analytics
1. Navigate to `http://localhost:5173/city-overview`.
2. Inspect citywide aggregate rollups derived from Table #17 `city_aggregate_snapshot`:
   - Monitored bed capacity, available beds, occupancy rate.
   - ICU capacity and availability across LNJP, GTB, and DDU.
   - Citywide OPD waiting queue size.
   - Low-stock and out-of-stock supply alerts.
   - Verified timestamps and periodic snapshot staleness alerts.
3. Navigate to `http://localhost:5173/admin`.
4. Inspect administrative telemetry: session start/completion rate, event type distribution, and data quality indicators.
