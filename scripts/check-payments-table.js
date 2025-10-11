import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 CHECKING PAYMENTS TABLE STRUCTURE');
console.log('===================================\n');

async function checkPaymentsTable() {
  try {
    // Check if payments table exists
    console.log('1️⃣ CHECKING IF PAYMENTS TABLE EXISTS...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'payments');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    if (tables.length === 0) {
      console.log('❌ Payments table does not exist');
      console.log('📋 Need to run the migration to create it');
      return;
    }

    console.log('✅ Payments table exists');

    // Check table structure
    console.log('\n2️⃣ CHECKING PAYMENTS TABLE STRUCTURE...');
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'payments')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
      return;
    }

    console.log('📋 Payments table columns:');
    columns.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - Nullable: ${column.is_nullable}`);
    });

    // Check if property_id column exists
    const hasPropertyId = columns.some(col => col.column_name === 'property_id');
    console.log(`\n🔍 Has property_id column: ${hasPropertyId ? '✅ Yes' : '❌ No'}`);

    // Check if landlord_id column exists
    const hasLandlordId = columns.some(col => col.column_name === 'landlord_id');
    console.log(`🔍 Has landlord_id column: ${hasLandlordId ? '✅ Yes' : '❌ No'}`);

    // Check if tenant_id column exists
    const hasTenantId = columns.some(col => col.column_name === 'tenant_id');
    console.log(`🔍 Has tenant_id column: ${hasTenantId ? '✅ Yes' : '❌ No'}`);

    // Try to query the table with basic columns
    console.log('\n3️⃣ TESTING BASIC QUERY...');
    
    const { data: basicPayments, error: basicError } = await supabase
      .from('payments')
      .select('id, amount, reference, status, created_at')
      .limit(3);

    if (basicError) {
      console.error('❌ Error querying payments table:', basicError);
    } else {
      console.log(`✅ Basic query successful, found ${basicPayments.length} payments`);
      basicPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ID: ${payment.id}, Amount: ${payment.amount}, Status: ${payment.status}`);
      });
    }

    console.log('\n📋 SUMMARY:');
    console.log('===========');
    if (hasPropertyId && hasLandlordId && hasTenantId) {
      console.log('✅ All required columns exist');
    } else {
      console.log('❌ Missing required columns:');
      if (!hasPropertyId) console.log('   - property_id');
      if (!hasLandlordId) console.log('   - landlord_id');
      if (!hasTenantId) console.log('   - tenant_id');
      console.log('\n📋 Need to run the migration to add missing columns');
    }

  } catch (error) {
    console.error('❌ Error checking payments table:', error);
  }
}

checkPaymentsTable();
