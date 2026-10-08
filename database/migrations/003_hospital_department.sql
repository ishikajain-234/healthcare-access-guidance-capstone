-- 003_hospital_department.sql
--
-- PS-75 Hospital Operations Foundation
-- Adds the hospital and department hierarchy required by
-- OPD queue, bed/admission, inventory, and city-aggregation modules.
--
-- Tables added: 2
-- 8. hospital
-- 9. department

-- 8. Hospital Registry
CREATE TABLE IF NOT EXISTS hospital (
    hospital_id VARCHAR(64) PRIMARY KEY,
    hospital_code VARCHAR(64) NOT NULL UNIQUE,
    hospital_name VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_city
    ON hospital(city);

-- 9. Hospital Departments
CREATE TABLE IF NOT EXISTS department (
    department_id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    department_code VARCHAR(64) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_department_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_department_hospital_id
        UNIQUE (hospital_id, department_id),

    CONSTRAINT uq_department_hospital_code
        UNIQUE (hospital_id, department_code)
);

CREATE INDEX IF NOT EXISTS idx_department_hospital
    ON department(hospital_id);
