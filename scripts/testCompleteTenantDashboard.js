import { supabaseAdmin } from './supabaseAdmin.js';

async function testCompleteTenantDashboard() {
  console.log('🧪 Testing Complete Tenant Dashboard...\n');

  try {
    // Test sankii Mok's complete data flow
    console.log('📋 Testing sankii Mok data flow:');
    
    // 1. Get tenant info
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .single();

    if (tenantError) {
      console.error('❌ Error fetching tenant:', tenantError);
      return;
    }

    console.log('✅ 1. Tenant Info:');
    console.log(`   Name: ${tenant.first_name} ${tenant.last_name}`);
    console.log(`   Email: ${tenant.email}`);
    console.log(`   Profile ID: ${tenant.profile_id}`);
    console.log(`   Status: ${tenant.tenant_status}`);

    // 2. Get lease info
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
      console.error('❌ Error fetching lease:', leaseError);
      return;
    }

    console.log('\n✅ 2. Lease Info:');
    console.log(`   Lease ID: ${lease.id}`);
    console.log(`   Status: ${lease.status}`);
    console.log(`   Rent Amount: ${lease.rent_amount}`);
    console.log(`   Start Date: ${lease.start_date}`);
    console.log(`   End Date: ${lease.end_date}`);
    console.log(`   Unit: ${lease.units?.unit_number || 'Not assigned'}`);
    console.log(`   Property: ${lease.units?.properties?.name || 'Not assigned'}`);

    // 3. Test the exact query that useApprovedLease will use
    console.log('\n🔍 3. Testing useApprovedLease query:');
    
    // Simulate the hook's query
    const { data: tenantLookup, error: tenantLookupError } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', tenant.profile_id)
      .single();

    if (tenantLookupError) {
      console.error('❌ Error in tenant lookup:', tenantLookupError);
    } else {
      console.log('✅ Tenant lookup by profile_id: SUCCESS');
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
        console.error('❌ Error in lease lookup:', leaseLookupError);
      } else {
        console.log('✅ Lease lookup by tenant_info_id: SUCCESS');
        console.log(`   Found lease ID: ${leaseLookup.id}`);
        console.log(`   Rent amount: ${leaseLookup.rent_amount}`);
        console.log(`   Unit: ${leaseLookup.units?.unit_number || 'Not assigned'}`);
      }
    }

    // 4. Test auth user
    console.log('\n🔐 4. Testing auth user:');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(tenant.profile_id);
    
    if (authError) {
      console.error('❌ Error fetching auth user:', authError);
    } else {
      console.log('✅ Auth user: SUCCESS');
      console.log(`   Email: ${authUser.user.email}`);
      console.log(`   Created: ${authUser.user.created_at}`);
      console.log(`   Email confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
    }

    console.log('\n🎯 Expected Results in Browser:');
    console.log('1. ✅ Login should work with sankiiapollo@gmail.com / TempPass123!');
    console.log('2. ✅ Tenant dashboard should show active lease');
    console.log('3. ✅ Rent balance should display 4000');
    console.log('4. ✅ Unit information should show Unit 5 at "tev" property');
    console.log('5. ✅ Pay rent button should work with correct amount');
    console.log('6. ✅ No "no active lease" message');
    console.log('');
    console.log('🌐 Test URL: http://localhost:4173/');
    console.log('   Login: sankiiapollo@gmail.com');
    console.log('   Password: TempPass123!');
    console.log('');
    console.log('🔍 Check browser console for debug logs:');
    console.log('   - Look for "🔍 [useApprovedLease]" messages');
    console.log('   - Should see "✅ Found active lease" message');
    console.log('   - Should see lease details with rent amount 4000');
    console.log('');
    console.log('✅ Complete tenant dashboard test finished!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteTenantDashboard();

