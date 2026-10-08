-- 010_city_aggregate_snapshot.sql
--
-- PS-75 Hospital Operations: City-Wide Periodic Operational Aggregate Snapshot Schema (Architecture Freeze v2.1)
-- Stores periodic synthetic aggregate snapshots of hospital operational metrics.
-- Explicitly represents periodic offline/batch analytical rollups; does NOT claim live municipal availability.
--
-- Table added: 1
-- 17. city_aggregate_snapshot (Final table of the 17-table architecture)

CREATE TABLE IF NOT EXISTS city_aggregate_snapshot (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    snapshot_period VARCHAR(32) NOT NULL DEFAULT 'HOURLY',
    aggregate_level VARCHAR(32) NOT NULL DEFAULT 'HOSPITAL',
    hospital_id VARCHAR(64),
    department_id VARCHAR(64),

    -- OPD queue metrics
    opd_total_tokens INTEGER NOT NULL DEFAULT 0,
    opd_waiting_tokens INTEGER NOT NULL DEFAULT 0,
    opd_serving_tokens INTEGER NOT NULL DEFAULT 0,
    opd_completed_tokens INTEGER NOT NULL DEFAULT 0,
    opd_cancelled_tokens INTEGER NOT NULL DEFAULT 0,
    opd_active_counters INTEGER NOT NULL DEFAULT 0,
    opd_avg_wait_minutes NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    opd_avg_service_minutes NUMERIC(6,2) NOT NULL DEFAULT 0.00,

    -- Bed capacity and occupancy metrics
    total_beds INTEGER NOT NULL DEFAULT 0,
    available_beds INTEGER NOT NULL DEFAULT 0,
    occupied_beds INTEGER NOT NULL DEFAULT 0,
    reserved_beds INTEGER NOT NULL DEFAULT 0,
    cleaning_beds INTEGER NOT NULL DEFAULT 0,
    out_of_service_beds INTEGER NOT NULL DEFAULT 0,
    icu_total_beds INTEGER NOT NULL DEFAULT 0,
    icu_available_beds INTEGER NOT NULL DEFAULT 0,
    icu_occupied_beds INTEGER NOT NULL DEFAULT 0,
    bed_occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,

    -- Inpatient admission metrics
    admissions_total INTEGER NOT NULL DEFAULT 0,
    admissions_active INTEGER NOT NULL DEFAULT 0,
    admissions_discharged INTEGER NOT NULL DEFAULT 0,

    -- Dispensary inventory alert metrics
    inventory_items_total INTEGER NOT NULL DEFAULT 0,
    inventory_low_stock_count INTEGER NOT NULL DEFAULT 0,
    inventory_out_of_stock_count INTEGER NOT NULL DEFAULT 0,

    -- Simulation metadata & disclaimers
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    data_confidence_notice TEXT NOT NULL DEFAULT 'Simulated periodic operational snapshot. Does not represent live municipal availability.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints on temporal period and aggregation level
    CONSTRAINT chk_city_snap_period
        CHECK (snapshot_period IN ('15_MIN', 'HOURLY', 'DAILY', 'CUSTOM')),

    CONSTRAINT chk_city_snap_level
        CHECK (aggregate_level IN ('CITY', 'HOSPITAL', 'DEPARTMENT')),

    -- Structural hierarchy constraint:
    -- CITY level: hospital_id and department_id must be NULL
    -- HOSPITAL level: hospital_id must be NOT NULL, department_id must be NULL
    -- DEPARTMENT level: hospital_id and department_id must both be NOT NULL
    CONSTRAINT chk_city_snap_hierarchy
        CHECK (
            (aggregate_level = 'CITY' AND hospital_id IS NULL AND department_id IS NULL) OR
            (aggregate_level = 'HOSPITAL' AND hospital_id IS NOT NULL AND department_id IS NULL) OR
            (aggregate_level = 'DEPARTMENT' AND hospital_id IS NOT NULL AND department_id IS NOT NULL)
        ),

    -- Foreign keys maintaining referential integrity
    CONSTRAINT fk_city_snap_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_city_snap_department
        FOREIGN KEY (hospital_id, department_id)
        REFERENCES department(hospital_id, department_id)
        ON DELETE RESTRICT,

    -- Non-negative constraints for all operational metrics
    CONSTRAINT chk_city_snap_opd_non_negative
        CHECK (
            opd_total_tokens >= 0 AND
            opd_waiting_tokens >= 0 AND
            opd_serving_tokens >= 0 AND
            opd_completed_tokens >= 0 AND
            opd_cancelled_tokens >= 0 AND
            opd_active_counters >= 0 AND
            opd_avg_wait_minutes >= 0 AND
            opd_avg_service_minutes >= 0
        ),

    CONSTRAINT chk_city_snap_beds_non_negative
        CHECK (
            total_beds >= 0 AND
            available_beds >= 0 AND
            occupied_beds >= 0 AND
            reserved_beds >= 0 AND
            cleaning_beds >= 0 AND
            out_of_service_beds >= 0 AND
            icu_total_beds >= 0 AND
            icu_available_beds >= 0 AND
            icu_occupied_beds >= 0 AND
            bed_occupancy_rate >= 0 AND
            bed_occupancy_rate <= 100
        ),

    CONSTRAINT chk_city_snap_admissions_non_negative
        CHECK (
            admissions_total >= 0 AND
            admissions_active >= 0 AND
            admissions_discharged >= 0
        ),

    CONSTRAINT chk_city_snap_inventory_non_negative
        CHECK (
            inventory_items_total >= 0 AND
            inventory_low_stock_count >= 0 AND
            inventory_out_of_stock_count >= 0
        )
);

-- Unique key preventing duplicate snapshots for the same timestamp, period, and aggregate scope
CREATE UNIQUE INDEX IF NOT EXISTS uq_city_snap_slot
    ON city_aggregate_snapshot(
        snapshot_timestamp,
        snapshot_period,
        aggregate_level,
        COALESCE(hospital_id, '__CITY__'),
        COALESCE(department_id, '__ALL__')
    );

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_city_snap_timestamp
    ON city_aggregate_snapshot(snapshot_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_city_snap_hospital_time
    ON city_aggregate_snapshot(hospital_id, snapshot_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_city_snap_level_time
    ON city_aggregate_snapshot(aggregate_level, snapshot_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_city_snap_dept_time
    ON city_aggregate_snapshot(department_id, snapshot_timestamp DESC)
    WHERE department_id IS NOT NULL;
