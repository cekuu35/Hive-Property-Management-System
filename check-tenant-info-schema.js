import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenantInfoSchema() {
  console.log('🔍 Checking tenant_info table schema...\n');

  try {
    // Get a sample tenant_info record to see the actual schema
    const { data: sampleTenant, error: sampleError } = await supabase
      .from('tenant_info')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.error('❌ Error fetching sample tenant:', sampleError);
    } else {
      console.log('📋 Sample tenant_info record:');
      console.log(JSON.stringify(sampleTenant, null, 2));
    }

    // Try to get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('tenant_info')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('❌ Error getting table info:', tableError);
    } else {
      console.log('\n📋 Table structure available');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTenantInfoSchema();




