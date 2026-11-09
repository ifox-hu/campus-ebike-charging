CREATE TABLE repair_ticket (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    owner_username VARCHAR(50) NOT NULL,
    station_id BIGINT NOT NULL,
    charger_id BIGINT NOT NULL,
    connector_id BIGINT NULL,
    station_name VARCHAR(255) NOT NULL,
    device_code VARCHAR(255) NOT NULL,
    socket_code VARCHAR(255) NULL,
    description VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL,
    resolution VARCHAR(500) NULL,
    handler_username VARCHAR(50) NULL,
    request_key VARCHAR(64) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_repair_request UNIQUE (owner_username,request_key)
);
CREATE INDEX idx_repair_owner ON repair_ticket (owner_username,id);
CREATE INDEX idx_repair_status ON repair_ticket (status,id);
-- Forward-only expansion: keep tickets when rolling application binaries back.
