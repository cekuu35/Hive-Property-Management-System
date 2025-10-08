import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyGumballTenant() {
  console.log('🔍 Verifying Gumball Waterson tenant record...\n');

  try {
    // Check tenant_info
    console.log('1. Checking tenant_info for Gumball...');
    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from('tenant_info')
      .select('*')
      .eq('first_name', 'Gumball')
      .eq('last_name', 'Waterson')
      .single();

    if (tenantInfoError) {
      console.error('❌ Error fetching tenant_info:', tenantInfoError);
    } else {
      console.log('✅ Tenant info found:');
      console.log(`   - ID: ${tenantInfo.id}`);
      console.log(`   - Name: ${tenantInfo.first_name} ${tenantInfo.last_name}`);
      console.log(`   - Email: ${tenantInfo.email}`);
      console.log(`   - Status: ${tenantInfo.tenant_status}`);
      console.log(`   - Balance: $${tenantInfo.current_balance}`);
      console.log(`   - Payment Status: ${tenantInfo.payment_status}`);
    }

    // Check lease
    console.log('\n2. Checking lease for Gumball...');
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', tenantInfo?.id)
      .single();

    if (leaseError) {
      console.error('❌ Error fetching lease:', leaseError);
    } else {
      console.log('✅ Lease found:');
      console.log(`   - ID: ${lease.id}`);
      console.log(`   - Start Date: ${lease.start_date}`);
      console.log(`   - End Date: ${lease.end_date}`);
      console.log(`   - Rent: $${lease.rent_amount}`);
      console.log(`   - Deposit: $${lease.deposit_amount}`);
      console.log(`   - Status: ${lease.status}`);
    }

    // Check if Gumball appears in landlord's tenant list
    console.log('\n3. Checking if Gumball appears in landlord tenant list...');
    const landlordId = '85b546e7-6280-43c2-b281-d500f92da516';
    const { data: landlordTenants, error: landlordTenantsError } = await supabase
      .from('tenant_info')
      .select('*')
      .eq('landlord_id', landlordId);

    if (landlordTenantsError) {
      console.error('❌ Error fetching landlord tenants:', landlordTenantsError);
    } else {
      console.log(`✅ Landlord has ${landlordTenants?.length || 0} tenants:`);
      landlordTenants?.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.first_name} ${tenant.last_name} (${tenant.tenant_status})`);
      });
      
      const gumballInList = landlordTenants?.find(t => t.first_name === 'Gumball' && t.last_name === 'Waterson');
      if (gumballInList) {
        console.log('\n🎉 Gumball Waterson is now in the landlord\'s tenant list!');
      } else {
        console.log('\n❌ Gumball Waterson is NOT in the landlord\'s tenant list.');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyGumballTenant();




