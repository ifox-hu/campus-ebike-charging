-- Additive migration. Existing equipment and historical orders are preserved.
ALTER TABLE charger ADD COLUMN row_name VARCHAR(30) NULL,
                    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE;
-- Existing row names stay unknown until an administrator supplies them.
-- The dedicated /api/bike/devices writer atomically creates A/B sockets.
