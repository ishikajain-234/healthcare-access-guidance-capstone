-- 001_initial_schema.sql
-- Healthcare Access Guidance Prototype Database Migration
-- Defines the complete 7-table relational schema for the 2nd-year AP + Data Engineering capstone.
--
-- Tables in this schema (7 total):
-- 1. source_document: Tracks metadata and integrity hash for reference datasets.
-- 2. source_import_run: Audit log of seed/import execution batches.
-- 3. package_reference: Controlled demonstration catalogue (fictional synthetic demo items).
-- 4. guidance_session: Anonymous UUID-based session lifecycle and state machine tracking.
-- 5. guidance_event: Database-enforced append-only audit event ledger (prevented from UPDATE/DELETE via trigger).
-- 6. data_quality_issue: Ledger of detected integrity flags and validation anomalies.
-- 7. analytics_summary: Rollup summary table populated by the Python Data Engineering batch aggregation script.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Source Document Metadata Registry
CREATE TABLE IF NOT EXISTS source_document (
    source_id VARCHAR(64) PRIMARY KEY,
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL, -- e.g. 'SYNTHETIC_SPECIFICATION', 'PUBLIC_REFERENCE'
    publisher VARCHAR(255) NOT NULL,
    publication_date DATE, -- Nullable for student synthetic reference specifications
    source_url TEXT, -- Explicitly NULL for local/synthetic test datasets
    integrity_hash VARCHAR(64) NOT NULL, -- Cryptographic integrity hash of file (not proof of provenance)
    is_authoritative BOOLEAN NOT NULL DEFAULT FALSE,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    version_label VARCHAR(64) NOT NULL DEFAULT 'demo-v0.1',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Source Import Execution Log
CREATE TABLE IF NOT EXISTS source_import_run (
    import_run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(64) NOT NULL REFERENCES source_document(source_id),
    import_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    records_imported INTEGER NOT NULL DEFAULT 0,
    import_status VARCHAR(32) NOT NULL, -- 'SUCCESS', 'FAILED', 'PARTIAL'
    validation_status VARCHAR(32) NOT NULL, -- 'STUDENT_TEAM_REVIEWED_SYNTHETIC', 'OFFICIAL_VERIFIED'
    executed_by VARCHAR(64) NOT NULL,
    log_summary TEXT
);

-- 3. Package Reference Catalog (Fictional Demonstration Items)
CREATE TABLE IF NOT EXISTS package_reference (
    package_id VARCHAR(64) PRIMARY KEY, -- e.g. 'DEMO-ALPHA-001'
    source_id VARCHAR(64) NOT NULL REFERENCES source_document(source_id),
    import_run_id UUID NOT NULL REFERENCES source_import_run(import_run_id),
    category_id VARCHAR(64) NOT NULL,
    specialty_name VARCHAR(128) NOT NULL, -- Fictional domain label, e.g. 'Simulated Domain Alpha'
    procedure_name VARCHAR(255) NOT NULL, -- Fictional demo service, e.g. 'Simulated Service Item Alpha [Synthetic Demo]'
    procedure_code VARCHAR(64) NOT NULL, -- Neutral code, e.g. 'CODE-DEMO-ALPHA'
    is_simulated_reference BOOLEAN NOT NULL DEFAULT TRUE,
    data_status VARCHAR(32) NOT NULL DEFAULT 'SYNTHETIC_DEMO',
    simulation_notice TEXT NOT NULL,
    official_verification_channel VARCHAR(255) NOT NULL,
    help_desk_contact VARCHAR(255) NOT NULL,
    seed_version VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pkg_category ON package_reference(category_id);
CREATE INDEX IF NOT EXISTS idx_pkg_source ON package_reference(source_id);
CREATE INDEX IF NOT EXISTS idx_pkg_import_run ON package_reference(import_run_id);

-- 4. Anonymous Guidance Session
CREATE TABLE IF NOT EXISTS guidance_session (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_state VARCHAR(64) NOT NULL DEFAULT 'GUIDANCE_STARTED',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    selected_category VARCHAR(64),
    reference_found BOOLEAN,
    matched_package_id VARCHAR(64) REFERENCES package_reference(package_id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_guidance_session_state CHECK (
        current_state IN (
            'GUIDANCE_STARTED',
            'SERVICE_SEARCHED',
            'PUBLIC_REFERENCE_FOUND',
            'PUBLIC_REFERENCE_NOT_FOUND',
            'OFFICIAL_VERIFICATION_ROUTE_SHOWN',
            'SUPPORT_ROUTE_SHOWN',
            'GUIDANCE_COMPLETED'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_session_state ON guidance_session(current_state);
CREATE INDEX IF NOT EXISTS idx_session_completed ON guidance_session(is_completed);

-- 5. Append-Only Guidance Event Log (Protected by Database Trigger)
CREATE TABLE IF NOT EXISTS guidance_event (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES guidance_session(session_id) ON DELETE RESTRICT,
    event_type VARCHAR(64) NOT NULL,
    from_state VARCHAR(64) NOT NULL,
    to_state VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_guidance_event_from_state CHECK (
        from_state IN (
            'INITIAL',
            'GUIDANCE_STARTED',
            'SERVICE_SEARCHED',
            'PUBLIC_REFERENCE_FOUND',
            'PUBLIC_REFERENCE_NOT_FOUND',
            'OFFICIAL_VERIFICATION_ROUTE_SHOWN',
            'SUPPORT_ROUTE_SHOWN',
            'GUIDANCE_COMPLETED'
        )
    ),
    CONSTRAINT chk_guidance_event_to_state CHECK (
        to_state IN (
            'GUIDANCE_STARTED',
            'SERVICE_SEARCHED',
            'PUBLIC_REFERENCE_FOUND',
            'PUBLIC_REFERENCE_NOT_FOUND',
            'OFFICIAL_VERIFICATION_ROUTE_SHOWN',
            'SUPPORT_ROUTE_SHOWN',
            'GUIDANCE_COMPLETED'
        )
    ),
    CONSTRAINT chk_guidance_event_initial_only CHECK (
        (from_state = 'INITIAL' AND event_type = 'SESSION_INITIALIZED' AND to_state = 'GUIDANCE_STARTED')
        OR (from_state != 'INITIAL')
    )
);

CREATE INDEX IF NOT EXISTS idx_event_session ON guidance_event(session_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON guidance_event(event_type);
CREATE INDEX IF NOT EXISTS idx_event_created_at ON guidance_event(created_at);

-- Trigger Function: Enforces Database-Level Append-Only Immutability
CREATE OR REPLACE FUNCTION prevent_guidance_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'guidance_event table is append-only: UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_guidance_event_mutation ON guidance_event;
CREATE TRIGGER trg_prevent_guidance_event_mutation
BEFORE UPDATE OR DELETE ON guidance_event
FOR EACH ROW
EXECUTE FUNCTION prevent_guidance_event_mutation();

-- 6. Data Quality Issue Ledger
CREATE TABLE IF NOT EXISTS data_quality_issue (
    issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    issue_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DETECTED',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 7. Analytics Summary Rollup Table (Populated by Batch ETL Pipeline)
CREATE TABLE IF NOT EXISTS analytics_summary (
    metric_date DATE PRIMARY KEY,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    completed_sessions INTEGER NOT NULL DEFAULT 0,
    reference_found_count INTEGER NOT NULL DEFAULT 0,
    reference_not_found_count INTEGER NOT NULL DEFAULT 0,
    completion_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    event_type_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_etl_run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
