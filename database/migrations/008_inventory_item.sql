-- 008_inventory_item.sql
--
-- PS-75 Hospital Operations: Synthetic Dispensary Inventory Item Schema (Architecture Freeze v2.1)
-- Adds synthetic medicine and consumable catalogue tracking hospital ownership and stock levels.
-- Strictly synthetic demonstration inventory; zero real pharmaceutical brand names, clinical dosages, or patient PII.
--
-- Table added: 1
-- 15. inventory_item

CREATE TABLE IF NOT EXISTS inventory_item (
    item_id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    item_code VARCHAR(64) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(32) NOT NULL,
    unit_of_measure VARCHAR(32) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 100,
    reorder_quantity INTEGER NOT NULL DEFAULT 500,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce synthetic item types (distinguishes synthetic medicine vs consumable without clinical semantics)
    CONSTRAINT chk_inventory_item_type
        CHECK (item_type IN ('MEDICINE', 'CONSUMABLE')),

    -- Enforce standardized non-clinical units of measure
    CONSTRAINT chk_inventory_item_unit
        CHECK (unit_of_measure IN ('TABLET', 'VIAL', 'PIECE', 'BOX', 'ROLL', 'SACHET', 'PAIR')),

    -- Enforce non-negative stock levels
    CONSTRAINT chk_inventory_item_stock
        CHECK (current_stock >= 0),

    -- Enforce non-negative reorder threshold
    CONSTRAINT chk_inventory_item_threshold
        CHECK (reorder_threshold >= 0),

    -- Enforce positive reorder quantity
    CONSTRAINT chk_inventory_item_reorder_qty
        CHECK (reorder_quantity > 0),

    -- Foreign key to hospital master
    CONSTRAINT fk_inventory_item_hospital
        FOREIGN KEY (hospital_id)
        REFERENCES hospital(hospital_id)
        ON DELETE RESTRICT,

    -- Unique item code per hospital
    CONSTRAINT uq_inventory_item_hospital_code
        UNIQUE (hospital_id, item_code),

    -- Composite unique key to support future composite FK from inventory_transaction(hospital_id, item_id)
    CONSTRAINT uq_inventory_item_hospital_item
        UNIQUE (hospital_id, item_id)
);

-- Index for querying items by hospital and category
CREATE INDEX IF NOT EXISTS idx_inv_item_hospital_type
    ON inventory_item(hospital_id, item_type);

-- Index for stock queries and depletion tracking
CREATE INDEX IF NOT EXISTS idx_inv_item_stock
    ON inventory_item(hospital_id, current_stock);

-- Partial index for fast identification of low-stock items at or below reorder threshold
CREATE INDEX IF NOT EXISTS idx_inv_item_reorder_alert
    ON inventory_item(hospital_id, current_stock)
    WHERE current_stock <= reorder_threshold;
