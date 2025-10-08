import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGumballTenant() {
  console.log('🔧 Creating tenant record for Gumball Waterson...\n');

  const gumballProfileId = 'd5496c64-5406-4429-a8b9-bbf74e0a406b';
  const gumballUserId = '7ca2f270-2a7a-4125-8b1c-c1f820cfae5a';

  try {
    // First, get the approved application details
    console.log('1. Getting approved application details...');
    const { data: application, error: appError } = await supabase
      .from('unit_applications')
      .select(`
        *,
        units (
          unit_number,
          type,
          rent_amount,
          deposit_amount,
          property_id,
          properties (
            name,
            address,
            landlord_id
          )
        )
      `)
      .eq('tenant_id', gumballProfileId)
      .eq('status', 'approved')
      .single();

    if (appError) {
      console.error('❌ Error fetching application:', appError);
      return;
    }

    console.log('📋 Application details:');
    console.log(`   - Property: ${application.units?.properties?.name}`);
    console.log(`   - Unit: ${application.units?.unit_number}`);
    console.log(`   - Rent: ${application.units?.rent_amount}`);
    console.log(`   - Deposit: ${application.units?.deposit_amount}`);
    console.log(`   - Move-in Date: ${application.preferred_move_in_date}`);

    // Get Gumball's profile details
    console.log('\n2. Getting profile details...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', gumballProfileId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }

    console.log('📋 Profile details:');
    console.log(`   - Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`   - Email: ${profile.email || 'No email'}`);
    console.log(`   - Phone: ${profile.phone || 'No phone'}`);

    // Create tenant_info record
    console.log('\n3. Creating tenant_info record...');
    const tenantInfoData = {
      profile_id: gumballProfileId,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email || `gumball.waterson@example.com`,
      phone: profile.phone || null,
      unit_id: application.unit_id,
      property_id: application.units?.property_id,
      landlord_id: application.units?.properties?.landlord_id,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      emergency_contact_relationship: null,
      employment_status: 'employed',
      employer_name: null,
      monthly_income: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from('tenant_info')
      .insert(tenantInfoData)
      .select()
      .single();

    if (tenantInfoError) {
      console.error('❌ Error creating tenant_info:', tenantInfoError);
      return;
    }

    console.log('✅ Tenant info created successfully!');
    console.log(`   - Tenant Info ID: ${tenantInfo.id}`);

    // Create lease record
    console.log('\n4. Creating lease record...');
    const leaseStartDate = application.preferred_move_in_date || new Date().toISOString().split('T')[0];
    const leaseEndDate = new Date(new Date(leaseStartDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const leaseData = {
      tenant_id: gumballProfileId,
      tenant_info_id: tenantInfo.id,
      unit_id: application.unit_id,
      property_id: application.units?.property_id,
      landlord_id: application.units?.properties?.landlord_id,
      lease_start: leaseStartDate,
      lease_end: leaseEndDate,
      rent_amount: application.units?.rent_amount || 0,
      deposit_amount: application.units?.deposit_amount || 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert(leaseData)
      .select()
      .single();

    if (leaseError) {
      console.error('❌ Error creating lease:', leaseError);
      return;
    }

    console.log('✅ Lease created successfully!');
    console.log(`   - Lease ID: ${lease.id}`);
    console.log(`   - Start Date: ${lease.lease_start}`);
    console.log(`   - End Date: ${lease.lease_end}`);
    console.log(`   - Rent: $${lease.rent_amount}`);
    console.log(`   - Deposit: $${lease.deposit_amount}`);

    console.log('\n🎉 Gumball Waterson is now a tenant! He should appear in the tenants list.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createGumballTenant();




