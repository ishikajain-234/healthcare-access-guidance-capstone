-- 006_bed_ward_and_bed.sql
--
-- PS-75 Hospital Operations: Bed Ward & Bed Schema (Architecture Freeze v2.1)
-- Adds physical hospital wards and bed capacity tracking with deterministic state transitions.
--
-- Tables added: 2
-- 12. bed_ward
-- 13. bed

-- 12. Bed Ward Table
CREATE TABLE IF NOT EXISTS bed_ward (
    ward_id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    ward_code VARCHAR(64) NOT NULL,
    ward_name VARCHAR(128) NOT NULL,
    ward_type VARCHAR(32) NOT NULL,
    total_capacity INTEGER NOT NULL,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce positive capacity
    CONSTRAINT chk_bed_ward_capacity
        CHECK (total_capacity > 0),

    -- Enforce allowed ward types
    CONSTRAINT chk_bed_ward_type
        CHECK (ward_type IN ('GENERAL', 'ICU', 'HDU', 'EMERGENCY')),

    -- Ward belongs to hospital
    CONSTRAINT fk_bed_ward_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id)
        ON DELETE RESTRICT,

    -- Unique ward code within hospital
    CONSTRAINT uq_bed_ward_hospital_code
        UNIQUE (hospital_id, ward_code),

    -- Unique composite key for bed composite FK
    CONSTRAINT uq_bed_ward_hospital_ward
        UNIQUE (hospital_id, ward_id)
);

CREATE INDEX IF NOT EXISTS idx_bed_ward_hospital
    ON bed_ward(hospital_id);

CREATE INDEX IF NOT EXISTS idx_bed_ward_type
    ON bed_ward(ward_type);

-- 13. Bed Table
CREATE TABLE IF NOT EXISTS bed (
    bed_id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    ward_id VARCHAR(64) NOT NULL,
    bed_number VARCHAR(32) NOT NULL,
    current_state VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    last_status_change_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce allowed bed operational states
    CONSTRAINT chk_bed_current_state
        CHECK (current_state IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE')),

    -- Composite foreign key enforcing hospital -> ward hierarchy
    CONSTRAINT fk_bed_ward
        FOREIGN KEY (hospital_id, ward_id)
        REFERENCES bed_ward(hospital_id, ward_id)
        ON DELETE RESTRICT,

    -- Unique bed number within a ward
    CONSTRAINT uq_bed_ward_number
        UNIQUE (ward_id, bed_number)
);

CREATE INDEX IF NOT EXISTS idx_bed_ward
    ON bed(ward_id);

CREATE INDEX IF NOT EXISTS idx_bed_state
    ON bed(current_state);

CREATE INDEX IF NOT EXISTS idx_bed_ward_state
    ON bed(ward_id, current_state);

CREATE INDEX IF NOT EXISTS idx_bed_hospital_state
    ON bed(hospital_id, current_state);

-- Bed State Machine Transition Validation Trigger
CREATE OR REPLACE FUNCTION validate_bed_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- No change in state
    IF OLD.current_state = NEW.current_state THEN
        RETURN NEW;
    END IF;

    -- Allowed transitions (Architecture Freeze v2.1):
    -- AVAILABLE -> RESERVED
    -- AVAILABLE -> OUT_OF_SERVICE
    -- RESERVED -> OCCUPIED
    -- RESERVED -> AVAILABLE
    -- OCCUPIED -> CLEANING
    -- CLEANING -> AVAILABLE
    -- OUT_OF_SERVICE -> AVAILABLE
    IF (OLD.current_state = 'AVAILABLE' AND NEW.current_state IN ('RESERVED', 'OUT_OF_SERVICE')) OR
       (OLD.current_state = 'RESERVED' AND NEW.current_state IN ('OCCUPIED', 'AVAILABLE')) OR
       (OLD.current_state = 'OCCUPIED' AND NEW.current_state = 'CLEANING') OR
       (OLD.current_state = 'CLEANING' AND NEW.current_state = 'AVAILABLE') OR
       (OLD.current_state = 'OUT_OF_SERVICE' AND NEW.current_state = 'AVAILABLE') THEN
        NEW.last_status_change_at = NOW();
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Invalid bed state transition: % -> % is prohibited',
            OLD.current_state, NEW.current_state
            USING ERRCODE = 'check_violation';
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_bed_state_transition ON bed;
CREATE TRIGGER trg_validate_bed_state_transition
BEFORE UPDATE ON bed
FOR EACH ROW
EXECUTE FUNCTION validate_bed_state_transition();
