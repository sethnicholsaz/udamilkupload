-- Fix duplicate issue by updating the unique constraint

-- Drop the existing constraint that includes extract_date
ALTER TABLE uda_production_records DROP CONSTRAINT IF EXISTS uda_production_records_pickup_id_extract_date_key;

-- Add a better unique constraint based on pickup_id only (since pickup_id should be unique per pickup)
ALTER TABLE uda_production_records ADD CONSTRAINT uda_production_records_pickup_id_key UNIQUE (pickup_id);

-- Clean up existing duplicates (keep the most recent extract_date for each pickup_id)
DELETE FROM uda_production_records 
WHERE id NOT IN (
    SELECT DISTINCT ON (pickup_id) id
    FROM uda_production_records
    ORDER BY pickup_id, extract_date DESC
);