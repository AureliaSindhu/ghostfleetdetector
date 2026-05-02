CREATE INDEX idx_ais_records_mmsi ON ais_records(mmsi);
CREATE INDEX idx_ais_records_timestamp ON ais_records(timestamp);
CREATE INDEX idx_ais_records_batch ON ais_records(upload_batch_id);
CREATE INDEX idx_ais_records_user ON ais_records(user_id);
CREATE INDEX idx_ais_records_mmsi_timestamp ON ais_records(mmsi, timestamp);

CREATE INDEX idx_dark_periods_mmsi ON dark_periods(mmsi);
CREATE INDEX idx_dark_periods_score ON dark_periods(suspicion_score DESC);
CREATE INDEX idx_dark_periods_risk ON dark_periods(risk_level);
CREATE INDEX idx_dark_periods_user ON dark_periods(user_id);
CREATE INDEX idx_dark_periods_batch ON dark_periods(upload_batch_id);

CREATE INDEX idx_upload_batches_user ON upload_batches(user_id);
CREATE INDEX idx_upload_batches_status ON upload_batches(status);
