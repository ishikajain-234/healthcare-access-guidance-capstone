# Data Dictionary: Relational Schema (7 Tables)

This document details the seven PostgreSQL tables comprising the Healthcare Access Guidance Prototype database for the 2nd-year AP + Data Engineering capstone project.

---

### 1. `source_document`
Tracks metadata and cryptographic integrity hash for ingested reference datasets.
- **`source_id`**: VARCHAR(64) PRIMARY KEY. (e.g. `'SYNTH-SRC-2026-V1'`)
- **`source_name`**: VARCHAR(255) NOT NULL. Document title.
- **`source_type`**: VARCHAR(64) NOT NULL. (e.g. `'SYNTHETIC_SPECIFICATION'`, `'PUBLIC_REFERENCE'`)
- **`publisher`**: VARCHAR(255) NOT NULL. Attribution entity.
- **`publication_date`**: DATE. Nullable for student synthetic reference files.
- **`source_url`**: TEXT. Canonical URL; explicitly NULL for local synthetic files.
- **`integrity_hash`**: VARCHAR(64) NOT NULL. SHA-256 file integrity hash (integrity check only, not proof of government provenance).
- **`is_authoritative`**: BOOLEAN NOT NULL DEFAULT FALSE. False for student synthetic demo data.
- **`is_simulated`**: BOOLEAN NOT NULL DEFAULT TRUE. True for simulated demo files.
- **`version_label`**: VARCHAR(64) NOT NULL DEFAULT 'demo-v0.1'.
- **`notes`**: TEXT. Contextual notes.
- **`created_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().

---

### 2. `source_import_run`
Audit log of batch ingestion and seed execution runs.
- **`import_run_id`**: UUID PRIMARY KEY DEFAULT uuid_generate_v4().
- **`source_id`**: VARCHAR(64) NOT NULL REFERENCES `source_document(source_id)`.
- **`import_timestamp`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().
- **`records_imported`**: INTEGER NOT NULL DEFAULT 0.
- **`import_status`**: VARCHAR(32) NOT NULL. (`'SUCCESS'`, `'FAILED'`, `'PARTIAL'`)
- **`validation_status`**: VARCHAR(32) NOT NULL. (`'STUDENT_TEAM_REVIEWED_SYNTHETIC'`, `'OFFICIAL_VERIFIED'`)
- **`executed_by`**: VARCHAR(64) NOT NULL.
- **`log_summary`**: TEXT.

---

### 3. `package_reference`
Controlled demonstration catalogue containing neutral, fictional synthetic items.
- **`package_id`**: VARCHAR(64) PRIMARY KEY. (e.g. `'DEMO-ALPHA-001'`)
- **`source_id`**: VARCHAR(64) NOT NULL REFERENCES `source_document(source_id)`. Originating source metadata record.
- **`import_run_id`**: UUID NOT NULL REFERENCES `source_import_run(import_run_id)`. Ingesting import run execution.
- **`category_id`**: VARCHAR(64) NOT NULL. Controlled dropdown enum (`'DEMO_ALPHA'`, `'DEMO_BETA'`, `'DEMO_GAMMA'`, `'NO_MATCH_DEMO'`).
- **`specialty_name`**: VARCHAR(128) NOT NULL. Neutral domain (e.g. `'Simulated Domain Alpha'`).
- **`procedure_name`**: VARCHAR(255) NOT NULL. Neutral service item (e.g. `'Simulated Service Item Alpha [Synthetic Demo]'`).
- **`procedure_code`**: VARCHAR(64) NOT NULL. Neutral code (e.g. `'CODE-DEMO-ALPHA'`).
- **`is_simulated_reference`**: BOOLEAN NOT NULL DEFAULT TRUE.
- **`data_status`**: VARCHAR(32) NOT NULL DEFAULT 'SYNTHETIC_DEMO'.
- **`simulation_notice`**: TEXT NOT NULL. Explicit academic simulation disclaimer.
- **`official_verification_channel`**: VARCHAR(255) NOT NULL. Direction to authorized channels.
- **`help_desk_contact`**: VARCHAR(255) NOT NULL.
- **`seed_version`**: VARCHAR(32) NOT NULL.
- **`created_by`**: VARCHAR(64) NOT NULL.
- **`created_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().

---

### 4. `guidance_session`
Anonymous UUID-based guidance session state machine tracker (Zero PII).
- **`session_id`**: UUID PRIMARY KEY DEFAULT uuid_generate_v4().
- **`current_state`**: VARCHAR(64) NOT NULL DEFAULT 'GUIDANCE_STARTED'.
- **`is_completed`**: BOOLEAN NOT NULL DEFAULT FALSE.
- **`selected_category`**: VARCHAR(64). Selected dropdown enum if chosen.
- **`reference_found`**: BOOLEAN. True if category matched in reference catalogue.
- **`matched_package_id`**: VARCHAR(64) REFERENCES `package_reference(package_id)`.
- **`started_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().
- **`completed_at`**: TIMESTAMP WITH TIME ZONE.
- **`updated_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().

---

### 5. `guidance_event`
Database-enforced append-only audit ledger of guidance workflow transitions (Zero PII).
*Protected by trigger `trg_prevent_guidance_event_mutation` preventing UPDATE and DELETE operations.*
- **`event_id`**: UUID PRIMARY KEY DEFAULT uuid_generate_v4().
- **`session_id`**: UUID NOT NULL REFERENCES `guidance_session(session_id)` ON DELETE RESTRICT.
- **`event_type`**: VARCHAR(64) NOT NULL. (`'SESSION_INITIALIZED'`, `'SERVICE_CATEGORY_SELECTED'`, etc.)
- **`from_state`**: VARCHAR(64) NOT NULL.
- **`to_state`**: VARCHAR(64) NOT NULL.
- **`payload`**: JSONB NOT NULL DEFAULT '{}'. Sanitized structured transition metadata (No PII).
- **`created_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().

---

### 6. `data_quality_issue`
Ledger of detected data anomalies and integrity issues.
- **`issue_id`**: UUID PRIMARY KEY DEFAULT uuid_generate_v4().
- **`entity_type`**: VARCHAR(64) NOT NULL.
- **`entity_id`**: VARCHAR(64) NOT NULL.
- **`issue_type`**: VARCHAR(64) NOT NULL.
- **`severity`**: VARCHAR(32) NOT NULL. (`'INFO'`, `'WARNING'`, `'CRITICAL'`)
- **`description`**: TEXT NOT NULL.
- **`status`**: VARCHAR(32) NOT NULL DEFAULT 'DETECTED'.
- **`detected_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().
- **`resolved_at`**: TIMESTAMP WITH TIME ZONE.

---

### 7. `analytics_summary`
Rollup aggregation table populated by the Python Data Engineering batch ETL pipeline.
- **`metric_date`**: DATE PRIMARY KEY.
- **`total_sessions`**: INTEGER NOT NULL DEFAULT 0.
- **`completed_sessions`**: INTEGER NOT NULL DEFAULT 0.
- **`reference_found_count`**: INTEGER NOT NULL DEFAULT 0.
- **`reference_not_found_count`**: INTEGER NOT NULL DEFAULT 0.
- **`completion_rate_percent`**: NUMERIC(5,2) NOT NULL DEFAULT 0.00.
- **`event_type_distribution`**: JSONB NOT NULL DEFAULT '{}'.
- **`last_etl_run_at`**: TIMESTAMP WITH TIME ZONE DEFAULT NOW().
