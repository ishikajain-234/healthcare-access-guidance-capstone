-- 002_verification_hardening.sql
-- Revised Hardening Patch: Foreign Keys, Backfill, NOT NULL Constraints, and State Value CHECK Constraints

-- 1. Remove per-record integrity_hash from package_reference (source_document retains file integrity hash)
ALTER TABLE package_reference 
DROP COLUMN IF EXISTS integrity_hash;

-- 2. Add source_id and import_run_id columns if they do not exist
ALTER TABLE package_reference
ADD COLUMN IF NOT EXISTS source_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS import_run_id UUID;

-- 3. Ensure prerequisite parent rows exist for synthetic provenance linking
INSERT INTO source_document (
    source_id,
    source_name,
    source_type,
    publisher,
    publication_date,
    source_url,
    integrity_hash,
    is_authoritative,
    is_simulated,
    version_label,
    notes
) VALUES (
    'SYNTH-SRC-2026-V1',
    'Capstone Synthetic Demonstration Reference Dataset',
    'SYNTHETIC_SPECIFICATION',
    'Capstone Student Engineering Team',
    NULL,
    NULL,
    '9cb17fdb8be796952d7c0283fd0bebac7f96e507dc7842fe2e228308f3e26b00',
    FALSE,
    TRUE,
    'demo-v0.1',
    'Student-team-reviewed synthetic demonstration reference records for 2nd-year academic prototype testing.'
) ON CONFLICT (source_id) DO NOTHING;

INSERT INTO source_import_run (
    import_run_id,
    source_id,
    records_imported,
    import_status,
    validation_status,
    executed_by,
    log_summary
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'SYNTH-SRC-2026-V1',
    3,
    'SUCCESS',
    'STUDENT_TEAM_REVIEWED_SYNTHETIC',
    'SYSTEM_SEED_MIGRATION',
    'Imported 3 controlled student-team-reviewed synthetic test records for category matching demonstration.'
) ON CONFLICT (import_run_id) DO NOTHING;

-- 4. Backfill existing package_reference rows with synthetic source and import run identifiers
UPDATE package_reference
SET source_id = 'SYNTH-SRC-2026-V1',
    import_run_id = '00000000-0000-0000-0000-000000000001'
WHERE source_id IS NULL OR import_run_id IS NULL;

-- 5. Enforce NOT NULL constraints on foreign keys post-backfill
ALTER TABLE package_reference
ALTER COLUMN source_id SET NOT NULL,
ALTER COLUMN import_run_id SET NOT NULL;

-- 6. Enforce foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'package_reference_source_id_fkey'
    ) THEN
        ALTER TABLE package_reference
        ADD CONSTRAINT package_reference_source_id_fkey
        FOREIGN KEY (source_id) REFERENCES source_document(source_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'package_reference_import_run_id_fkey'
    ) THEN
        ALTER TABLE package_reference
        ADD CONSTRAINT package_reference_import_run_id_fkey
        FOREIGN KEY (import_run_id) REFERENCES source_import_run(import_run_id);
    END IF;
END $$;

-- 7. Add CHECK constraints to validate allowed state values in guidance_session
ALTER TABLE guidance_session
DROP CONSTRAINT IF EXISTS chk_guidance_session_state;

ALTER TABLE guidance_session
ADD CONSTRAINT chk_guidance_session_state CHECK (
    current_state IN (
        'GUIDANCE_STARTED',
        'SERVICE_SEARCHED',
        'PUBLIC_REFERENCE_FOUND',
        'PUBLIC_REFERENCE_NOT_FOUND',
        'OFFICIAL_VERIFICATION_ROUTE_SHOWN',
        'SUPPORT_ROUTE_SHOWN',
        'GUIDANCE_COMPLETED'
    )
);

-- 8. Add CHECK constraints to validate allowed state values in guidance_event
ALTER TABLE guidance_event
DROP CONSTRAINT IF EXISTS chk_guidance_event_from_state,
DROP CONSTRAINT IF EXISTS chk_guidance_event_to_state,
DROP CONSTRAINT IF EXISTS chk_guidance_event_initial_only;

ALTER TABLE guidance_event
ADD CONSTRAINT chk_guidance_event_from_state CHECK (
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
ADD CONSTRAINT chk_guidance_event_to_state CHECK (
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
-- Allow 'INITIAL' only as from_state for the session initialization event
ADD CONSTRAINT chk_guidance_event_initial_only CHECK (
    (from_state = 'INITIAL' AND event_type = 'SESSION_INITIALIZED' AND to_state = 'GUIDANCE_STARTED')
    OR (from_state != 'INITIAL')
);

-- 9. Verification Gate: Count unlinked rows and fail migration if count is not zero
DO $$
DECLARE
    unlinked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unlinked_count
    FROM package_reference
    WHERE source_id IS NULL OR import_run_id IS NULL;

    IF unlinked_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % package_reference record(s) have NULL source_id or import_run_id.', unlinked_count;
    END IF;

    RAISE NOTICE 'Migration verification passed: % unlinked package_reference records found.', unlinked_count;
END $$;
