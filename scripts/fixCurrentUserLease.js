import { supabaseAdmin } from './supabaseAdmin.js';

async function fixCurrentUserLease() {
  console.log('🔧 Fixing lease for current user...\n');

  try {
    const profileId = 'fb445672-adf7-465f-bc2d-85c88a75ad72';
    const tenantInfoId = 'a11f68d1-f5f2-485c-9c7c-c9d89e25d92d';

    // Get a unit
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('units')
      .select('id, unit_number')
      .limit(1);

    if (unitsError || !units || units.length === 0) {
      console.error('❌ No units found:', unitsError);
      return;
    }

    console.log('✅ Found unit:', units[0].unit_number);

    // Get an existing tenant_id from tenant_info table
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .limit(1);

    if (tenantsError || !tenants || tenants.length === 0) {
      console.error('❌ No tenant_info found:', tenantsError);
      return;
    }

    const existingTenantId = tenants[0].id;
    console.log('✅ Using existing tenant_id:', existingTenantId);

    // Create lease
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .insert({
        tenant_id: existingTenantId,
        tenant_info_id: tenantInfoId,
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
      console.error('❌ Error creating lease:', leaseError);
      return;
    }

    console.log('✅ Lease created successfully!');
    console.log('   Lease ID:', lease.id);
    console.log('   Rent amount:', lease.rent_amount);
    console.log('   Status:', lease.status);
    console.log('   Unit:', units[0].unit_number);

    // Verify the data
    console.log('\n🔍 Verifying data...');
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (tenantError) {
      console.error('❌ Error fetching tenant:', tenantError);
    } else {
      console.log('✅ Tenant verified:');
      console.log('   Name:', tenant.first_name, tenant.last_name);
      console.log('   Email:', tenant.email);
      console.log('   Status:', tenant.tenant_status);
    }

    const { data: leaseCheck, error: leaseCheckError } = await supabaseAdmin
      .from('leases')
      .select('*')
      .eq('tenant_info_id', tenantInfoId)
      .eq('status', 'active')
      .single();

    if (leaseCheckError) {
      console.error('❌ Error fetching lease:', leaseCheckError);
    } else {
      console.log('✅ Lease verified:');
      console.log('   ID:', leaseCheck.id);
      console.log('   Rent amount:', leaseCheck.rent_amount);
      console.log('   Status:', leaseCheck.status);
    }

    console.log('\n🎉 Current user should now see active lease!');
    console.log('   Refresh the page to see the changes.');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixCurrentUserLease();
