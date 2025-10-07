import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTenantLeaseStatus() {
  try {
    console.log('🔍 Checking tenant lease status...');
    
    // Get all tenants with their lease information
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        *,
        leases!leases_tenant_info_id_fkey (
          id,
          unit_id,
          start_date,
          end_date,
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
      .order('created_at', { ascending: false })
      .limit(10);

    if (tenantError) {
      console.error('❌ Error fetching tenants:', tenantError);
      return;
    }

    console.log(`📊 Found ${tenants.length} tenants:`);
    console.log('=====================================');

    tenants.forEach((tenant, index) => {
      console.log(`\n${index + 1}. ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
      console.log(`   Status: ${tenant.tenant_status}`);
      console.log(`   Created: ${tenant.created_at}`);
      
      if (tenant.leases && tenant.leases.length > 0) {
        console.log(`   ✅ Has ${tenant.leases.length} lease(s):`);
        tenant.leases.forEach((lease, leaseIndex) => {
          console.log(`      ${leaseIndex + 1}. Lease ID: ${lease.id}`);
          console.log(`         Status: ${lease.status}`);
          console.log(`         Unit: ${lease.units ? `Unit ${lease.units.unit_number} (${lease.units.type})` : 'No unit assigned'}`);
          console.log(`         Rent: KES ${lease.rent_amount?.toLocaleString() || 0}`);
          console.log(`         Period: ${lease.start_date} to ${lease.end_date}`);
        });
      } else {
        console.log(`   ❌ No active lease`);
      }
    });

    // Check specifically for Tevin Mokaya
    const { data: tevin, error: tevinError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        *,
        leases!leases_tenant_info_id_fkey (
          id,
          unit_id,
          start_date,
          end_date,
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

    if (!tevinError && tevin) {
      console.log('\n🎯 Tevin Mokaya Status:');
      console.log('=====================================');
      console.log(`Name: ${tevin.first_name} ${tevin.last_name}`);
      console.log(`Email: ${tevin.email}`);
      console.log(`Status: ${tevin.tenant_status}`);
      
      if (tevin.leases && tevin.leases.length > 0) {
        console.log(`✅ Has ${tevin.leases.length} lease(s):`);
        tevin.leases.forEach((lease, index) => {
          console.log(`   ${index + 1}. Lease ID: ${lease.id}`);
          console.log(`      Status: ${lease.status}`);
          console.log(`      Unit: ${lease.units ? `Unit ${lease.units.unit_number} (${lease.units.type})` : 'No unit assigned'}`);
          console.log(`      Rent: KES ${lease.rent_amount?.toLocaleString() || 0}`);
          console.log(`      Period: ${lease.start_date} to ${lease.end_date}`);
        });
      } else {
        console.log(`❌ No active lease`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTenantLeaseStatus();
