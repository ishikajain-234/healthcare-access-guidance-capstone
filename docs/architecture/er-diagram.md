# 17-Table Relational Entity-Relationship Diagram

> **Document Path**: `docs/architecture/er-diagram.md`  
> **Status**: Architecture Freeze v2.1  
> **System**: Healthcare Access Guidance & Operations Platform

---

## 1. Schema Architecture Overview

The platform database (`healthcare_guidance_db`) implements a **17-table relational architecture** in PostgreSQL 14+. The schema is architected into three tightly integrated domains:

1. **Citizen Access Guidance Core (Tables 1–5)**: Privacy-preserving public guidance workflow tracking anonymous sessions, controlled synthetic package catalog lookups, cryptographic document registry, and database-enforced append-only session event logging.
2. **Hospital Operations Foundation (Tables 8–16)**: Internal facility operations managing hospital-department hierarchies, physical consultation counters, state-controlled OPD queue tokens, hospital wards, beds with strict state transition triggers, inpatient admissions, and dispensary inventory stock ledgers with append-only transaction triggers.
3. **Operational Telemetry & Analytical Ledgers (Tables 6, 7, 17)**: Anomaly auditing (`data_quality_issue`), daily batch guidance session rollups (`analytics_summary`), and periodic multi-tier municipal snapshots (`city_aggregate_snapshot`).

> [!IMPORTANT]
> **Synthetic Demonstration Data Boundary**: All 17 tables operate on synthetic demonstration datasets (`is_simulated = TRUE`). Foreign keys, constraints, and PL/pgSQL triggers enforce rigorous relational integrity, but the system contains zero live patient PII and zero real-time government scheme integration.

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    %% ==========================================
    %% DOMAIN 1: CITIZEN ACCESS GUIDANCE CORE
    %% ==========================================
    source_document ||--o{ source_import_run : "executes"
    source_document ||--o{ package_reference : "documents"
    source_import_run ||--o{ package_reference : "imports"
    package_reference ||--o{ guidance_session : "matches"
    guidance_session ||--|{ guidance_event : "logs"

    %% ==========================================
    %% DOMAIN 2: HOSPITAL OPERATIONS FOUNDATION
    %% ==========================================
    hospital ||--|{ department : "contains"
    hospital ||--o{ bed_ward : "operates"
    hospital ||--o{ inventory_item : "stocks"
    department ||--o{ opd_queue_counter : "manages"
    department ||--o{ opd_token : "queues"
    opd_queue_counter |o--o{ opd_token : "services"
    bed_ward ||--|{ bed : "houses"
    bed_ward ||--o{ admission : "assigns"
    bed |o--o{ admission : "allocates"
    inventory_item ||--o{ inventory_transaction : "records"

    %% Cross-Domain Operational Linkages
    guidance_session |o--o| opd_token : "links (optional 0..1)"
    opd_token |o--o| admission : "escalates (optional 0..1)"
    opd_token |o--o{ inventory_transaction : "dispenses (optional 0..N)"

    %% ==========================================
    %% DOMAIN 3: TELEMETRY & ANALYTICAL ROLLUPS
    %% ==========================================
    hospital |o--o{ city_aggregate_snapshot : "summarizes (HOSPITAL/DEPT)"
    department |o--o{ city_aggregate_snapshot : "aggregates (DEPT level)"

    source_document {
        varchar source_id PK
        varchar source_name
        varchar source_type
        varchar publisher
        date publication_date
        text source_url
        varchar integrity_hash
        boolean is_authoritative
        boolean is_simulated
        varchar version_label
        text notes
        timestamptz created_at
    }

    source_import_run {
        uuid import_run_id PK
        varchar source_id FK
        timestamptz import_timestamp
        integer records_imported
        varchar import_status
        varchar validation_status
        varchar executed_by
        text log_summary
    }

    package_reference {
        varchar package_id PK
        varchar source_id FK
        uuid import_run_id FK
        varchar category_id
        varchar specialty_name
        varchar procedure_name
        varchar procedure_code
        boolean is_simulated_reference
        varchar data_status
        text simulation_notice
        varchar official_verification_channel
        varchar help_desk_contact
        varchar seed_version
        varchar created_by
        timestamptz created_at
    }

    guidance_session {
        uuid session_id PK
        varchar current_state
        boolean is_completed
        varchar selected_category
        boolean reference_found
        varchar matched_package_id FK
        timestamptz started_at
        timestamptz completed_at
        timestamptz updated_at
    }

    guidance_event {
        uuid event_id PK
        uuid session_id FK
        varchar event_type
        varchar from_state
        varchar to_state
        jsonb payload
        timestamptz created_at
    }

    data_quality_issue {
        uuid issue_id PK
        varchar entity_type
        varchar entity_id
        varchar issue_type
        varchar severity
        text description
        varchar status
        timestamptz detected_at
        timestamptz resolved_at
    }

    analytics_summary {
        date metric_date PK
        integer total_sessions
        integer completed_sessions
        integer reference_found_count
        integer reference_not_found_count
        numeric completion_rate_percent
        jsonb event_type_distribution
        timestamptz last_etl_run_at
    }

    hospital {
        varchar hospital_id PK
        varchar hospital_code UK
        varchar hospital_name
        varchar city
        boolean is_simulated
        timestamptz created_at
    }

    department {
        varchar department_id PK
        varchar hospital_id FK
        varchar department_code
        varchar department_name
        boolean is_simulated
        timestamptz created_at
    }

    opd_queue_counter {
        varchar counter_id PK
        varchar hospital_id FK
        varchar department_id FK
        integer counter_number
        varchar counter_name
        boolean is_active
        boolean is_simulated
        timestamptz created_at
    }

    opd_token {
        uuid token_id PK
        varchar hospital_id FK
        varchar department_id FK
        varchar counter_id FK
        uuid linked_session_id UK_FK
        varchar token_number
        varchar status
        integer priority_level
        timestamptz issued_at
        timestamptz called_at
        timestamptz service_started_at
        timestamptz service_completed_at
        timestamptz cancelled_at
        boolean is_simulated
        timestamptz created_at
    }

    bed_ward {
        varchar ward_id PK
        varchar hospital_id FK
        varchar ward_code
        varchar ward_name
        varchar ward_type
        integer total_capacity
        boolean is_simulated
        timestamptz created_at
    }

    bed {
        varchar bed_id PK
        varchar hospital_id FK
        varchar ward_id FK
        varchar bed_number
        varchar current_state
        timestamptz last_status_change_at
        boolean is_simulated
        timestamptz created_at
    }

    admission {
        uuid admission_id PK
        varchar hospital_id FK
        varchar ward_id FK
        varchar bed_id FK
        uuid linked_token_id UK_FK
        varchar admission_number
        varchar status
        timestamptz requested_at
        timestamptz assigned_at
        timestamptz admitted_at
        timestamptz discharged_at
        timestamptz cancelled_at
        text notes
        boolean is_simulated
        timestamptz created_at
    }

    inventory_item {
        varchar item_id PK
        varchar hospital_id FK
        varchar item_code
        varchar item_name
        varchar item_type
        varchar unit_of_measure
        integer current_stock
        integer reorder_threshold
        integer reorder_quantity
        boolean is_active
        boolean is_simulated
        timestamptz created_at
        timestamptz updated_at
    }

    inventory_transaction {
        uuid transaction_id PK
        varchar hospital_id FK
        varchar item_id FK
        varchar transaction_type
        integer quantity
        varchar batch_number
        uuid linked_token_id FK
        text audit_reason
        boolean is_simulated
        timestamptz created_at
    }

    city_aggregate_snapshot {
        uuid snapshot_id PK
        timestamptz snapshot_timestamp
        varchar snapshot_period
        varchar aggregate_level
        varchar hospital_id FK
        varchar department_id FK
        integer opd_total_tokens
        integer opd_waiting_tokens
        integer opd_serving_tokens
        integer opd_completed_tokens
        integer opd_cancelled_tokens
        integer opd_active_counters
        numeric opd_avg_wait_minutes
        numeric opd_avg_service_minutes
        integer total_beds
        integer available_beds
        integer occupied_beds
        integer reserved_beds
        integer cleaning_beds
        integer out_of_service_beds
        integer icu_total_beds
        integer icu_available_beds
        integer icu_occupied_beds
        numeric bed_occupancy_rate
        integer admissions_total
        integer admissions_active
        integer admissions_discharged
        integer inventory_items_total
        integer inventory_low_stock_count
        integer inventory_out_of_stock_count
        boolean is_simulated
        text data_confidence_notice
        timestamptz created_at
    }
```

---

## 3. Comprehensive Relational Table Specifications

### 3.1 Domain 1: Citizen Guidance Core

#### 1. `source_document`
- **Purpose**: Master registry of reference datasets and specifications. Stores cryptographic SHA-256 integrity hashes for configuration tracking (explicitly non-authoritative).
- **Primary Key**: `source_id VARCHAR(64)` (e.g., `'SYNTH-SRC-2026-V1'`).
- **Key Fields**: `integrity_hash`, `is_authoritative` (default `FALSE`), `is_simulated` (default `TRUE`), `version_label`.
- **Invariants**: `publication_date` and `source_url` are nullable for synthetic specifications.

#### 2. `source_import_run`
- **Purpose**: Audit execution log documenting dataset ingestion runs and validation checkpoints.
- **Primary Key**: `import_run_id UUID`.
- **Foreign Keys**: `source_id` &rarr; `source_document(source_id)`.
- **Constraints**: `validation_status` constrained to `'STUDENT_TEAM_REVIEWED_SYNTHETIC'` or `'OFFICIAL_VERIFIED'`.

#### 3. `package_reference`
- **Purpose**: Fictional demonstration catalogue mapping controlled categories (`DEMO_ALPHA`, `DEMO_BETA`, `DEMO_GAMMA`) to synthetic packages (`DEMO-ALPHA-001`).
- **Primary Key**: `package_id VARCHAR(64)`.
- **Foreign Keys**:
  - `source_id` &rarr; `source_document(source_id)` (Enforced NOT NULL).
  - `import_run_id` &rarr; `source_import_run(import_run_id)` (Enforced NOT NULL).
- **Invariants**: Contains zero real pricing, procedure codes, or authentic scheme claims. `is_simulated_reference = TRUE`.

#### 4. `guidance_session`
- **Purpose**: Tracks anonymous citizen guidance sessions and enforces deterministic state transitions.
- **Primary Key**: `session_id UUID`.
- **Foreign Keys**: `matched_package_id` &rarr; `package_reference(package_id)` (nullable, populated on successful search).
- **CHECK Constraint (`chk_guidance_session_state`)**:
  - `current_state IN ('GUIDANCE_STARTED', 'SERVICE_SEARCHED', 'PUBLIC_REFERENCE_FOUND', 'PUBLIC_REFERENCE_NOT_FOUND', 'OFFICIAL_VERIFICATION_ROUTE_SHOWN', 'SUPPORT_ROUTE_SHOWN', 'GUIDANCE_COMPLETED')`.

#### 5. `guidance_event`
- **Purpose**: Database-enforced append-only audit event log recording every state transition.
- **Primary Key**: `event_id UUID`.
- **Foreign Keys**: `session_id` &rarr; `guidance_session(session_id) ON DELETE RESTRICT`.
- **Database Trigger**: `trg_prevent_guidance_event_mutation` executing `prevent_guidance_event_mutation()`. Prohibits all `UPDATE` and `DELETE` queries at the database storage engine level.
- **CHECK Constraints**: `chk_guidance_event_from_state`, `chk_guidance_event_to_state`, `chk_guidance_event_initial_only`.

---

### 3.2 Domain 2: Hospital Operations Foundation

#### 8. `hospital`
- **Purpose**: Facility master registry tracking synthetic municipal hospitals.
- **Primary Key**: `hospital_id VARCHAR(64)` (e.g., `'HOSP-001'`, `'HOSP-002'`).
- **Constraints**: `hospital_code` UNIQUE (e.g., `'METRO_CIVIC'`, `'SUBURBAN_COMMUNITY'`). `is_simulated = TRUE`.

#### 9. `department`
- **Purpose**: Clinical and administrative departments within a hospital.
- **Primary Key**: `department_id VARCHAR(64)`.
- **Foreign Keys**: `hospital_id` &rarr; `hospital(hospital_id) ON DELETE RESTRICT`.
- **Unique Constraints**:
  - `uq_department_hospital_id UNIQUE (hospital_id, department_id)`: Composite key supporting downstream composite foreign keys.
  - `uq_department_hospital_code UNIQUE (hospital_id, department_code)`.

#### 10. `opd_queue_counter`
- **Purpose**: Physical or virtual consultation counters within a department.
- **Primary Key**: `counter_id VARCHAR(64)`.
- **Foreign Keys**: `(hospital_id, department_id)` &rarr; `department(hospital_id, department_id) ON DELETE RESTRICT`.
- **Unique Constraints**:
  - `uq_opd_counter_dept_counter UNIQUE (department_id, counter_id)`: Supports composite foreign key from `opd_token`.
  - `uq_opd_counter_dept_number UNIQUE (department_id, counter_number)`: Prevents duplicate counter numbering within a department.
- **Constraints**: `counter_number > 0`.

#### 11. `opd_token`
- **Purpose**: Individual synthetic patient visit tokens with state-controlled queue lifecycle timestamps.
- **Primary Key**: `token_id UUID`.
- **Composite Foreign Keys**:
  - `(hospital_id, department_id)` &rarr; `department(hospital_id, department_id) ON DELETE RESTRICT`.
  - `(department_id, counter_id)` &rarr; `opd_queue_counter(department_id, counter_id) ON DELETE RESTRICT`.
- **Optional Link**: `linked_session_id` &rarr; `guidance_session(session_id) UNIQUE` (enforces 0..1 relationship).
- **CHECK Constraints**:
  - `status IN ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED')`.
  - `priority_level >= 0`.
  - `chk_opd_token_waiting_counter`: `counter_id` must be NULL when `status = 'WAITING'`.
  - `chk_opd_token_served_counter`: `counter_id` must NOT be NULL when `status IN ('CALLED', 'IN_SERVICE', 'COMPLETED')`.
  - Timestamp ordering: `issued_at <= called_at <= service_started_at <= service_completed_at`.

#### 12. `bed_ward`
- **Purpose**: Hospital inpatient wards with typed capacity allocations.
- **Primary Key**: `ward_id VARCHAR(64)`.
- **Foreign Keys**: `hospital_id` &rarr; `hospital(hospital_id) ON DELETE RESTRICT`.
- **Unique Constraints**:
  - `uq_bed_ward_hospital_ward UNIQUE (hospital_id, ward_id)`: Supports composite foreign key from `bed`.
  - `uq_bed_ward_hospital_code UNIQUE (hospital_id, ward_code)`.
- **CHECK Constraints**: `ward_type IN ('GENERAL', 'ICU', 'HDU', 'EMERGENCY')`, `total_capacity > 0`.

#### 13. `bed`
- **Purpose**: Physical inpatient beds tracked with deterministic operational states.
- **Primary Key**: `bed_id VARCHAR(64)`.
- **Composite Foreign Keys**: `(hospital_id, ward_id)` &rarr; `bed_ward(hospital_id, ward_id) ON DELETE RESTRICT`.
- **Unique Constraint**: `uq_bed_ward_number UNIQUE (ward_id, bed_number)`.
- **CHECK Constraint**: `current_state IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE')`.
- **Database Trigger**: `trg_validate_bed_state_transition` executing `validate_bed_state_transition()`. Enforces strict state transitions:
  - `AVAILABLE` &rarr; `RESERVED` or `OUT_OF_SERVICE`
  - `RESERVED` &rarr; `OCCUPIED` or `AVAILABLE`
  - `OCCUPIED` &rarr; `CLEANING`
  - `CLEANING` &rarr; `AVAILABLE`
  - `OUT_OF_SERVICE` &rarr; `AVAILABLE`

#### 14. `admission`
- **Purpose**: Operational inpatient bed allocation and stay coordination (zero clinical triage, zero PII).
- **Primary Key**: `admission_id UUID`.
- **Composite Foreign Keys**: `(hospital_id, ward_id)` &rarr; `bed_ward(hospital_id, ward_id) ON DELETE RESTRICT`.
- **Foreign Keys**: `bed_id` &rarr; `bed(bed_id) ON DELETE SET NULL` (nullable until allocated).
- **Optional Link**: `linked_token_id` &rarr; `opd_token(token_id) UNIQUE` (enforces 0..1 relationship from OPD escalation).
- **CHECK Constraints**:
  - `status IN ('ADMISSION_REQUESTED', 'PENDING_REVIEW', 'BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED', 'DISCHARGED', 'CANCELLED')`.
  - `bed_id` must NOT be NULL when `status IN ('BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED')`.
  - Timestamp ordering: `requested_at <= assigned_at <= admitted_at <= discharged_at`.
- **Database Trigger**: `trg_validate_admission_bed_hierarchy` executing `validate_admission_bed_hierarchy()`. Asserts that the allocated `bed_id` belongs to the exact same `hospital_id` and `ward_id` specified on the admission record.

#### 15. `inventory_item`
- **Purpose**: Synthetic medicine and consumable inventory catalog per hospital.
- **Primary Key**: `item_id VARCHAR(64)`.
- **Foreign Keys**: `hospital_id` &rarr; `hospital(hospital_id) ON DELETE RESTRICT`.
- **Unique Constraints**:
  - `uq_inventory_item_hospital_item UNIQUE (hospital_id, item_id)`: Supports composite foreign key from `inventory_transaction`.
  - `uq_inventory_item_hospital_code UNIQUE (hospital_id, item_code)`.
- **CHECK Constraints**:
  - `item_type IN ('MEDICINE', 'CONSUMABLE')`.
  - `unit_of_measure IN ('TABLET', 'VIAL', 'PIECE', 'BOX', 'ROLL', 'SACHET', 'PAIR')`.
  - `current_stock >= 0`, `reorder_threshold >= 0`, `reorder_quantity > 0`.

#### 16. `inventory_transaction`
- **Purpose**: Append-only stock ledger recording receipts, issues, adjustments, and transfers.
- **Primary Key**: `transaction_id UUID`.
- **Composite Foreign Keys**: `(hospital_id, item_id)` &rarr; `inventory_item(hospital_id, item_id) ON DELETE RESTRICT`.
- **Optional Link**: `linked_token_id` &rarr; `opd_token(token_id) ON DELETE SET NULL` (cardinality 0..N).
- **CHECK Constraints**:
  - `transaction_type IN ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')`.
  - `quantity > 0`.
- **Database Trigger**: `trg_prevent_inventory_transaction_mutation` executing `prevent_inventory_transaction_mutation()`. Blocks `UPDATE` and `DELETE` operations at the database level.

---

### 3.3 Domain 3: Operational Telemetry & Analytical Ledgers

#### 6. `data_quality_issue`
- **Purpose**: Standalone anomaly and validation issue ledger populated by integrity checks and ETL runs.
- **Primary Key**: `issue_id UUID`.
- **Key Fields**: `entity_type`, `entity_id`, `issue_type`, `severity` (`INFO`, `WARNING`, `CRITICAL`), `status` (`DETECTED`, `RESOLVED`), `detected_at`, `resolved_at`.

#### 7. `analytics_summary`
- **Purpose**: Daily batch rollup of guidance session telemetry populated by `etl/transform_events.py`.
- **Primary Key**: `metric_date DATE`.
- **Key Fields**: `total_sessions`, `completed_sessions`, `reference_found_count`, `reference_not_found_count`, `completion_rate_percent`, `event_type_distribution JSONB`, `last_etl_run_at`.

#### 17. `city_aggregate_snapshot`
- **Purpose**: Periodic offline multi-tier operational telemetry snapshots populated by `etl/aggregate_city_snapshot.py`.
- **Primary Key**: `snapshot_id UUID`.
- **Foreign Keys**:
  - `hospital_id` &rarr; `hospital(hospital_id) ON DELETE RESTRICT` (nullable for CITY level).
  - `(hospital_id, department_id)` &rarr; `department(hospital_id, department_id) ON DELETE RESTRICT` (nullable for HOSPITAL and CITY levels).
- **CHECK Constraints**:
  - `snapshot_period IN ('15_MIN', 'HOURLY', 'DAILY', 'CUSTOM')`.
  - `aggregate_level IN ('CITY', 'HOSPITAL', 'DEPARTMENT')`.
  - `chk_city_snap_hierarchy`: Enforces that CITY level has NULL facility IDs, HOSPITAL level has NOT NULL `hospital_id` and NULL `department_id`, and DEPARTMENT level has both NOT NULL.
  - Non-negative metric checks across OPD, Bed, Admission, and Inventory columns.
- **Composite Unique Arbiter Index**:
  - `uq_city_snap_slot UNIQUE (snapshot_timestamp, snapshot_period, aggregate_level, COALESCE(hospital_id, '__CITY__'), COALESCE(department_id, '__ALL__'))`.
  - Enables idempotent `ON CONFLICT (...) DO UPDATE` batch ingestion.
