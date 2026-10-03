-- 001_synthetic_seed.sql
-- Fictional Demonstration Seed Data for Safe Prototype Testing
-- Uses strictly neutral identifiers and student-team-reviewed synthetic records.

-- 1. Register Synthetic Document Metadata
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
    NULL, -- Nullable for student synthetic reference data
    NULL, -- Explicitly NULL for synthetic test files
    '9cb17fdb8be796952d7c0283fd0bebac7f96e507dc7842fe2e228308f3e26b00', -- File integrity hash of synthetic_reference_records.json
    FALSE, -- Strictly non-authoritative
    TRUE,  -- Simulated reference data
    'demo-v0.1',
    'Student-team-reviewed synthetic demonstration reference records for 2nd-year academic prototype testing. Strictly non-clinical, non-governmental, and non-authoritative.'
) ON CONFLICT (source_id) DO UPDATE SET
    publication_date = EXCLUDED.publication_date,
    source_url = EXCLUDED.source_url,
    integrity_hash = EXCLUDED.integrity_hash,
    is_authoritative = EXCLUDED.is_authoritative,
    is_simulated = EXCLUDED.is_simulated,
    version_label = EXCLUDED.version_label,
    notes = EXCLUDED.notes;

-- 2. Register Import Execution Run with Deterministic UUID
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
) ON CONFLICT (import_run_id) DO UPDATE SET
    records_imported = EXCLUDED.records_imported,
    import_status = EXCLUDED.import_status,
    validation_status = EXCLUDED.validation_status,
    log_summary = EXCLUDED.log_summary;

-- 3. Insert 3 Controlled Fictional Demonstration Reference Records
-- Foreign keys point to source_document and source_import_run. Per-record hash removed.
INSERT INTO package_reference (
    package_id,
    source_id,
    import_run_id,
    category_id,
    specialty_name,
    procedure_name,
    procedure_code,
    is_simulated_reference,
    data_status,
    simulation_notice,
    official_verification_channel,
    help_desk_contact,
    seed_version,
    created_by
) VALUES 
(
    'DEMO-ALPHA-001',
    'SYNTH-SRC-2026-V1',
    '00000000-0000-0000-0000-000000000001',
    'DEMO_ALPHA',
    'Simulated Domain Alpha',
    'Simulated Service Item Alpha [Synthetic Demo]',
    'CODE-DEMO-ALPHA',
    TRUE,
    'SYNTHETIC_DEMO',
    'DEMONSTRATION RECORD ONLY: This record is entirely simulated for 2nd-year academic evaluation. It does not represent an actual healthcare package, real government scheme, or medical rate.',
    'Authorized Hospital Help Desk / Official State Health Channel',
    'Relevant Official Scheme Channel / Authorized Hospital Support Desk',
    'demo-v0.1',
    'student_engineering_team'
),
(
    'DEMO-BETA-002',
    'SYNTH-SRC-2026-V1',
    '00000000-0000-0000-0000-000000000001',
    'DEMO_BETA',
    'Simulated Domain Beta',
    'Simulated Service Item Beta [Synthetic Demo]',
    'CODE-DEMO-BETA',
    TRUE,
    'SYNTHETIC_DEMO',
    'DEMONSTRATION RECORD ONLY: This record is entirely simulated for 2nd-year academic evaluation. It does not represent an actual healthcare package, real government scheme, or medical rate.',
    'Authorized Hospital Help Desk / Official State Health Channel',
    'Relevant Official Scheme Channel / Authorized Hospital Support Desk',
    'demo-v0.1',
    'student_engineering_team'
),
(
    'DEMO-GAMMA-003',
    'SYNTH-SRC-2026-V1',
    '00000000-0000-0000-0000-000000000001',
    'DEMO_GAMMA',
    'Simulated Domain Gamma',
    'Simulated Service Item Gamma [Synthetic Demo]',
    'CODE-DEMO-GAMMA',
    TRUE,
    'SYNTHETIC_DEMO',
    'DEMONSTRATION RECORD ONLY: This record is entirely simulated for 2nd-year academic evaluation. It does not represent an actual healthcare package, real government scheme, or medical rate.',
    'Authorized Hospital Help Desk / Official State Health Channel',
    'Relevant Official Scheme Channel / Authorized Hospital Support Desk',
    'demo-v0.1',
    'student_engineering_team'
) ON CONFLICT (package_id) DO UPDATE SET
    source_id = EXCLUDED.source_id,
    import_run_id = EXCLUDED.import_run_id,
    category_id = EXCLUDED.category_id,
    specialty_name = EXCLUDED.specialty_name,
    procedure_name = EXCLUDED.procedure_name,
    procedure_code = EXCLUDED.procedure_code,
    simulation_notice = EXCLUDED.simulation_notice,
    official_verification_channel = EXCLUDED.official_verification_channel,
    help_desk_contact = EXCLUDED.help_desk_contact,
    seed_version = EXCLUDED.seed_version;
