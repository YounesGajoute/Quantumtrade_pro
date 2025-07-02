-- Create cache_data table in TimescaleDB
CREATE TABLE IF NOT EXISTS cache_data (
    key VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create hypertable for time-series data
SELECT create_hypertable('cache_data', 'created_at', if_not_exists => TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_data_expires ON cache_data (expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_data_created ON cache_data (created_at);

-- Create function for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM cache_data WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cleanup (runs every hour)
SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache();'); 