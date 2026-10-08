-- 007_admission.sql
--
-- PS-75 Hospital Operations: Inpatient Admission Schema (Architecture Freeze v2.1)
-- Adds operational tracking of bed allocation and inpatient lifecycle (Zero clinical triage / zero PII).
--
-- Table added: 1
-- 14. admission

CREATE TABLE IF NOT EXISTS admission (
    admission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id VARCHAR(64) NOT NULL,
    ward_id VARCHAR(64) NOT NULL,
    bed_id VARCHAR(64),
    linked_token_id UUID UNIQUE,
    admission_number VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ADMISSION_REQUESTED',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    admitted_at TIMESTAMP WITH TIME ZONE,
    discharged_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce allowed operational admission statuses
    CONSTRAINT chk_admission_status
        CHECK (status IN (
            'ADMISSION_REQUESTED',
            'PENDING_REVIEW',
            'BED_ASSIGNED',
            'ADMISSION_CONFIRMED',
            'ADMITTED',
            'DISCHARGED',
            'CANCELLED'
        )),

    -- Bed must be assigned when status is BED_ASSIGNED, ADMISSION_CONFIRMED, or ADMITTED
    CONSTRAINT chk_admission_bed_assigned
        CHECK (status NOT IN ('BED_ASSIGNED', 'ADMISSION_CONFIRMED', 'ADMITTED') OR bed_id IS NOT NULL),

    -- Lifecycle timestamp ordering: assigned_at >= requested_at
    CONSTRAINT chk_admission_assigned_at
        CHECK (assigned_at IS NULL OR assigned_at >= requested_at),

    -- Lifecycle timestamp ordering: admitted_at >= assigned_at
    CONSTRAINT chk_admission_admitted_at
        CHECK (admitted_at IS NULL OR (assigned_at IS NOT NULL AND admitted_at >= assigned_at)),

    -- Lifecycle timestamp ordering: discharged_at >= admitted_at
    CONSTRAINT chk_admission_discharged_at
        CHECK (discharged_at IS NULL OR (admitted_at IS NOT NULL AND discharged_at >= admitted_at)),

    -- Lifecycle timestamp ordering: cancelled_at >= requested_at
    CONSTRAINT chk_admission_cancelled_at
        CHECK (cancelled_at IS NULL OR cancelled_at >= requested_at),

    -- Composite foreign key enforcing hospital -> ward hierarchy
    CONSTRAINT fk_admission_hospital_ward
        FOREIGN KEY (hospital_id, ward_id)
        REFERENCES bed_ward(hospital_id, ward_id)
        ON DELETE RESTRICT,

    -- Foreign key to bed (nullable until allocated)
    CONSTRAINT fk_admission_bed
        FOREIGN KEY (bed_id)
        REFERENCES bed(bed_id)
        ON DELETE SET NULL,

    -- 0..1 relationship from opd_token to admission (nullable and UNIQUE)
    CONSTRAINT fk_admission_opd_token
        FOREIGN KEY (linked_token_id)
        REFERENCES opd_token(token_id)
        ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admission_hospital_status
    ON admission(hospital_id, status);

CREATE INDEX IF NOT EXISTS idx_admission_ward_status
    ON admission(ward_id, status);

CREATE INDEX IF NOT EXISTS idx_admission_bed
    ON admission(bed_id);

CREATE INDEX IF NOT EXISTS idx_admission_requested_at
    ON admission(requested_at);

CREATE INDEX IF NOT EXISTS idx_admission_linked_token
    ON admission(linked_token_id);

-- Trigger to validate that if bed_id is assigned, hospital_id + ward_id + bed_id remain internally consistent
CREATE OR REPLACE FUNCTION validate_admission_bed_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    v_bed_hospital_id VARCHAR(64);
    v_bed_ward_id VARCHAR(64);
BEGIN
    IF NEW.bed_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT hospital_id, ward_id INTO v_bed_hospital_id, v_bed_ward_id
    FROM bed
    WHERE bed_id = NEW.bed_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced bed % does not exist', NEW.bed_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_bed_hospital_id != NEW.hospital_id OR v_bed_ward_id != NEW.ward_id THEN
        RAISE EXCEPTION 'Bed hierarchy mismatch: bed % belongs to hospital %, ward %, but admission specifies hospital %, ward %',
            NEW.bed_id, v_bed_hospital_id, v_bed_ward_id, NEW.hospital_id, NEW.ward_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_admission_bed_hierarchy ON admission;
CREATE TRIGGER trg_validate_admission_bed_hierarchy
BEFORE INSERT OR UPDATE ON admission
FOR EACH ROW
EXECUTE FUNCTION validate_admission_bed_hierarchy();
