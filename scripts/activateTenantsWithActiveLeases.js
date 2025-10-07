import { supabaseAdmin } from './supabaseAdmin.js';

async function activateTenantsWithActiveLeases() {
  console.log('🔄 Activating Tenants with Active Leases...\n');

  try {
    // Find all tenants with active leases but pending status
    const { data: tenantsWithActiveLeases, error: queryError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        first_name,
        last_name,
        email,
        tenant_status,
        leases!leases_tenant_info_id_fkey (
          id,
          status
        )
      `)
      .eq('leases!leases_tenant_info_id_fkey.status', 'active')
      .eq('tenant_status', 'pending');

    if (queryError) {
      console.error('❌ Error querying tenants:', queryError);
      return;
    }

    if (!tenantsWithActiveLeases || tenantsWithActiveLeases.length === 0) {
      console.log('✅ All tenants with active leases are already activated!');
      return;
    }

    console.log(`Found ${tenantsWithActiveLeases.length} tenants with active leases but pending status:`);
    tenantsWithActiveLeases.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
    });

    console.log('\n🔄 Activating tenants...\n');

    let activatedCount = 0;

    for (const tenant of tenantsWithActiveLeases) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('tenant_info')
          .update({ tenant_status: 'active' })
          .eq('id', tenant.id);

        if (updateError) {
          console.error(`❌ Failed to activate ${tenant.email}:`, updateError.message);
          continue;
        }

        console.log(`✅ Activated ${tenant.first_name} ${tenant.last_name}`);
        activatedCount++;

      } catch (error) {
        console.error(`❌ Error processing ${tenant.email}:`, error.message);
      }
    }

    console.log('\n🎉 Activation completed!');
    console.log(`   • Activated: ${activatedCount} tenants`);
    console.log(`   • Total processed: ${tenantsWithActiveLeases.length}`);
    console.log('\n✅ All tenants with active leases are now activated!');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
activateTenantsWithActiveLeases();
