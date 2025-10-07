import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugAuthState() {
  console.log('=== DEBUGGING AUTH STATE ===');
  
  // Check current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.log('❌ Session error:', sessionError.message);
    return;
  }
  
  if (!session) {
    console.log('❌ No active session found');
    console.log('User needs to login first');
    return;
  }
  
  console.log('✅ Active session found:');
  console.log('  User ID:', session.user.id);
  console.log('  Email:', session.user.email);
  console.log('  Created:', session.user.created_at);
  console.log('');
  
  // Test tenant_info lookup with the actual user ID
  console.log('Testing tenant_info lookup with actual user ID...');
  const { data: tenantInfo, error: tenantError } = await supabase
    .from('tenant_info')
    .select('*')
    .eq('profile_id', session.user.id);
    
  if (tenantError) {
    console.log('❌ Error fetching tenant_info:', tenantError.message);
    return;
  }
  
  if (!tenantInfo || tenantInfo.length === 0) {
    console.log('❌ No tenant_info found for user ID:', session.user.id);
    console.log('This explains why the portal shows no data!');
    return;
  }
  
  console.log('✅ Tenant info found:');
  console.log('  Name:', tenantInfo[0].first_name, tenantInfo[0].last_name);
  console.log('  Email:', tenantInfo[0].email);
  console.log('  Balance:', tenantInfo[0].current_balance);
  console.log('  Status:', tenantInfo[0].tenant_status);
  
  // Test lease lookup
  console.log('');
  console.log('Testing lease lookup...');
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_info_id', tenantInfo[0].id)
    .eq('status', 'active');
    
  if (leaseError) {
    console.log('❌ Error fetching lease:', leaseError.message);
    return;
  }
  
  if (!lease || lease.length === 0) {
    console.log('❌ No active lease found');
    return;
  }
  
  console.log('✅ Active lease found:');
  console.log('  Rent amount:', lease[0].rent_amount);
  console.log('  Status:', lease[0].status);
  console.log('  Unit ID:', lease[0].unit_id);
  
  console.log('');
  console.log('🎉 All data is accessible! The portal should work.');
}

debugAuthState().catch(console.error);

