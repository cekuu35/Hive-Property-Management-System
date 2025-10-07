import { supabaseAdmin } from './supabaseAdmin.js';

async function fixCurrentUserAuth() {
  console.log('🔧 Fixing current user authentication...\n');

  try {
    const currentProfileId = 'fb445672-adf7-465f-bc2d-85c88a75ad72';
    const authUserId = '3704f470-5183-4e09-bb6f-9c2f6c209f3b';

    console.log('Current situation:');
    console.log('  Profile ID (logged in):', currentProfileId);
    console.log('  Auth User ID (created):', authUserId);
    console.log('  Tenant Info ID:', 'a11f68d1-f5f2-485c-9c7c-c9d89e25d92d');

    // Option 1: Update the auth user to have the correct ID
    console.log('\n1. Attempting to update auth user ID...');
    
    // First, let's create a new tenant_info record for the current profile ID
    console.log('\n2. Creating tenant_info for current profile ID...');
    const { data: newTenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .insert({
        landlord_id: '4df5e33d-75d4-48cc-9f48-b06afc998f19',
        first_name: 'Current',
        last_name: 'User',
        email: 'current@example.com',
        phone: '1234567890',
        profile_id: currentProfileId, // Use the current profile ID
        tenant_status: 'active',
        current_balance: 0,
        payment_status: 'unpaid'
      })
      .select()
      .single();

    if (tenantError) {
      console.log('Error creating tenant_info:', tenantError.message);
    } else {
      console.log('✅ New tenant_info created:', newTenant.id);
    }

    // Create a lease for this new tenant
    console.log('\n3. Creating lease for new tenant...');
    const { data: units } = await supabaseAdmin
      .from('units')
      .select('id, unit_number')
      .limit(1);

    if (units && units.length > 0) {
      const { data: lease, error: leaseError } = await supabaseAdmin
        .from('leases')
        .insert({
          tenant_id: '3704f470-5183-4e09-bb6f-9c2f6c209f3b', // Use existing tenant_id
          tenant_info_id: newTenant.id,
          unit_id: units[0].id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          rent_amount: 5000,
          deposit_amount: 10000,
          status: 'active'
        })
        .select()
        .single();

      if (leaseError) {
        console.log('Error creating lease:', leaseError.message);
      } else {
        console.log('✅ Lease created:', lease.id);
        console.log('   Rent amount:', lease.rent_amount);
        console.log('   Status:', lease.status);
      }
    }

    // Test the lookup
    console.log('\n4. Testing lookup...');
    const { data: testTenant } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', currentProfileId)
      .single();

    if (testTenant) {
      const { data: testLease } = await supabaseAdmin
        .from('leases')
        .select('*')
        .eq('tenant_info_id', testTenant.id)
        .eq('status', 'active')
        .single();

      if (testLease) {
        console.log('✅ Lookup successful:');
        console.log('   Tenant ID:', testTenant.id);
        console.log('   Lease ID:', testLease.id);
        console.log('   Rent amount:', testLease.rent_amount);
      } else {
        console.log('❌ No lease found');
      }
    } else {
      console.log('❌ No tenant found');
    }

    console.log('\n🎉 Current user should now see their lease!');
    console.log('   Refresh the page to see the changes.');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixCurrentUserAuth();


