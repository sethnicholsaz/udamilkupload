-- Fix Supabase RLS policies for the scraper

-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON uda_data_extracts;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON uda_production_records;

-- Create more permissive policies for service role/anon access
-- Option 1: Allow all operations for service role and anon (recommended for automated scraper)
CREATE POLICY "Allow all operations for service" ON uda_data_extracts
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for service" ON uda_production_records
    FOR ALL USING (true);

-- Alternative Option 2: If you want to be more restrictive, uncomment these instead:
-- CREATE POLICY "Allow insert for anon" ON uda_data_extracts
--     FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Allow select for anon" ON uda_data_extracts
--     FOR SELECT USING (true);
-- 
-- CREATE POLICY "Allow insert for anon" ON uda_production_records
--     FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Allow select for anon" ON uda_production_records
--     FOR SELECT USING (true);