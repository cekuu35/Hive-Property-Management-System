import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testClientQuery() {
  console.log('=== TESTING CLIENT-SIDE QUERY ===');
  
  const profileId = '4df5e33d-75d4-48cc-9f48-b06afc998f19';
  
  console.log('Testing tenant_info query with profile_id:', profileId);
  
  const { data: tenantInfo, error: tenantError } = await supabase
    .from('tenant_info')
    .select('*')
    .eq('profile_id', profileId);
    
  console.log('Query result:');
  console.log('  Data length:', tenantInfo ? tenantInfo.length : 0);
  console.log('  Error:', tenantError ? tenantError.message : 'None');
  console.log('  Error code:', tenantError ? tenantError.code : 'None');
  
  if (tenantInfo && tenantInfo.length > 0) {
    console.log('  First record:', tenantInfo[0].first_name, tenantInfo[0].last_name);
  }
  
  console.log('');
  console.log('Testing with .single()...');
  
  const { data: singleTenant, error: singleError } = await supabase
    .from('tenant_info')
    .select('*')
    .eq('profile_id', profileId)
    .single();
    
  console.log('Single query result:');
  console.log('  Data:', singleTenant ? 'Found' : 'Not found');
  console.log('  Error:', singleError ? singleError.message : 'None');
  console.log('  Error code:', singleError ? singleError.code : 'None');
}

testClientQuery().catch(console.error);

