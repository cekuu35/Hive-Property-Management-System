import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGumballLeases() {
  console.log('🔍 Checking Gumball Waterson leases...\n');

  const gumballProfileId = 'd5496c64-5406-4429-a8b9-bbf74e0a406b';

  try {
    // Check leases for Gumball using the correct relationship
    console.log('1. Checking leases for Gumball...');
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        *,
        tenant_info!leases_tenant_id_fkey (
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
      leases?.forEach((lease, index) => {
        console.log(`   ${index + 1}. Status: ${lease.status}`);
        console.log(`      Start: ${lease.lease_start}`);
        console.log(`      End: ${lease.lease_end}`);
        console.log(`      Rent: ${lease.rent_amount}`);
        console.log(`      Deposit: ${lease.deposit_amount}`);
        console.log(`      Tenant Info: ${lease.tenant_info?.first_name} ${lease.tenant_info?.last_name}`);
        console.log('');
      });
    }

    // Check all leases to see if there are any with Gumball's profile ID
    console.log('2. Checking all leases for any reference to Gumball...');
    const { data: allLeases, error: allLeasesError } = await supabase
      .from('leases')
      .select('*')
      .or(`tenant_id.eq.${gumballProfileId},tenant_info_id.eq.${gumballProfileId}`);

    if (allLeasesError) {
      console.error('❌ Error searching all leases:', allLeasesError);
    } else {
      console.log('📋 All leases with Gumball reference:', allLeases?.length || 0);
      allLeases?.forEach((lease, index) => {
        console.log(`   ${index + 1}. Tenant ID: ${lease.tenant_id}`);
        console.log(`      Tenant Info ID: ${lease.tenant_info_id}`);
        console.log(`      Status: ${lease.status}`);
        console.log(`      Start: ${lease.lease_start}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkGumballLeases();




