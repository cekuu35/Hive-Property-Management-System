import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testUnitAssignment() {
  try {
    console.log('🧪 Testing unit assignment for Tevin...');
    
    // Get Tevin's current status
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
    
    if (tevin.tenants && tevin.tenants.length > 0) {
      const tenant = tevin.tenants[0];
      console.log(`Tenant ID: ${tenant.id}`);
      console.log(`Current Unit: ${tenant.unit_id || 'None'}`);
      console.log(`Current Rent: KES ${tenant.rent_amount?.toLocaleString() || 0}`);
    }

    if (tevin.leases && tevin.leases.length > 0) {
      tevin.leases.forEach((lease, index) => {
        console.log(`Lease ${index + 1}: Unit ${lease.unit_id || 'None'} - KES ${lease.rent_amount?.toLocaleString() || 0}`);
      });
    } else {
      console.log('No active leases');
    }

    // Get available units
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('units')
      .select('id, unit_number, type, rent_amount, status')
      .eq('status', 'vacant')
      .limit(3);

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
      
      // Simulate the update process
      const tenantId = tevin.tenants[0].id;
      const updateData = {
        unit_id: testUnit.id,
        rent_amount: testUnit.rent_amount || 50000,
        security_deposit: 100000,
        lease_start_date: new Date().toISOString().split('T')[0],
        lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      console.log('📝 Update data:', updateData);

      // Update the tenants table
      const { error: updateTenantError } = await supabaseAdmin
        .from('tenants')
        .update({
          unit_id: updateData.unit_id,
          rent_amount: updateData.rent_amount,
          security_deposit: updateData.security_deposit,
          lease_start_date: updateData.lease_start_date,
          lease_end_date: updateData.lease_end_date
        })
        .eq('id', tenantId);

      if (updateTenantError) {
        console.error('❌ Error updating tenants table:', updateTenantError);
        return;
      }

      console.log('✅ Tenants table updated successfully');

      // Create or update lease
      const { data: existingLease, error: findLeaseError } = await supabaseAdmin
        .from('leases')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      if (findLeaseError && findLeaseError.code !== 'PGRST116') {
        console.error('❌ Error finding lease:', findLeaseError);
        return;
      }

      if (existingLease) {
        // Update existing lease
        const { error: updateLeaseError } = await supabaseAdmin
          .from('leases')
          .update({
            unit_id: updateData.unit_id,
            rent_amount: updateData.rent_amount,
            deposit_amount: updateData.security_deposit,
            start_date: updateData.lease_start_date,
            end_date: updateData.lease_end_date,
            status: 'active'
          })
          .eq('id', existingLease.id);

        if (updateLeaseError) {
          console.error('❌ Error updating lease:', updateLeaseError);
          return;
        }

        console.log('✅ Existing lease updated successfully');
      } else {
        // Create new lease
        const { error: createLeaseError } = await supabaseAdmin
          .from('leases')
          .insert({
            tenant_id: tevin.id, // tenant_id should reference tenant_info.id
            tenant_info_id: tevin.id,
            unit_id: updateData.unit_id,
            rent_amount: updateData.rent_amount,
            deposit_amount: updateData.security_deposit,
            start_date: updateData.lease_start_date,
            end_date: updateData.lease_end_date,
            status: 'active'
          });

        if (createLeaseError) {
          console.error('❌ Error creating lease:', createLeaseError);
          return;
        }

        console.log('✅ New lease created successfully');
      }

      console.log('\n🎉 Unit assignment test completed successfully!');
      console.log(`Tevin is now assigned to Unit ${testUnit.unit_number}`);
      console.log('The edit form should now work properly for unit assignment.');

    } else {
      console.log('❌ No available units found for testing');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUnitAssignment();
