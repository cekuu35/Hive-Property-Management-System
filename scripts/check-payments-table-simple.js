import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 CHECKING PAYMENTS TABLE STRUCTURE');
console.log('===================================\n');

async function checkPaymentsTable() {
  try {
    // Try to query the payments table with different column combinations
    console.log('1️⃣ TESTING PAYMENTS TABLE QUERY...');
    
    // Test 1: Try with all columns we expect
    console.log('🔍 Testing with all expected columns...');
    const { data: allColumns, error: allError } = await supabase
      .from('payments')
      .select('id, tenant_id, landlord_id, property_id, amount, reference, status, created_at')
      .limit(1);

    if (allError) {
      console.log('❌ Error with all columns:', allError.message);
    } else {
      console.log('✅ All columns exist and query successful');
      return;
    }

    // Test 2: Try with basic columns only
    console.log('\n🔍 Testing with basic columns...');
    const { data: basicColumns, error: basicError } = await supabase
      .from('payments')
      .select('id, amount, reference, status, created_at')
      .limit(1);

    if (basicError) {
      console.log('❌ Error with basic columns:', basicError.message);
    } else {
      console.log('✅ Basic columns exist');
    }

    // Test 3: Try with individual columns
    console.log('\n🔍 Testing individual columns...');
    
    const columnsToTest = [
      'tenant_id',
      'landlord_id', 
      'property_id',
      'lease_id',
      'subaccount_code',
      'payment_method'
    ];

    for (const column of columnsToTest) {
      const { data, error } = await supabase
        .from('payments')
        .select(column)
        .limit(1);

      if (error) {
        console.log(`❌ Column '${column}' does not exist: ${error.message}`);
      } else {
        console.log(`✅ Column '${column}' exists`);
      }
    }

    // Test 4: Check what columns actually exist by trying to select *
    console.log('\n🔍 Testing with SELECT *...');
    const { data: allData, error: allDataError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);

    if (allDataError) {
      console.log('❌ Error with SELECT *:', allDataError.message);
    } else {
      console.log('✅ SELECT * successful');
      if (allData.length > 0) {
        console.log('📋 Available columns:', Object.keys(allData[0]));
      }
    }

    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log('The payments table exists but may be missing some expected columns.');
    console.log('This suggests the migration may not have run yet or there was an issue.');

  } catch (error) {
    console.error('❌ Error checking payments table:', error);
  }
}

checkPaymentsTable();
