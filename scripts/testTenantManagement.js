import { supabaseAdmin } from './supabaseAdmin.js';

async function testTenantManagement() {
  console.log('🧪 Testing Tenant Management Section...\n');

  try {
    // Check if we have tenants in the system
    console.log('📋 Checking Tenant Data:');
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        *,
        units (
          unit_number,
          type,
          properties (
            name,
            address
          )
        )
      `)
      .limit(5);

    if (tenantError) {
      console.error('❌ Error fetching tenants:', tenantError);
      return;
    }

    if (tenants && tenants.length > 0) {
      console.log(`✅ Found ${tenants.length} tenants:`);
      tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.first_name} ${tenant.last_name}`);
        console.log(`      Email: ${tenant.email}`);
        console.log(`      Status: ${tenant.tenant_status}`);
        console.log(`      Unit: ${tenant.units?.unit_number || 'Not assigned'}`);
        console.log(`      Property: ${tenant.units?.properties?.name || 'Not assigned'}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No tenants found in the system');
    }

    // Check if we have landlords
    console.log('🏢 Checking Landlord Data:');
    const { data: landlords, error: landlordError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'landlord')
      .limit(3);

    if (landlordError) {
      console.error('❌ Error fetching landlords:', landlordError);
    } else if (landlords && landlords.length > 0) {
      console.log(`✅ Found ${landlords.length} landlords:`);
      landlords.forEach((landlord, index) => {
        console.log(`   ${index + 1}. ${landlord.first_name} ${landlord.last_name}`);
        console.log(`      Email: ${landlord.email || 'Not set'}`);
        console.log(`      ID: ${landlord.id}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No landlords found in the system');
    }

    console.log('🎯 Expected Behavior:');
    console.log('1. Login as a landlord');
    console.log('2. Go to the dashboard');
    console.log('3. Click on "Tenants" in the sidebar');
    console.log('4. You should see the Tenant Management section with:');
    console.log('   - Add Tenant button');
    console.log('   - Tenant statistics cards');
    console.log('   - Tenant directory table');
    console.log('   - View Details, View Credentials, Edit, Delete buttons');
    console.log('');
    console.log('🌐 Access your preview at: http://localhost:4175/');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTenantManagement();



