-- Expand-only migration. Back up the database and apply once before new code.
-- Do not fabricate tariff/meter snapshots for existing active orders.
ALTER TABLE charge_order
    ADD COLUMN metering_source VARCHAR(24) NULL,
    ADD COLUMN simulated_power_watts INT NULL,
    ADD COLUMN price_snapshot TEXT NULL,
    ADD COLUMN station_name_snapshot VARCHAR(255) NULL,
    ADD COLUMN socket_code_snapshot VARCHAR(255) NULL,
    ADD COLUMN failure_reason VARCHAR(500) NULL;
CREATE INDEX idx_order_customer_active ON charge_order (owner_username, status, archived);
-- Rollback: drain/reconcile new active tasks before switching to old binaries.
-- Keep these nullable columns and completed records; do not drop them on rollback.
