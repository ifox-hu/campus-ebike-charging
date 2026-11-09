-- Apply once after V8; additive migration, keep historical orders unchanged.
ALTER TABLE charge_order ADD COLUMN plan_id VARCHAR(20) NULL,
 ADD COLUMN duration_minutes INT NULL, ADD COLUMN estimated_amount DECIMAL(12,2) NULL,
 ADD COLUMN end_reason VARCHAR(100) NULL;
-- Existing records intentionally retain NULL plan: no retroactive stopping rule.
ALTER TABLE station ADD COLUMN scene VARCHAR(20) NULL;
ALTER TABLE charger ADD COLUMN status_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE connector ADD COLUMN status_revision BIGINT NOT NULL DEFAULT 0;
-- Only classify known public campus examples; do not fabricate other site types.
UPDATE station SET scene='校园' WHERE scene IS NULL AND name LIKE '%师范学院%模拟%';
CREATE TABLE alert_acknowledgement (
 alert_key VARCHAR(100) PRIMARY KEY, note VARCHAR(500) NOT NULL,
 username VARCHAR(50) NOT NULL, updated_at DATETIME(6) NOT NULL
);
ALTER TABLE repair_ticket ADD COLUMN assignee_username VARCHAR(50) NULL,
 ADD COLUMN progress_history TEXT NULL;
-- Roll back application binaries only after draining new plan orders. Retain
-- these columns, acknowledgements and repair history; do not drop business data.
