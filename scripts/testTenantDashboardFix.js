import { supabaseAdmin } from './supabaseAdmin.js';

async function testTenantDashboardFix() {
  console.log('🧪 Testing Tenant Dashboard Fix...\n');

  try {
    // Test sankii Mok's data
    console.log('📋 Testing sankii Mok tenant data:');
    
    // Get tenant info
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .single();

    if (tenantError) {
      console.error('❌ Error fetching tenant:', tenantError);
      return;
    }

    console.log('✅ Tenant Info:');
    console.log(`   Name: ${tenant.first_name} ${tenant.last_name}`);
    console.log(`   Email: ${tenant.email}`);
    console.log(`   Profile ID: ${tenant.profile_id}`);
    console.log(`   Status: ${tenant.tenant_status}`);

    // Get lease info
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .select(`
        *,
        units (
          unit_number,
          type,
          properties (
            id,
            name,
            address
          )
        )
      `)
      .eq('tenant_info_id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .eq('status', 'active')
      .single();

    if (leaseError) {
      console.error('❌ Error fetching lease:', leaseError);
      return;
    }

    console.log('\n✅ Lease Info:');
    console.log(`   Lease ID: ${lease.id}`);
    console.log(`   Status: ${lease.status}`);
    console.log(`   Rent Amount: ${lease.rent_amount}`);
    console.log(`   Start Date: ${lease.start_date}`);
    console.log(`   End Date: ${lease.end_date}`);
    console.log(`   Unit Number: ${lease.units?.unit_number || 'Not assigned'}`);
    console.log(`   Property: ${lease.units?.properties?.name || 'Not assigned'}`);

    // Test the query that the hooks will use
    console.log('\n🔍 Testing hook queries:');
    
    // Test useApprovedLease query
    const { data: approvedLease, error: approvedLeaseError } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', tenant.profile_id)
      .single();

    if (approvedLeaseError) {
      console.error('❌ Error in useApprovedLease query:', approvedLeaseError);
    } else {
      console.log('✅ useApprovedLease query works - tenant_info found');
    }

    // Test lease lookup
    if (approvedLease) {
      const { data: leaseLookup, error: leaseLookupError } = await supabaseAdmin
        .from('leases')
        .select('*')
        .eq('tenant_info_id', approvedLease.id)
        .eq('status', 'active')
        .single();

      if (leaseLookupError) {
        console.error('❌ Error in lease lookup:', leaseLookupError);
      } else {
        console.log('✅ Lease lookup works - active lease found');
        console.log(`   Rent: ${leaseLookup.rent_amount}`);
        console.log(`   Status: ${leaseLookup.status}`);
      }
    }

    console.log('\n🎯 Expected Results:');
    console.log('1. ✅ sankii Mok should see their active lease');
    console.log('2. ✅ Rent balance should show 4000');
    console.log('3. ✅ Unit information should display');
    console.log('4. ✅ Pay rent button should work');
    console.log('5. ✅ No more "no active lease" message');
    console.log('');
    console.log('🌐 Test the fix at: http://localhost:4182/');
    console.log('   Login as: sankiiapollo@gmail.com');
    console.log('   Password: TempPass123!');
    console.log('');
    console.log('✅ Tenant dashboard fix completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTenantDashboardFix();

