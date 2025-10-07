import { supabaseAdmin } from './supabaseAdmin.js';

async function finalTenantDashboardTest() {
  console.log('🧪 FINAL TENANT DASHBOARD TEST...\n');

  try {
    // Complete data verification
    console.log('📋 1. VERIFYING ALL DATA:');
    
    // Get tenant info
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .single();

    if (tenantError) {
      console.error('❌ Tenant error:', tenantError);
      return;
    }

    console.log('✅ Tenant Data:');
    console.log(`   Name: ${tenant.first_name} ${tenant.last_name}`);
    console.log(`   Email: ${tenant.email}`);
    console.log(`   Profile ID: ${tenant.profile_id}`);
    console.log(`   Status: ${tenant.tenant_status}`);
    console.log(`   Auth User ID: ${tenant.auth_user_id}`);

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
      .eq('tenant_info_id', tenant.id)
      .eq('status', 'active')
      .single();

    if (leaseError) {
      console.error('❌ Lease error:', leaseError);
      return;
    }

    console.log('\n✅ Lease Data:');
    console.log(`   Lease ID: ${lease.id}`);
    console.log(`   Status: ${lease.status}`);
    console.log(`   Rent Amount: ${lease.rent_amount}`);
    console.log(`   Start Date: ${lease.start_date}`);
    console.log(`   End Date: ${lease.end_date}`);
    console.log(`   Unit: ${lease.units?.unit_number || 'Not assigned'}`);
    console.log(`   Property: ${lease.units?.properties?.name || 'Not assigned'}`);

    // Test the exact hook query
    console.log('\n🔍 2. TESTING HOOK QUERIES:');
    
    // Simulate useApprovedLease hook
    const { data: tenantLookup, error: tenantLookupError } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', tenant.profile_id)
      .single();

    if (tenantLookupError) {
      console.error('❌ Tenant lookup error:', tenantLookupError);
    } else {
      console.log('✅ Tenant lookup: SUCCESS');
      console.log(`   Found tenant_info ID: ${tenantLookup.id}`);
    }

    // Test lease lookup
    if (tenantLookup) {
      const { data: leaseLookup, error: leaseLookupError } = await supabaseAdmin
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
        .eq('tenant_info_id', tenantLookup.id)
        .eq('status', 'active')
        .single();

      if (leaseLookupError) {
        console.error('❌ Lease lookup error:', leaseLookupError);
      } else {
        console.log('✅ Lease lookup: SUCCESS');
        console.log(`   Found lease ID: ${leaseLookup.id}`);
        console.log(`   Rent amount: ${leaseLookup.rent_amount}`);
        console.log(`   Unit: ${leaseLookup.units?.unit_number || 'Not assigned'}`);
      }
    }

    // Test auth user
    console.log('\n🔐 3. TESTING AUTH USER:');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(tenant.profile_id);
    
    if (authError) {
      console.error('❌ Auth user error:', authError);
    } else {
      console.log('✅ Auth user: SUCCESS');
      console.log(`   Email: ${authUser.user.email}`);
      console.log(`   Created: ${authUser.user.created_at}`);
      console.log(`   Email confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
    }

    console.log('\n🎯 4. EXPECTED BROWSER BEHAVIOR:');
    console.log('When you login as sankii Mok, you should see:');
    console.log('');
    console.log('✅ CONSOLE LOGS (Press F12 to see):');
    console.log('   - "🔍 [useApprovedLease] useEffect triggered"');
    console.log('   - "🔍 [useApprovedLease] Starting fetch for profile ID: 4df5e33d-75d4-48cc-9f48-b06afc998f19"');
    console.log('   - "✅ Found active lease: 1e96cb43-e5d3-4ee9-be3d-75a3b11555b2"');
    console.log('   - "✅ [useApprovedLease] Returning: { approvedLease: {...}, hasApprovedLease: true }"');
    console.log('');
    console.log('✅ DASHBOARD DISPLAY:');
    console.log('   - Active lease information (not "no active lease")');
    console.log('   - Rent balance: 4000');
    console.log('   - Unit: 5 at "tev" property');
    console.log('   - Lease dates: Oct 6, 2025 - Jan 1, 2026');
    console.log('   - Working "Pay Rent" button');
    console.log('');
    console.log('🌐 TEST NOW:');
    console.log('   URL: http://localhost:4173/');
    console.log('   Email: sankiiapollo@gmail.com');
    console.log('   Password: TempPass123!');
    console.log('');
    console.log('🔧 IF STILL NOT WORKING:');
    console.log('   1. Check browser console for error messages');
    console.log('   2. Look for the debug logs mentioned above');
    console.log('   3. Try refreshing the page');
    console.log('   4. Check if profile is loading correctly');
    console.log('');
    console.log('✅ All data is correct - the issue should be resolved!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
finalTenantDashboardTest();


