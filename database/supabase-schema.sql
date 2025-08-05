-- Create tables for UDA MilkMoovement data

-- Main data extracts table (stores complete API responses)
CREATE TABLE IF NOT EXISTS uda_data_extracts (
    id BIGSERIAL PRIMARY KEY,
    extract_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    producer_id TEXT NOT NULL,
    company_id UUID NOT NULL,
    raw_data JSONB NOT NULL,
    record_count INTEGER,
    current_period_total_production NUMERIC,
    prev_period_total_production NUMERIC,
    daily_percent_change NUMERIC,
    weekly_percent_change NUMERIC,
    monthly_percent_change NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual production records table (normalized for easier querying)
CREATE TABLE IF NOT EXISTS uda_production_records (
    id BIGSERIAL PRIMARY KEY,
    extract_date TIMESTAMPTZ NOT NULL,
    producer_id TEXT NOT NULL,
    company_id UUID NOT NULL,
    pickup_id TEXT NOT NULL,
    pickup_date TIMESTAMPTZ NOT NULL,
    tank_number TEXT,
    pickup_amount NUMERIC,
    temperature NUMERIC,
    route_name TEXT,
    driver_name TEXT,
    hauling_company TEXT,
    fat NUMERIC,
    protein NUMERIC,
    lactose NUMERIC,
    solids_not_fat NUMERIC,
    somatic_cell_count INTEGER,
    milk_urea_nitrogen NUMERIC,
    freeze_point NUMERIC,
    sample_barcodes TEXT[],
    lab_id TEXT,
    route_session_bol TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(pickup_id, extract_date)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uda_extracts_date ON uda_data_extracts(extract_date);
CREATE INDEX IF NOT EXISTS idx_uda_extracts_producer ON uda_data_extracts(producer_id);
CREATE INDEX IF NOT EXISTS idx_uda_extracts_company ON uda_data_extracts(company_id);
CREATE INDEX IF NOT EXISTS idx_uda_extracts_date_range ON uda_data_extracts(date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_uda_records_pickup_date ON uda_production_records(pickup_date);
CREATE INDEX IF NOT EXISTS idx_uda_records_producer ON uda_production_records(producer_id);
CREATE INDEX IF NOT EXISTS idx_uda_records_company ON uda_production_records(company_id);
CREATE INDEX IF NOT EXISTS idx_uda_records_tank ON uda_production_records(tank_number);
CREATE INDEX IF NOT EXISTS idx_uda_records_extract_date ON uda_production_records(extract_date);

-- Enable Row Level Security (RLS)
ALTER TABLE uda_data_extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uda_production_records ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your security needs)
-- Example: Allow all operations for authenticated users
CREATE POLICY "Allow full access for authenticated users" ON uda_data_extracts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow full access for authenticated users" ON uda_production_records
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_uda_data_extracts_updated_at
    BEFORE UPDATE ON uda_data_extracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();