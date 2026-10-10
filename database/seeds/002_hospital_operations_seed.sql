-- 002_hospital_operations_seed.sql
-- Synthetic Demonstration Seed Data for Hospital Operations Foundation (PS-75)
-- Multi-Facility Seed: LNJP, GTB, and DDU Hospitals
-- Strictly synthetic demonstration data; zero real patient PII, real pharmaceuticals, or government authenticity claims.
-- Repeatable and idempotent via ON CONFLICT clauses.

-- ============================================================================
-- 1. HOSPITALS MASTER (3 Synthetic Municipal Hospitals)
-- ============================================================================
INSERT INTO hospital (hospital_id, hospital_code, hospital_name, city, is_simulated)
VALUES
    ('HOSP_LNJP', 'HOSP_LNJP_DELHI', 'Lok Nayak Jai Prakash Hospital (LNJP) [Simulated]', 'Delhi', TRUE),
    ('HOSP_GTB',  'HOSP_GTB_DELHI',  'Guru Teg Bahadur Hospital (GTB) [Simulated]',       'Delhi', TRUE),
    ('HOSP_DDU',  'HOSP_DDU_DELHI',  'Deen Dayal Upadhyay Hospital (DDU) [Simulated]',    'Delhi', TRUE)
ON CONFLICT (hospital_id) DO UPDATE SET
    hospital_name = EXCLUDED.hospital_name,
    city          = EXCLUDED.city,
    is_simulated  = EXCLUDED.is_simulated;

-- ============================================================================
-- 2. DEPARTMENTS (Multi-Department Hierarchy)
-- ============================================================================
INSERT INTO department (department_id, hospital_id, department_code, department_name, is_simulated)
VALUES
    -- LNJP Hospital Departments
    ('DEPT_LNJP_GEN',    'HOSP_LNJP', 'GEN_MED',    'General Medicine',       TRUE),
    ('DEPT_LNJP_CARDIO', 'HOSP_LNJP', 'CARDIO',     'Cardiology',             TRUE),
    ('DEPT_LNJP_ORTHO',  'HOSP_LNJP', 'ORTHO',      'Orthopedics',            TRUE),

    -- GTB Hospital Departments
    ('DEPT_GTB_GEN',     'HOSP_GTB',  'GEN_MED',    'General Medicine',       TRUE),
    ('DEPT_GTB_CARDIO',  'HOSP_GTB',  'CARDIO',     'Cardiology',             TRUE),

    -- DDU Hospital Departments
    ('DEPT_DDU_GEN',     'HOSP_DDU',  'GEN_MED',    'General Medicine',       TRUE),
    ('DEPT_DDU_EMERG',   'HOSP_DDU',  'EMERGENCY',  'Emergency Medicine',     TRUE),
    ('DEPT_DDU_ORTHO',   'HOSP_DDU',  'ORTHO',      'Orthopedics',            TRUE)
ON CONFLICT (hospital_id, department_id) DO UPDATE SET
    department_name = EXCLUDED.department_name,
    is_simulated    = EXCLUDED.is_simulated;

-- ============================================================================
-- 3. OPD QUEUE COUNTERS (Consultation Counters per Department)
-- ============================================================================
INSERT INTO opd_queue_counter (counter_id, hospital_id, department_id, counter_number, counter_name, is_active, is_simulated)
VALUES
    -- LNJP Counters
    ('CTR_LNJP_G1',  'HOSP_LNJP', 'DEPT_LNJP_GEN',    1, 'Counter 1 (General OPD)',    TRUE, TRUE),
    ('CTR_LNJP_G2',  'HOSP_LNJP', 'DEPT_LNJP_GEN',    2, 'Counter 2 (General OPD)',    TRUE, TRUE),
    ('CTR_LNJP_C1',  'HOSP_LNJP', 'DEPT_LNJP_CARDIO', 1, 'Counter 1 (Cardio Clinic)',  TRUE, TRUE),

    -- GTB Counters
    ('CTR_GTB_G1',   'HOSP_GTB',  'DEPT_GTB_GEN',     1, 'Counter 1 (General OPD)',    TRUE, TRUE),
    ('CTR_GTB_C1',   'HOSP_GTB',  'DEPT_GTB_CARDIO',  1, 'Counter 1 (Cardio Clinic)',  TRUE, TRUE),

    -- DDU Counters
    ('CTR_DDU_G1',   'HOSP_DDU',  'DEPT_DDU_GEN',     1, 'Counter 1 (General OPD)',    TRUE, TRUE),
    ('CTR_DDU_G2',   'HOSP_DDU',  'DEPT_DDU_GEN',     2, 'Counter 2 (General OPD)',    TRUE, TRUE),
    ('CTR_DDU_E1',   'HOSP_DDU',  'DEPT_DDU_EMERG',   1, 'Emergency Triage Counter 1', TRUE, TRUE)
ON CONFLICT (department_id, counter_number) DO UPDATE SET
    counter_name = EXCLUDED.counter_name,
    is_active    = EXCLUDED.is_active,
    is_simulated = EXCLUDED.is_simulated;

-- ============================================================================
-- 4. BED WARDS & BEDS (Physical Hospital Capacity)
-- ============================================================================
INSERT INTO bed_ward (ward_id, hospital_id, ward_code, ward_name, ward_type, total_capacity, is_simulated)
VALUES
    -- LNJP Wards
    ('WARD_LNJP_GEN', 'HOSP_LNJP', 'W_LNJP_GEN', 'General Medical Ward',    'GENERAL',   20, TRUE),
    ('WARD_LNJP_ICU', 'HOSP_LNJP', 'W_LNJP_ICU', 'Intensive Care Unit',     'ICU',        5, TRUE),

    -- GTB Wards
    ('WARD_GTB_GEN',  'HOSP_GTB',  'W_GTB_GEN',  'General Medical Ward',    'GENERAL',   15, TRUE),
    ('WARD_GTB_ICU',  'HOSP_GTB',  'W_GTB_ICU',  'Intensive Care Unit',     'ICU',        4, TRUE),

    -- DDU Wards
    ('WARD_DDU_GEN',  'HOSP_DDU',  'W_DDU_GEN',  'General Medical Ward',    'GENERAL',   15, TRUE),
    ('WARD_DDU_EMERG','HOSP_DDU',  'W_DDU_EMERG','Emergency Observation',   'EMERGENCY',  6, TRUE),
    ('WARD_DDU_ICU',  'HOSP_DDU',  'W_DDU_ICU',  'Intensive Care Unit',     'ICU',        4, TRUE)
ON CONFLICT (hospital_id, ward_id) DO UPDATE SET
    ward_name      = EXCLUDED.ward_name,
    ward_type      = EXCLUDED.ward_type,
    total_capacity = EXCLUDED.total_capacity;

-- Insert Demonstration Beds across Wards
INSERT INTO bed (bed_id, hospital_id, ward_id, bed_number, current_state, is_simulated)
VALUES
    -- LNJP General Ward Beds (Diverse Operational States)
    ('BED_LNJP_G01', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'G-01', 'AVAILABLE',      TRUE),
    ('BED_LNJP_G02', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'G-02', 'OCCUPIED',       TRUE),
    ('BED_LNJP_G03', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'G-03', 'RESERVED',       TRUE),
    ('BED_LNJP_G04', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'G-04', 'CLEANING',       TRUE),
    ('BED_LNJP_G05', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'G-05', 'OUT_OF_SERVICE', TRUE),
    ('BED_LNJP_G06', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'G-06', 'AVAILABLE',      TRUE),

    -- LNJP ICU Beds
    ('BED_LNJP_ICU01', 'HOSP_LNJP', 'WARD_LNJP_ICU', 'ICU-01', 'OCCUPIED',   TRUE),
    ('BED_LNJP_ICU02', 'HOSP_LNJP', 'WARD_LNJP_ICU', 'ICU-02', 'AVAILABLE',  TRUE),

    -- GTB Beds
    ('BED_GTB_G01',   'HOSP_GTB',  'WARD_GTB_GEN',  'G-01', 'OCCUPIED',       TRUE),
    ('BED_GTB_G02',   'HOSP_GTB',  'WARD_GTB_GEN',  'G-02', 'AVAILABLE',      TRUE),
    ('BED_GTB_G03',   'HOSP_GTB',  'WARD_GTB_GEN',  'G-03', 'RESERVED',       TRUE),
    ('BED_GTB_G04',   'HOSP_GTB',  'WARD_GTB_GEN',  'G-04', 'AVAILABLE',      TRUE),
    ('BED_GTB_ICU01', 'HOSP_GTB',  'WARD_GTB_ICU',  'ICU-01', 'AVAILABLE',    TRUE),

    -- DDU Beds
    ('BED_DDU_G01',   'HOSP_DDU',  'WARD_DDU_GEN',   'G-01', 'AVAILABLE',     TRUE),
    ('BED_DDU_G02',   'HOSP_DDU',  'WARD_DDU_GEN',   'G-02', 'OCCUPIED',      TRUE),
    ('BED_DDU_G03',   'HOSP_DDU',  'WARD_DDU_GEN',   'G-03', 'AVAILABLE',     TRUE),
    ('BED_DDU_EM01',  'HOSP_DDU',  'WARD_DDU_EMERG', 'EM-01', 'OCCUPIED',     TRUE),
    ('BED_DDU_EM02',  'HOSP_DDU',  'WARD_DDU_EMERG', 'EM-02', 'AVAILABLE',    TRUE),
    ('BED_DDU_ICU01', 'HOSP_DDU',  'WARD_DDU_ICU',   'ICU-01', 'AVAILABLE',    TRUE)
ON CONFLICT (ward_id, bed_number) DO NOTHING;

-- ============================================================================
-- 5. SYNTHETIC INVENTORY ITEMS (Dispensary Stock & Reorder Thresholds)
-- ============================================================================
INSERT INTO inventory_item (
    item_id, hospital_id, item_code, item_name, item_type, unit_of_measure,
    current_stock, reorder_threshold, reorder_quantity, is_active, is_simulated
) VALUES
    -- LNJP Inventory
    ('ITEM_LNJP_MED_001', 'HOSP_LNJP', 'DEMO_MED_ALPHA_500', 'Synthetic Compound Alpha 500mg',    'MEDICINE',   'TABLET', 1200, 200, 1000, TRUE, TRUE),
    ('ITEM_LNJP_MED_002', 'HOSP_LNJP', 'DEMO_MED_BETA_250',  'Synthetic Compound Beta 250mg',     'MEDICINE',   'TABLET',   80, 100,  500, TRUE, TRUE), -- Low stock alert
    ('ITEM_LNJP_MED_003', 'HOSP_LNJP', 'DEMO_MED_GAMMA_INJ', 'Synthetic Fluid Gamma 10ml',        'MEDICINE',   'VIAL',      0,  50,  300, TRUE, TRUE), -- Out of stock alert
    ('ITEM_LNJP_MED_004', 'HOSP_LNJP', 'DEMO_MED_DELTA_ORS', 'Synthetic Oral Rehydration Sachet', 'MEDICINE',   'SACHET',  650, 150,  500, TRUE, TRUE),
    ('ITEM_LNJP_CON_001', 'HOSP_LNJP', 'DEMO_CON_GLOVES_M',  'Synthetic Examination Gloves Size M','CONSUMABLE', 'PAIR',    800, 200,  600, TRUE, TRUE),
    ('ITEM_LNJP_CON_002', 'HOSP_LNJP', 'DEMO_CON_MASKS_3P',  'Synthetic Protective Face Masks',    'CONSUMABLE', 'PIECE',   450, 100,  500, TRUE, TRUE),
    ('ITEM_LNJP_CON_003', 'HOSP_LNJP', 'DEMO_CON_GAUZE_SWAB','Synthetic Sterile Gauze Swab Pack',  'CONSUMABLE', 'PIECE',   350,  50,  200, TRUE, TRUE),
    ('ITEM_LNJP_CON_004', 'HOSP_LNJP', 'DEMO_CON_IV_LINE',   'Synthetic IV Infusion Line Set',     'CONSUMABLE', 'PIECE',    75,  80,  200, TRUE, TRUE), -- Low stock alert

    -- GTB Inventory
    ('ITEM_GTB_MED_001',  'HOSP_GTB',  'DEMO_MED_ALPHA_500', 'Synthetic Compound Alpha 500mg',    'MEDICINE',   'TABLET',  850, 150,  800, TRUE, TRUE),
    ('ITEM_GTB_MED_002',  'HOSP_GTB',  'DEMO_MED_BETA_250',  'Synthetic Compound Beta 250mg',     'MEDICINE',   'TABLET',  400, 100,  500, TRUE, TRUE),
    ('ITEM_GTB_CON_001',  'HOSP_GTB',  'DEMO_CON_GLOVES_M',  'Synthetic Examination Gloves Size M','CONSUMABLE', 'PAIR',     40,  60,  200, TRUE, TRUE), -- Low stock alert
    ('ITEM_GTB_CON_002',  'HOSP_GTB',  'DEMO_CON_GAUZE_SWAB','Synthetic Sterile Gauze Swab Pack',  'CONSUMABLE', 'PIECE',   500, 100,  400, TRUE, TRUE),

    -- DDU Inventory
    ('ITEM_DDU_MED_001',  'HOSP_DDU',  'DEMO_MED_ALPHA_500', 'Synthetic Compound Alpha 500mg',    'MEDICINE',   'TABLET',  950, 150,  800, TRUE, TRUE),
    ('ITEM_DDU_MED_002',  'HOSP_DDU',  'DEMO_MED_BETA_250',  'Synthetic Compound Beta 250mg',     'MEDICINE',   'TABLET',  250,  80,  400, TRUE, TRUE),
    ('ITEM_DDU_MED_003',  'HOSP_DDU',  'DEMO_MED_GAMMA_INJ', 'Synthetic Fluid Gamma 10ml',        'MEDICINE',   'VIAL',     45,  50,  200, TRUE, TRUE), -- Low stock alert
    ('ITEM_DDU_CON_001',  'HOSP_DDU',  'DEMO_CON_GLOVES_M',  'Synthetic Examination Gloves Size M','CONSUMABLE', 'PAIR',    300,  50,  200, TRUE, TRUE),
    ('ITEM_DDU_CON_002',  'HOSP_DDU',  'DEMO_CON_GAUZE_SWAB','Synthetic Sterile Gauze Swab Pack',  'CONSUMABLE', 'PIECE',   180,  40,  150, TRUE, TRUE)
ON CONFLICT (hospital_id, item_code) DO UPDATE SET
    current_stock     = EXCLUDED.current_stock,
    reorder_threshold = EXCLUDED.reorder_threshold,
    reorder_quantity  = EXCLUDED.reorder_quantity;

-- ============================================================================
-- 6. SYNTHETIC OPD TOKENS (Demonstration Queue with Mixed Operational Statuses)
-- ============================================================================
INSERT INTO opd_token (
    token_id, hospital_id, department_id, counter_id, token_number, status, priority_level,
    issued_at, called_at, service_started_at, service_completed_at, cancelled_at, is_simulated
) VALUES
    -- LNJP General Medicine OPD Tokens
    ('e0000000-0000-0000-0000-000000000001', 'HOSP_LNJP', 'DEPT_LNJP_GEN', NULL,          'GEN-101', 'WAITING',    0,
     NOW() - INTERVAL '30 minutes', NULL, NULL, NULL, NULL, TRUE),
    ('e0000000-0000-0000-0000-000000000002', 'HOSP_LNJP', 'DEPT_LNJP_GEN', NULL,          'GEN-102', 'WAITING',    1,
     NOW() - INTERVAL '25 minutes', NULL, NULL, NULL, NULL, TRUE),
    ('e0000000-0000-0000-0000-000000000003', 'HOSP_LNJP', 'DEPT_LNJP_GEN', 'CTR_LNJP_G1', 'GEN-103', 'CALLED',     0,
     NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes', NULL, NULL, NULL, TRUE),
    ('e0000000-0000-0000-0000-000000000004', 'HOSP_LNJP', 'DEPT_LNJP_GEN', 'CTR_LNJP_G2', 'GEN-104', 'IN_SERVICE', 0,
     NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '12 minutes', NULL, NULL, TRUE),
    ('e0000000-0000-0000-0000-000000000005', 'HOSP_LNJP', 'DEPT_LNJP_GEN', 'CTR_LNJP_G1', 'GEN-105', 'COMPLETED',  0,
     NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '10 minutes', NULL, TRUE),
    ('e0000000-0000-0000-0000-000000000006', 'HOSP_LNJP', 'DEPT_LNJP_GEN', NULL,          'GEN-106', 'CANCELLED',  0,
     NOW() - INTERVAL '45 minutes', NULL, NULL, NULL, NOW() - INTERVAL '25 minutes', TRUE),

    -- GTB & DDU Tokens
    ('e0000000-0000-0000-0000-000000000007', 'HOSP_GTB',  'DEPT_GTB_GEN',  NULL,          'GTB-201', 'WAITING',    0,
     NOW() - INTERVAL '15 minutes', NULL, NULL, NULL, NULL, TRUE),
    ('e0000000-0000-0000-0000-000000000008', 'HOSP_DDU',  'DEPT_DDU_GEN',  NULL,          'DDU-301', 'WAITING',    0,
     NOW() - INTERVAL '10 minutes', NULL, NULL, NULL, NULL, TRUE)
ON CONFLICT (token_id) DO UPDATE SET
    status               = EXCLUDED.status,
    counter_id           = EXCLUDED.counter_id,
    called_at            = EXCLUDED.called_at,
    service_started_at   = EXCLUDED.service_started_at,
    service_completed_at = EXCLUDED.service_completed_at,
    cancelled_at         = EXCLUDED.cancelled_at;

-- ============================================================================
-- 7. SYNTHETIC INPATIENT ADMISSIONS (Full Lifecycle Across Demonstration Wards)
-- ============================================================================
INSERT INTO admission (
    admission_id, hospital_id, ward_id, bed_id, admission_number, status,
    requested_at, assigned_at, admitted_at, discharged_at, cancelled_at, notes, is_simulated
) VALUES
    -- LNJP Admissions
    ('f0000000-0000-0000-0000-000000000001', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'BED_LNJP_G02', 'ADM-LNJP-001', 'ADMITTED',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '47 hours', NOW() - INTERVAL '46 hours', NULL, NULL,
     'Synthetic admission intake demonstration record', TRUE),
    ('f0000000-0000-0000-0000-000000000002', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'BED_LNJP_G03', 'ADM-LNJP-002', 'BED_ASSIGNED',
     NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours', NULL, NULL, NULL,
     'Synthetic bed allocation ready for patient transport', TRUE),
    ('f0000000-0000-0000-0000-000000000003', 'HOSP_LNJP', 'WARD_LNJP_GEN', NULL,           'ADM-LNJP-003', 'PENDING_REVIEW',
     NOW() - INTERVAL '90 minutes', NULL, NULL, NULL, NULL,
     'Awaiting bed coordinator operational review', TRUE),
    ('f0000000-0000-0000-0000-000000000004', 'HOSP_LNJP', 'WARD_LNJP_GEN', NULL,           'ADM-LNJP-004', 'ADMISSION_REQUESTED',
     NOW() - INTERVAL '20 minutes', NULL, NULL, NULL, NULL,
     'Newly requested admission request', TRUE),
    ('f0000000-0000-0000-0000-000000000005', 'HOSP_LNJP', 'WARD_LNJP_GEN', 'BED_LNJP_G01', 'ADM-LNJP-005', 'DISCHARGED',
     NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '1 hour', NOW() - INTERVAL '5 days' + INTERVAL '2 hours',
     NOW() - INTERVAL '1 day', NULL, 'Synthetic completed inpatient episode', TRUE),
    ('f0000000-0000-0000-0000-000000000006', 'HOSP_LNJP', 'WARD_LNJP_GEN', NULL,           'ADM-LNJP-006', 'CANCELLED',
     NOW() - INTERVAL '12 hours', NULL, NULL, NULL, NOW() - INTERVAL '10 hours',
     'Cancelled by attending staff before bed assignment', TRUE),
    ('f0000000-0000-0000-0000-000000000007', 'HOSP_LNJP', 'WARD_LNJP_ICU', 'BED_LNJP_ICU01', 'ADM-LNJP-ICU1', 'ADMITTED',
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '22 hours', NULL, NULL,
     'Synthetic critical care observation', TRUE)
ON CONFLICT (admission_id) DO UPDATE SET
    status        = EXCLUDED.status,
    bed_id        = EXCLUDED.bed_id,
    assigned_at   = EXCLUDED.assigned_at,
    admitted_at   = EXCLUDED.admitted_at,
    discharged_at = EXCLUDED.discharged_at,
    cancelled_at  = EXCLUDED.cancelled_at;

-- ============================================================================
-- 8. SYNTHETIC INVENTORY TRANSACTIONS (Append-Only Ledger Demonstrator)
-- Uses WHERE NOT EXISTS to guarantee idempotency under append-only trigger.
-- ============================================================================
INSERT INTO inventory_transaction (
    transaction_id, hospital_id, item_id, transaction_type, quantity, batch_number, audit_reason, is_simulated
)
SELECT 'd0000000-0000-0000-0000-000000000001', 'HOSP_LNJP', 'ITEM_LNJP_MED_001', 'RECEIPT', 1000, 'BATCH-ALPHA-01', 'Initial synthetic stock intake', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction WHERE transaction_id = 'd0000000-0000-0000-0000-000000000001');

INSERT INTO inventory_transaction (
    transaction_id, hospital_id, item_id, transaction_type, quantity, batch_number, audit_reason, is_simulated
)
SELECT 'd0000000-0000-0000-0000-000000000002', 'HOSP_LNJP', 'ITEM_LNJP_MED_001', 'ISSUE', 50, 'BATCH-ALPHA-01', 'General OPD pharmacy synthetic dispensation', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction WHERE transaction_id = 'd0000000-0000-0000-0000-000000000002');

INSERT INTO inventory_transaction (
    transaction_id, hospital_id, item_id, transaction_type, quantity, batch_number, audit_reason, is_simulated
)
SELECT 'd0000000-0000-0000-0000-000000000003', 'HOSP_LNJP', 'ITEM_LNJP_MED_002', 'ADJUSTMENT', 20, 'BATCH-BETA-01', 'Periodic inventory stock reconciliation', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction WHERE transaction_id = 'd0000000-0000-0000-0000-000000000003');

INSERT INTO inventory_transaction (
    transaction_id, hospital_id, item_id, transaction_type, quantity, batch_number, audit_reason, is_simulated
)
SELECT 'd0000000-0000-0000-0000-000000000004', 'HOSP_LNJP', 'ITEM_LNJP_CON_001', 'RECEIPT', 500, 'BATCH-GLOVES-01', 'Consumable supply intake', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction WHERE transaction_id = 'd0000000-0000-0000-0000-000000000004');

INSERT INTO inventory_transaction (
    transaction_id, hospital_id, item_id, transaction_type, quantity, batch_number, audit_reason, is_simulated
)
SELECT 'd0000000-0000-0000-0000-000000000005', 'HOSP_GTB', 'ITEM_GTB_MED_001', 'RECEIPT', 800, 'BATCH-GTB-01', 'Central store synthetic delivery', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction WHERE transaction_id = 'd0000000-0000-0000-0000-000000000005');

INSERT INTO inventory_transaction (
    transaction_id, hospital_id, item_id, transaction_type, quantity, batch_number, audit_reason, is_simulated
)
SELECT 'd0000000-0000-0000-0000-000000000006', 'HOSP_DDU', 'ITEM_DDU_MED_001', 'RECEIPT', 900, 'BATCH-DDU-01', 'Dispensary intake', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_transaction WHERE transaction_id = 'd0000000-0000-0000-0000-000000000006');

