require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🔍 Testing Supabase connection...');
  console.log('📍 Supabase URL:', supabaseUrl);
  
  try {
    // Check uda_data_extracts table
    console.log('\n📊 Checking uda_data_extracts table...');
    const { data: extracts, error: extractsError } = await supabase
      .from('uda_data_extracts')
      .select('*')
      .order('extract_date', { ascending: false })
      .limit(5);
    
    if (extractsError) {
      console.error('❌ Error accessing uda_data_extracts:', extractsError);
    } else {
      console.log(`✅ Found ${extracts.length} extract records`);
      if (extracts.length > 0) {
        console.log('Latest extract:', {
          id: extracts[0].id,
          extract_date: extracts[0].extract_date,
          record_count: extracts[0].record_count
        });
      }
    }

    // Check uda_production_records table
    console.log('\n📊 Checking uda_production_records table...');
    const { data: records, error: recordsError, count } = await supabase
      .from('uda_production_records')
      .select('*', { count: 'exact' })
      .order('pickup_date', { ascending: false })
      .limit(5);
    
    if (recordsError) {
      console.error('❌ Error accessing uda_production_records:', recordsError);
    } else {
      console.log(`✅ Found ${count} production records in database`);
      if (records && records.length > 0) {
        console.log('Latest records:');
        records.forEach((record, i) => {
          console.log(`  ${i + 1}. ID: ${record.pickup_id}, Date: ${record.pickup_date}, Amount: ${record.pickup_amount}`);
        });
      } else {
        console.log('⚠️ No production records found in database');
      }
    }

    // Test insert a single record
    console.log('\n🧪 Testing single record insert...');
    const testRecord = {
      extract_date: new Date().toISOString(),
      producer_id: "60cce07b8ada14e90f0783b7",
      pickup_id: "test-" + Date.now(),
      pickup_date: new Date().toISOString(),
      tank_number: "TEST",
      pickup_amount: 1000,
      temperature: 38.5,
      route_name: "TEST",
      driver_name: "Test Driver",
      hauling_company: "Test Company",
      sample_barcodes: ["TEST1", "TEST2"]
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('uda_production_records')
      .insert(testRecord)
      .select();

    if (insertError) {
      console.error('❌ Test insert failed:', insertError);
    } else {
      console.log('✅ Test insert successful:', insertResult[0].id);
      
      // Clean up test record
      await supabase
        .from('uda_production_records')
        .delete()
        .eq('pickup_id', testRecord.pickup_id);
      console.log('🧹 Test record cleaned up');
    }

  } catch (error) {
    console.error('❌ Supabase test error:', error.message);
  }
}

testSupabase();