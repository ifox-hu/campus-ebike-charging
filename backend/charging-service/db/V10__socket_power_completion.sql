-- Apply once after V9. NULL policy keeps historical orders on their original meter.
ALTER TABLE charge_order ADD COLUMN completion_policy VARCHAR(24) NULL,
  ADD COLUMN charging_power_seen BOOLEAN NULL,
  ADD COLUMN low_power_since DATETIME(3) NULL,
  ADD COLUMN last_power_sample_at DATETIME(3) NULL,
  ADD COLUMN power_completion_requested_at DATETIME(3) NULL;
