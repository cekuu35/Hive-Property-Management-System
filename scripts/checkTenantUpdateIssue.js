import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTenantUpdateIssue() {
  try {
    console.log('🔍 Checking tenant update issue...');
    
    // Get Tevin's tenant info
    const { data: tevin, error: tevinError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        *,
        tenants (
          id,
          unit_id,
          rent_amount,
          security_deposit,
          status
        ),
        leases!leases_tenant_info_id_fkey (
          id,
          unit_id,
          rent_amount,
          deposit_amount,
          status,
          units (
            id,
            unit_number,
            type,
            rent_amount
          )
        )
      `)
      .eq('email', 'tevinmokaya@gmail.com')
      .single();

    if (tevinError) {
      console.error('❌ Error fetching Tevin:', tevinError);
      return;
    }

    console.log('📊 Tevin\'s Current Status:');
    console.log('=====================================');
    console.log(`Name: ${tevin.first_name} ${tevin.last_name}`);
    console.log(`Email: ${tevin.email}`);
    console.log(`Status: ${tevin.tenant_status}`);
    
    console.log('\n🏠 Tenant Record:');
    if (tevin.tenants && tevin.tenants.length > 0) {
      tevin.tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. Tenant ID: ${tenant.id}`);
        console.log(`      Unit ID: ${tenant.unit_id || 'None'}`);
        console.log(`      Rent: KES ${tenant.rent_amount?.toLocaleString() || 0}`);
        console.log(`      Status: ${tenant.status}`);
      });
    } else {
      console.log('   ❌ No tenant record found');
    }

    console.log('\n📋 Lease Records:');
    if (tevin.leases && tevin.leases.length > 0) {
      tevin.leases.forEach((lease, index) => {
        console.log(`   ${index + 1}. Lease ID: ${lease.id}`);
        console.log(`      Unit ID: ${lease.unit_id || 'None'}`);
        console.log(`      Unit: ${lease.units ? `Unit ${lease.units.unit_number} (${lease.units.type})` : 'No unit assigned'}`);
        console.log(`      Rent: KES ${lease.rent_amount?.toLocaleString() || 0}`);
        console.log(`      Status: ${lease.status}`);
      });
    } else {
      console.log('   ❌ No lease records found');
    }

    // Check what happens when we try to update
    console.log('\n🧪 Testing unit assignment...');
    
    // Get available units
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('units')
      .select('id, unit_number, type, rent_amount, status')
      .eq('status', 'vacant')
      .limit(5);

    if (unitsError) {
      console.error('❌ Error fetching units:', unitsError);
      return;
    }

    console.log(`\n📋 Available Units (${units.length}):`);
    units.forEach((unit, index) => {
      console.log(`   ${index + 1}. Unit ${unit.unit_number} (${unit.type}) - KES ${unit.rent_amount?.toLocaleString() || 0}`);
    });

    if (units.length > 0) {
      const testUnit = units[0];
      console.log(`\n🔧 Testing assignment of Unit ${testUnit.unit_number} to Tevin...`);
      
      // Test the update process
      const updateData = {
        unit_id: testUnit.id,
        rent_amount: testUnit.rent_amount,
        security_deposit: 50000,
        lease_start_date: new Date().toISOString().split('T')[0],
        lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      console.log('📝 Update data:', updateData);

      // Check if tenant record exists
      if (tevin.tenants && tevin.tenants.length > 0) {
        const tenantRecord = tevin.tenants[0];
        console.log(`\n✅ Tenant record exists (ID: ${tenantRecord.id})`);
        console.log('   This means the update should work through the tenants table');
      } else {
        console.log(`\n❌ No tenant record found`);
        console.log('   This means we need to create a tenant record first');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTenantUpdateIssue();
