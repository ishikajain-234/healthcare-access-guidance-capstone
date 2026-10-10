# Technology Stack & Architectural Justifications

> **Document Path**: `docs/architecture/tech-stack.md`  
> **Status**: Architecture Freeze v2.1  
> **System**: Healthcare Access Guidance & Operations Platform

---

## 1. Architectural Stack Summary

The platform uses a decoupled multi-tier architecture comprising a modern single-page frontend, a hardened REST API gateway, an ACID-compliant relational storage engine, and a Python-based data engineering batch aggregator.

| Layer | Primary Technology | Version | Key Libraries & Modules | Role in Architecture |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | React | `^18.3.1` | Vite 5, Tailwind CSS 3, Lucide React | Single-page user interface for Citizen Guidance and Staff Operations Console |
| **Backend API** | Node.js / Express | Node 18+ / `^4.19.2` | Zod 3, Helmet 8, Morgan, CORS, pg, uuid | REST API gateway, input validation, state machine enforcement, and business services |
| **Database** | PostgreSQL | `14+` | `uuid-ossp`, PL/pgSQL Triggers | 17-table relational storage engine, ACID integrity, composite FKs, append-only triggers |
| **ETL & Telemetry** | Python | `3.9+ / 3.12` | pandas 2.0+, psycopg2-binary 2.9+, dotenv | Periodic offline batch extraction, metric rollups, and municipal hierarchical snapshots |
| **Testing** | Jest / Supertest | `^29.7.0` / `^7.0.0` | Node native test runner (`node --test`) | In-band backend integration test suite and frontend unit test suites |

---

## 2. Layer-by-Layer Technical Evaluation & Justifications

### 2.1 Presentation Layer (Frontend)

```
[ User Browser ]
       |
  (React 18.3.1)
  ├── AppShell (Navigation, Facility Selector, Operational System Status)
  ├── Staff Operations Console (Dashboard, OPD Queue, Beds, Admissions, Inventory, City Overview)
  ├── Citizen Access Guidance Flow (Controlled Dropdowns, Statutory Route Cards, Completion)
  └── Admin Telemetry & Data Quality Audit Ledger
```

- **React 18 (`^18.3.1`)**:
  - *Justification*: Provides declarative component-driven UI state management and virtual DOM reconciliation. Allows dynamic operational interfaces (such as live OPD queue updates, bed state changes, and inventory tables) to update cleanly without full page reloads.
  - *State Architecture*: Employs clean state-driven view management via `AppShell.jsx` (`currentView` states: `DASHBOARD`, `OPD_QUEUE`, `BEDS`, `ADMISSIONS`, `INVENTORY`, `ANALYTICS`, `CITY_OVERVIEW`, `CITIZEN_GUIDANCE`, `GUIDANCE_ADMIN`). This eliminates external routing overhead and ensures robust navigation state determinism.
- **Vite 5 (`^5.3.3`)**:
  - *Justification*: Native ECMAScript Module (ESM) serving during development enables instant Hot Module Replacement (HMR). Rollup-based production bundling produces highly optimized, minified static assets with zero unnecessary runtime polyfills.
  - *Proxy Integration*: Configured with built-in development proxy (`/api` &rarr; `http://localhost:5001`), preventing CORS friction during local academic development.
- **Tailwind CSS 3 (`^3.4.4`)**:
  - *Justification*: Utility-first styling framework that compiles to a lean, purposed CSS footprint via PostCSS. Eliminates runtime CSS-in-JS performance bottlenecks and guarantees visual consistency across high-density operational consoles and responsive mobile citizen guidance screens.
- **Lucide React (`^0.400.0`)**:
  - *Justification*: Lightweight, tree-shakeable SVG icon set providing clear visual cues for hospital departments, bed states (available, occupied, cleaning), queue counters, and alert levels without large asset overhead.

---

### 2.2 Application Gateway & API Server (Backend)

```
[ Client Request ]
       |
  (Express 4.19.2)
  ├── Security Layer (Helmet 8.3, CORS, Morgan)
  ├── Authorization Boundary (requireAdmin for /api/admin/*)
  ├── Safety & Validation Layer (Zod Unknown-Key Rejection & Param Checking)
  ├── State Machine Controllers (Guidance, OPD, Beds, Admissions, Inventory)
  └── Database Access (node-postgres Pool with Parameterized Queries)
```

- **Node.js 18+ (LTS) & Express 4 (`^4.19.2`)**:
  - *Justification*: Event-driven, non-blocking I/O model makes Node.js well suited for coordinating I/O-intensive database queries and analytical computations. Express provides a minimalist, composable middleware pipeline where security, validation, and authorization can be strictly isolated.
- **Zod 3 (`^3.23.8`)**:
  - *Justification*: Schema-first runtime validation library. Every endpoint is backed by strict schemas (`.strict()`) that automatically strip or reject unexpected payload keys.
  - *Security Impact*: Rejection of unexpected keys prevents mass assignment vulnerabilities, prevents free-text injection, and enforces that public guidance inputs only select allowlisted category tokens (`DEMO_ALPHA`, `DEMO_BETA`, `DEMO_GAMMA`, `NO_MATCH_DEMO`).
- **Helmet 8 (`^8.3.0`) & CORS (`^2.8.5`)**:
  - *Justification*: Implements standard security hygiene by injecting HTTP protection headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, Content Security Policy) and restricting cross-origin resource sharing to trusted origins.
- **UUID (`^10.0.0`)**:
  - *Justification*: RFC 4122-compliant v4 UUID generation for anonymous session identifiers (`session_id`), queue tokens (`token_id`), inpatient admissions (`admission_id`), and inventory transactions (`transaction_id`). Prevents predictable sequential ID enumeration.
- **pg / node-postgres (`^8.12.0`)**:
  - *Justification*: High-performance native PostgreSQL client for Node.js. Uses connection pooling (`pg.Pool`) with configurable client limits and query timeouts. Parameterized SQL queries are enforced across 100% of repository database operations to systematically prevent SQL injection.

---

### 2.3 Database Engine & Relational Storage

```
[ PostgreSQL 14+ Relational Engine ]
  ├── Extensions: uuid-ossp (uuid_generate_v4)
  ├── 17 Relational Tables (Public Guidance, Operations, Telemetry)
  ├── Strict Foreign Key Hierarchies & Composite Constraints
  └── PL/pgSQL Immutability & Transition Triggers:
      ├── trg_prevent_guidance_event_mutation (guidance_event)
      ├── trg_validate_bed_state_transition (bed)
      ├── trg_validate_admission_bed_hierarchy (admission)
      └── trg_prevent_inventory_transaction_mutation (inventory_transaction)
```

- **PostgreSQL 14+**:
  - *Justification*: ACID compliance, rich SQL standard support, native JSONB querying, and PL/pgSQL procedural language support. It guarantees that data consistency and security constraints are enforced at the database layer, independent of application code.
- **PL/pgSQL Trigger Functions**:
  - `prevent_guidance_event_mutation()`: Blocks `UPDATE` and `DELETE` on `guidance_event`, guaranteeing an immutable append-only audit trail.
  - `validate_bed_state_transition()`: Validates that bed status transitions strictly follow allowed state paths (`AVAILABLE` &rarr; `RESERVED` / `OUT_OF_SERVICE`; `RESERVED` &rarr; `OCCUPIED` / `AVAILABLE`; `OCCUPIED` &rarr; `CLEANING`; `CLEANING` &rarr; `AVAILABLE`; `OUT_OF_SERVICE` &rarr; `AVAILABLE`).
  - `validate_admission_bed_hierarchy()`: Verifies that when a bed is allocated to an inpatient admission, the bed's `hospital_id` and `ward_id` exactly match the admission's assigned hospital and ward.
  - `prevent_inventory_transaction_mutation()`: Blocks `UPDATE` and `DELETE` on `inventory_transaction`, creating an immutable dispensary stock ledger.
- **Composite Keys & Unique Indexes**:
  - Enforces facility boundaries (e.g., `department(hospital_id, department_id)`, `bed_ward(hospital_id, ward_id)`, `inventory_item(hospital_id, item_id)`).
  - Uses composite unique arbiter index `uq_city_snap_slot` on `city_aggregate_snapshot` to guarantee idempotent upsert operations during batch ETL runs.

---

### 2.4 Data Engineering & Batch Telemetry (ETL)

```
[ Operational Database Tables ]
       |
  (Python 3.12 / pandas 2.0 / psycopg2)
  ├── transform_events.py (Daily Event Aggregation & Transition Counts)
  │     └── Upserts -> analytics_summary
  └── aggregate_city_snapshot.py (Hierarchical Telemetry Aggregator)
        ├── Level 1: DEPARTMENT Rollup (Queues, Service Rates)
        ├── Level 2: HOSPITAL Rollup (Beds, Occupancy, Inpatients, Stock)
        └── Level 3: CITY Rollup (Municipal Multi-Hospital Aggregations)
              └── Idempotent Upsert -> city_aggregate_snapshot
```

- **Python 3.9+ / 3.12**:
  - *Justification*: Standard programming language for data engineering and numerical processing. Decouples heavy batch aggregations and statistical computations from the user-facing web server.
- **pandas (`>=2.0.0`)**:
  - *Justification*: High-performance vector operations and DataFrame aggregations. Used to compute transition frequency distributions, queue duration averages, bed occupancy percentages, and inventory reorder metrics.
- **psycopg2-binary (`>=2.9.9`)**:
  - *Justification*: Native C-based PostgreSQL adapter providing high-throughput batch extraction and parameterized upsert operations using `RealDictCursor`.
- **Analytical Queuing Theory Engine (`mmc.js`)**:
  - *Justification*: Implements pure mathematical Kendall M/M/c multiserver queueing calculations (Erlang-C formula) directly within the backend. Computes theoretical wait times ($W_q$), expected queue lengths ($L_q$), and server utilization ($\rho$) as an analytical baseline against observed operational metrics.

---

### 2.5 Testing Frameworks & Verification

- **Jest (`^29.7.0`) & Supertest (`^7.0.0`)**:
  - *Justification*: In-band integration testing (`--runInBand --detectOpenHandles`) allows sequential, hermetic test runs against the PostgreSQL database. Validates HTTP status codes, Zod error payloads, state machine transitions, and database trigger violation exceptions across 23 backend integration tests.
- **Node.js Native Test Runner (`node --test`)**:
  - *Justification*: Zero-dependency test runner used for rapid verification of frontend components and utility modules (`tests/staffOperationsConsole.test.js`), ensuring zero build-time overhead.

---

### 2.6 Deployment Topology & Environment Configuration

- **Twelve-Factor App Configuration**:
  - All sensitive and environment-specific settings are loaded from `.env` files via `dotenv`:
    - `PORT`: API server port (default `5001`).
    - `DATABASE_URL`: PostgreSQL connection string (`postgresql://postgres:postgres@localhost:5432/healthcare_guidance_db`).
    - `ALLOW_UNAUTHENTICATED_ADMIN_DEMO`: Explicit boolean flag (`true`/`false`) strictly isolating local academic evaluation from staging/production security postures.
- **Containerization Readiness**:
  - The repository's clean multi-directory structure (`apps/web`, `apps/api`, `etl/`, `database/`) allows straightforward container packaging:
    - `apps/web`: Multi-stage build producing static files served by Nginx or Caddy.
    - `apps/api`: Node Alpine runtime container.
    - `etl`: Scheduled cron container or Kubernetes CronJob.
    - `database`: PostgreSQL 14+ container with volume mount for persistent storage.
