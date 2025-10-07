import { supabaseAdmin } from '../scripts/supabaseAdmin.js';

async function testSankiiConnection() {
  console.log('=== TESTING SANKII MOK DATA CONNECTION ===');
  
  const profileId = '4df5e33d-75d4-48cc-9f48-b06afc998f19';
  
  console.log('1. Testing tenant_info lookup...');
  const { data: tenantInfo, error: tenantError } = await supabaseAdmin
    .from('tenant_info')
    .select('*')
    .eq('profile_id', profileId)
    .single();
    
  if (tenantError) {
    console.log('❌ Error fetching tenant_info:', tenantError.message);
    return;
  }
  
  if (!tenantInfo) {
    console.log('❌ No tenant_info found for profile ID:', profileId);
    return;
  }
  
  console.log('✅ Tenant info found:');
  console.log('   Name:', tenantInfo.first_name, tenantInfo.last_name);
  console.log('   Email:', tenantInfo.email);
  console.log('   Balance:', tenantInfo.current_balance);
  console.log('   Status:', tenantInfo.tenant_status);
  console.log('');
  
  console.log('2. Testing lease lookup...');
  const { data: lease, error: leaseError } = await supabaseAdmin
    .from('leases')
    .select('*')
    .eq('tenant_info_id', tenantInfo.id)
    .eq('status', 'active')
    .single();
    
  if (leaseError) {
    console.log('❌ Error fetching lease:', leaseError.message);
    return;
  }
  
  if (!lease) {
    console.log('❌ No active lease found');
    return;
  }
  
  console.log('✅ Active lease found:');
  console.log('   Rent amount:', lease.rent_amount);
  console.log('   Status:', lease.status);
  console.log('   Unit ID:', lease.unit_id);
  console.log('');
  
  console.log('3. Testing unit lookup...');
  const { data: unit, error: unitError } = await supabaseAdmin
    .from('units')
    .select('*')
    .eq('id', lease.unit_id)
    .single();
    
  if (unitError) {
    console.log('❌ Error fetching unit:', unitError.message);
    return;
  }
  
  if (!unit) {
    console.log('❌ No unit found');
    return;
  }
  
  console.log('✅ Unit found:');
  console.log('   Unit number:', unit.unit_number);
  console.log('   Type:', unit.type);
  console.log('');
  
  console.log('🎉 DATA CONNECTION TEST COMPLETE');
  console.log('All data is properly connected for sankii Mok!');
  console.log('');
  console.log('SUMMARY:');
  console.log('- Profile ID:', profileId);
  console.log('- Tenant Name:', tenantInfo.first_name, tenantInfo.last_name);
  console.log('- Email:', tenantInfo.email);
  console.log('- Current Balance:', tenantInfo.current_balance);
  console.log('- Lease Rent:', lease.rent_amount);
  console.log('- Unit Number:', unit.unit_number);
  console.log('- All connections working: ✅');
}

testSankiiConnection().catch(console.error);

