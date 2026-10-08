-- 009_inventory_transaction.sql
--
-- PS-75 Hospital Operations: Append-Only Synthetic Inventory Transaction Schema (Architecture Freeze v2.1)
-- Records stock additions, issues, adjustments, and transfers with immutable ledger semantics.
-- Strictly synthetic demonstration inventory; zero real pharmaceutical brand names, clinical dosages, or patient PII.
--
-- Table added: 1
-- 16. inventory_transaction

CREATE TABLE IF NOT EXISTS inventory_transaction (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id VARCHAR(64) NOT NULL,
    item_id VARCHAR(64) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL,
    quantity INTEGER NOT NULL,
    batch_number VARCHAR(64) NOT NULL DEFAULT 'DEFAULT_BATCH',
    linked_token_id UUID,
    audit_reason TEXT,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Enforce strictly positive transaction quantities
    CONSTRAINT chk_inv_tx_quantity
        CHECK (quantity > 0),

    -- Enforce constrained operational transaction types
    CONSTRAINT chk_inv_tx_type
        CHECK (transaction_type IN ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')),

    -- Composite foreign key enforcing hospital -> item hierarchy
    CONSTRAINT fk_inv_tx_hospital_item
        FOREIGN KEY (hospital_id, item_id)
        REFERENCES inventory_item(hospital_id, item_id)
        ON DELETE RESTRICT,

    -- Optional link to OPD token (0..N cardinality; nullable; does NOT require OPD completion)
    CONSTRAINT fk_inv_tx_opd_token
        FOREIGN KEY (linked_token_id)
        REFERENCES opd_token(token_id)
        ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inv_tx_hospital_item_time
    ON inventory_transaction(hospital_id, item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_tx_token
    ON inventory_transaction(linked_token_id);

CREATE INDEX IF NOT EXISTS idx_inv_tx_type
    ON inventory_transaction(transaction_type);

CREATE INDEX IF NOT EXISTS idx_inv_tx_created_at
    ON inventory_transaction(created_at);

-- Trigger Function: Enforce Append-Only Immutability (Reject UPDATE and DELETE)
CREATE OR REPLACE FUNCTION prevent_inventory_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'inventory_transaction table is append-only: UPDATE and DELETE operations are strictly prohibited.'
        USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_inventory_transaction_mutation ON inventory_transaction;
CREATE TRIGGER trg_prevent_inventory_transaction_mutation
BEFORE UPDATE OR DELETE ON inventory_transaction
FOR EACH ROW
EXECUTE FUNCTION prevent_inventory_transaction_mutation();
