import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGumballApplications() {
  console.log('🔍 Checking Gumball Waterson applications and tenant records...\n');

  const gumballProfileId = 'd5496c64-5406-4429-a8b9-bbf74e0a406b';

  try {
    // Check applications for Gumball
    console.log('1. Checking unit_applications for Gumball...');
    const { data: applications, error: applicationsError } = await supabase
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
      .eq('tenant_id', gumballProfileId);

    if (applicationsError) {
      console.error('❌ Error searching applications:', applicationsError);
    } else {
      console.log('📋 Applications found:', applications?.length || 0);
      applications?.forEach((app, index) => {
        console.log(`   ${index + 1}. Status: ${app.status}`);
        console.log(`      Property: ${app.units?.properties?.name}`);
        console.log(`      Unit: ${app.units?.unit_number}`);
        console.log(`      Created: ${app.created_at}`);
        console.log(`      Deposit Paid: ${app.deposit_paid}`);
        console.log(`      Reviewed At: ${app.reviewed_at}`);
        console.log(`      Reviewed By: ${app.reviewed_by}`);
        console.log('');
      });
    }

    // Check if there's any tenant_info for Gumball
    console.log('2. Checking tenant_info for Gumball...');
    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from('tenant_info')
      .select('*')
      .eq('profile_id', gumballProfileId);

    if (tenantInfoError) {
      console.error('❌ Error searching tenant_info:', tenantInfoError);
    } else {
      console.log('📋 Tenant info found:', tenantInfo?.length || 0);
      tenantInfo?.forEach(tenant => {
        console.log(`   - ${tenant.first_name} ${tenant.last_name} (ID: ${tenant.id}, Email: ${tenant.email})`);
      });
    }

    // Check leases for Gumball
    console.log('\n3. Checking leases for Gumball...');
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        *,
        tenant_info (
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', gumballProfileId);

    if (leasesError) {
      console.error('❌ Error searching leases:', leasesError);
    } else {
      console.log('📋 Leases found:', leases?.length || 0);
      leases?.forEach(lease => {
        console.log(`   - Status: ${lease.status}, Start: ${lease.lease_start}, End: ${lease.lease_end}`);
      });
    }

    // Check Gumball's profile details
    console.log('\n4. Gumball profile details...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', gumballProfileId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else {
      console.log('📋 Profile details:');
      console.log(`   - Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`   - Email: ${profile.email}`);
      console.log(`   - Phone: ${profile.phone}`);
      console.log(`   - Role: ${profile.role}`);
      console.log(`   - User ID: ${profile.user_id}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkGumballApplications();




