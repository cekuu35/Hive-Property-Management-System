import { supabaseAdmin } from './supabaseAdmin.js';

async function testTenantDataStructure() {
  console.log('🧪 Testing Tenant Data Structure...\n');

  try {
    // Test the exact query structure used in useLandlordTenants
    console.log('📋 Testing tenant_info query:');
    const { data: tenantInfoData, error: tenantInfoError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        profile_id,
        tenant_status,
        current_balance,
        payment_status,
        rent_amount,
        security_deposit,
        lease_start_date,
        lease_end_date,
        emergency_contact_name,
        emergency_contact_phone,
        notes,
        created_at
      `)
      .limit(3);

    if (tenantInfoError) {
      console.error('❌ Error fetching tenant_info:', tenantInfoError);
      return;
    }

    console.log(`✅ Successfully fetched ${tenantInfoData?.length || 0} tenant_info records`);
    
    if (tenantInfoData && tenantInfoData.length > 0) {
      console.log('Sample tenant_info data:');
      const tenant = tenantInfoData[0];
      console.log(`   Name: ${tenant.first_name} ${tenant.last_name}`);
      console.log(`   Email: ${tenant.email}`);
      console.log(`   Status: ${tenant.tenant_status}`);
      console.log(`   Landlord ID: ${tenant.landlord_id || 'Not set'}`);
    }

    // Test leases query
    if (tenantInfoData && tenantInfoData.length > 0) {
      const tenantInfoIds = tenantInfoData.map(t => t.id);
      console.log('\n📋 Testing leases query:');
      
      const { data: leasesData, error: leasesError } = await supabaseAdmin
        .from('leases')
        .select(`
          id,
          tenant_info_id,
          unit_id,
          start_date,
          end_date,
          rent_amount,
          deposit_amount,
          status
        `)
        .in('tenant_info_id', tenantInfoIds)
        .limit(3);

      if (leasesError) {
        console.error('❌ Error fetching leases:', leasesError);
      } else {
        console.log(`✅ Successfully fetched ${leasesData?.length || 0} lease records`);
        if (leasesData && leasesData.length > 0) {
          console.log('Sample lease data:');
          const lease = leasesData[0];
          console.log(`   Tenant Info ID: ${lease.tenant_info_id}`);
          console.log(`   Unit ID: ${lease.unit_id}`);
          console.log(`   Rent: ${lease.rent_amount}`);
          console.log(`   Status: ${lease.status}`);
        }
      }
    }

    console.log('\n🎯 Expected Behavior:');
    console.log('1. Tenant management section should load without "failed to load tenants"');
    console.log('2. Existing tenant application workflow should be unaffected');
    console.log('3. All existing functionality should work as before');
    console.log('');
    console.log('🌐 Access your preview at: http://localhost:4178/');
    console.log('');
    console.log('✅ Data structure test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTenantDataStructure();



