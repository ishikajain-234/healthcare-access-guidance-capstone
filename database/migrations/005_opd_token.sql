-- 005_opd_token.sql
--
-- PS-75 Hospital Operations: OPD Queue Token Schema (Architecture Freeze v2.1)
-- Adds individual synthetic patient visit tokens with state-controlled lifecycle timestamps.
--
-- Table added: 1
-- 11. opd_token

CREATE TABLE IF NOT EXISTS opd_token (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id VARCHAR(64) NOT NULL,
    department_id VARCHAR(64) NOT NULL,
    counter_id VARCHAR(64),
    linked_session_id UUID UNIQUE,
    token_number VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'WAITING',
    priority_level INTEGER NOT NULL DEFAULT 0,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    called_at TIMESTAMP WITH TIME ZONE,
    service_started_at TIMESTAMP WITH TIME ZONE,
    service_completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce non-negative priority level
    CONSTRAINT chk_opd_token_priority
        CHECK (priority_level >= 0),

    -- Enforce allowed operational statuses
    CONSTRAINT chk_opd_token_status
        CHECK (status IN ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED')),

    -- Counter must be NULL while status='WAITING'
    CONSTRAINT chk_opd_token_waiting_counter
        CHECK (status != 'WAITING' OR counter_id IS NULL),

    -- Counter must be assigned when token is active in service or completed
    CONSTRAINT chk_opd_token_served_counter
        CHECK (status NOT IN ('CALLED', 'IN_SERVICE', 'COMPLETED') OR counter_id IS NOT NULL),

    -- Timestamp ordering: called_at >= issued_at
    CONSTRAINT chk_opd_token_called_at
        CHECK (called_at IS NULL OR called_at >= issued_at),

    -- Timestamp ordering: service_started_at >= called_at
    CONSTRAINT chk_opd_token_service_started_at
        CHECK (service_started_at IS NULL OR (called_at IS NOT NULL AND service_started_at >= called_at)),

    -- Timestamp ordering: service_completed_at >= service_started_at
    CONSTRAINT chk_opd_token_service_completed_at
        CHECK (service_completed_at IS NULL OR (service_started_at IS NOT NULL AND service_completed_at >= service_started_at)),

    -- Timestamp ordering: cancelled_at >= issued_at
    CONSTRAINT chk_opd_token_cancelled_at
        CHECK (cancelled_at IS NULL OR cancelled_at >= issued_at),

    -- Composite foreign key enforcing hospital -> department hierarchy
    CONSTRAINT fk_opd_token_department
        FOREIGN KEY (hospital_id, department_id)
        REFERENCES department(hospital_id, department_id)
        ON DELETE RESTRICT,

    -- Composite foreign key enforcing department -> counter alignment
    CONSTRAINT fk_opd_token_counter
        FOREIGN KEY (department_id, counter_id)
        REFERENCES opd_queue_counter(department_id, counter_id)
        ON DELETE RESTRICT,

    -- 0..1 relationship from guidance_session to opd_token (UNIQUE)
    CONSTRAINT fk_opd_token_guidance_session
        FOREIGN KEY (linked_session_id)
        REFERENCES guidance_session(session_id)
        ON DELETE SET NULL
);

-- Index for department queue filtering by status
CREATE INDEX IF NOT EXISTS idx_opd_token_dept_status
    ON opd_token(department_id, status);

-- Index for counter activity filtering by status
CREATE INDEX IF NOT EXISTS idx_opd_token_counter_status
    ON opd_token(counter_id, status);

-- Index for timestamp analysis and queue ordering
CREATE INDEX IF NOT EXISTS idx_opd_token_issued_at
    ON opd_token(issued_at);

-- Index for guidance session lookups
CREATE INDEX IF NOT EXISTS idx_opd_token_linked_session
    ON opd_token(linked_session_id);
