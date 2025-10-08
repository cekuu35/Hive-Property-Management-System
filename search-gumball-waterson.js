import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchGumballWaterson() {
  console.log('🔍 Searching for Gumball Waterson...\n');

  try {
    // Search in profiles table
    console.log('1. Searching in profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .or('first_name.ilike.%gumball%,last_name.ilike.%waterson%');

    if (profilesError) {
      console.error('❌ Error searching profiles:', profilesError);
    } else {
      console.log('📋 Profiles found:', profiles?.length || 0);
      profiles?.forEach(profile => {
        console.log(`   - ${profile.first_name} ${profile.last_name} (ID: ${profile.id}, User ID: ${profile.user_id})`);
      });
    }

    // Search in tenant_info table
    console.log('\n2. Searching in tenant_info table...');
    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from('tenant_info')
      .select('*')
      .or('first_name.ilike.%gumball%,last_name.ilike.%waterson%');

    if (tenantInfoError) {
      console.error('❌ Error searching tenant_info:', tenantInfoError);
    } else {
      console.log('📋 Tenant info found:', tenantInfo?.length || 0);
      tenantInfo?.forEach(tenant => {
        console.log(`   - ${tenant.first_name} ${tenant.last_name} (ID: ${tenant.id}, Email: ${tenant.email}, Profile ID: ${tenant.profile_id})`);
      });
    }

    // Search in unit_applications table
    console.log('\n3. Searching in unit_applications table...');
    const { data: applications, error: applicationsError } = await supabase
      .from('unit_applications')
      .select(`
        *,
        profiles!unit_applications_tenant_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .or('profiles.first_name.ilike.%gumball%,profiles.last_name.ilike.%waterson%');

    if (applicationsError) {
      console.error('❌ Error searching applications:', applicationsError);
    } else {
      console.log('📋 Applications found:', applications?.length || 0);
      applications?.forEach(app => {
        console.log(`   - ${app.profiles?.first_name} ${app.profiles?.last_name} (Status: ${app.status}, Created: ${app.created_at})`);
      });
    }

    // Search in leases table
    console.log('\n4. Searching in leases table...');
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
      .or('tenant_info.first_name.ilike.%gumball%,tenant_info.last_name.ilike.%waterson%');

    if (leasesError) {
      console.error('❌ Error searching leases:', leasesError);
    } else {
      console.log('📋 Leases found:', leases?.length || 0);
      leases?.forEach(lease => {
        console.log(`   - ${lease.tenant_info?.first_name} ${lease.tenant_info?.last_name} (Status: ${lease.status}, Start: ${lease.lease_start})`);
      });
    }

    // Search for any name containing "gumball" or "waterson"
    console.log('\n5. Broad search for any name containing "gumball" or "waterson"...');
    const { data: broadSearch, error: broadError } = await supabase
      .from('profiles')
      .select('*')
      .or('first_name.ilike.%gumball%,last_name.ilike.%waterson%,first_name.ilike.%waterson%,last_name.ilike.%gumball%');

    if (broadError) {
      console.error('❌ Error in broad search:', broadError);
    } else {
      console.log('📋 Broad search results:', broadSearch?.length || 0);
      broadSearch?.forEach(profile => {
        console.log(`   - ${profile.first_name} ${profile.last_name} (ID: ${profile.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

searchGumballWaterson();
