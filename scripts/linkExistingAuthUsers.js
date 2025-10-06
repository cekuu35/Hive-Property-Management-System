import { supabaseAdmin } from './supabaseAdmin.js';

async function linkExistingAuthUsers() {
  console.log("🔗 Linking Existing Auth Users to Tenants");
  console.log("=" .repeat(50));
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to get auth users: ${authError.message}`);
    }

    console.log(`👥 Found ${authUsers.users.length} auth users\n`);

    const results = [];

    for (const authUser of authUsers.users) {
      console.log(`\n🔄 Processing: ${authUser.email} (${authUser.id})`);
      
      try {
        // Find tenant with matching email
        const { data: tenant, error: tenantError } = await supabaseAdmin
          .from('tenant_info')
          .select(`
            id,
            first_name,
            last_name,
            email,
            profile_id,
            landlord_id
          `)
          .eq('email', authUser.email)
          .is('profile_id', null) // Only unlinked tenants
          .single();

        if (tenantError && tenantError.code !== 'PGRST116') {
          console.log(`   ❌ Error finding tenant: ${tenantError.message}`);
          continue;
        }

        if (!tenant) {
          console.log(`   ⚠️  No unlinked tenant found for this email`);
          continue;
        }

        // Link the tenant to the auth user
        const { error: updateError } = await supabaseAdmin
          .from('tenant_info')
          .update({ profile_id: authUser.id })
          .eq('id', tenant.id);

        if (updateError) {
          console.log(`   ❌ Failed to link: ${updateError.message}`);
          results.push({
            authUser: authUser,
            tenant: tenant,
            success: false,
            error: updateError.message
          });
          continue;
        }

        console.log(`   ✅ Successfully linked to tenant: ${tenant.first_name} ${tenant.last_name}`);
        console.log(`   🆔 Tenant ID: ${tenant.id}`);
        console.log(`   🏠 Landlord ID: ${tenant.landlord_id}`);

        results.push({
          authUser: authUser,
          tenant: tenant,
          success: true
        });

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          authUser: authUser,
          success: false,
          error: error.message
        });
      }
    }

    // Summary
    console.log("\n" + "=" .repeat(50));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(50));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successfully linked: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
      console.log("\n🔗 LINKED TENANTS (Can now log in):");
      successful.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.tenant.first_name} ${result.tenant.last_name}`);
        console.log(`   📧 Email: ${result.tenant.email}`);
        console.log(`   🆔 Auth ID: ${result.authUser.id}`);
        console.log(`   🔑 Password: [Use existing password or reset]`);
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ FAILED LINKINGS:");
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.authUser.email}`);
        console.log(`   ❌ Error: ${result.error || 'No matching tenant found'}`);
      });
    }

    console.log("\n💡 NEXT STEPS:");
    console.log("1. Test logging in with the linked tenants");
    console.log("2. If passwords are forgotten, reset them");
    console.log("3. Test the tenant dashboard functionality");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the script
linkExistingAuthUsers().catch(console.error);
