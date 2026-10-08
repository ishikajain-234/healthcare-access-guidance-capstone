-- 004_opd_queue_counter.sql
--
-- PS-75 Hospital Operations: OPD Queue Counter Schema (Architecture Freeze v2.1)
-- Adds physical or virtual consultation counters within the hospital-department hierarchy.
--
-- Table added: 1
-- 10. opd_queue_counter

CREATE TABLE IF NOT EXISTS opd_queue_counter (
    counter_id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    department_id VARCHAR(64) NOT NULL,
    counter_number INTEGER NOT NULL,
    counter_name VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce positive counter numbers
    CONSTRAINT chk_counter_number
        CHECK (counter_number > 0),

    -- Composite foreign key enforcing hospital -> department hierarchy
    CONSTRAINT fk_opd_counter_department
        FOREIGN KEY (hospital_id, department_id)
        REFERENCES department(hospital_id, department_id)
        ON DELETE RESTRICT,

    -- Unique key suitable for future opd_token composite FK (department_id, counter_id)
    CONSTRAINT uq_opd_counter_dept_counter
        UNIQUE (department_id, counter_id),

    -- Prevent duplicate counter numbers within the same department
    CONSTRAINT uq_opd_counter_dept_number
        UNIQUE (department_id, counter_number)
);

CREATE INDEX IF NOT EXISTS idx_opd_counter_hospital_dept
    ON opd_queue_counter(hospital_id, department_id);

CREATE INDEX IF NOT EXISTS idx_opd_counter_active
    ON opd_queue_counter(department_id, is_active);
