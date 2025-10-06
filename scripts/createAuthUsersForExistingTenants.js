import { supabaseAdmin } from './supabaseAdmin.js';

async function createAuthUsersForExistingTenants() {
  console.log("🔧 Creating Auth Users for Existing Tenants");
  console.log("=" .repeat(60));
  
  try {
    // Get tenants without auth users
    const { data: tenantsWithoutAuth, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        first_name,
        last_name,
        email,
        landlord_id,
        created_at
      `)
      .is('profile_id', null)
      .order('created_at', { ascending: false })
      .limit(5); // Limit to 5 for testing

    if (tenantsError) {
      throw new Error(`Failed to get tenants: ${tenantsError.message}`);
    }

    console.log(`📋 Found ${tenantsWithoutAuth.length} tenants without auth users\n`);

    const results = [];

    for (const tenant of tenantsWithoutAuth) {
      console.log(`\n🔄 Processing: ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
      
      try {
        // Generate a random password
        const password = generateRandomPassword();
        
        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: tenant.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            role: 'tenant'
          }
        });

        if (authError) {
          console.log(`   ❌ Failed to create auth user: ${authError.message}`);
          results.push({
            tenant: tenant,
            success: false,
            error: authError.message
          });
          continue;
        }

        // Update tenant_info with auth user ID
        const { error: updateError } = await supabaseAdmin
          .from('tenant_info')
          .update({ profile_id: authUser.user.id })
          .eq('id', tenant.id);

        if (updateError) {
          console.log(`   ❌ Failed to link auth user: ${updateError.message}`);
          // Clean up auth user
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          results.push({
            tenant: tenant,
            success: false,
            error: updateError.message
          });
          continue;
        }

        console.log(`   ✅ Auth user created and linked successfully`);
        console.log(`   📧 Email: ${tenant.email}`);
        console.log(`   🔑 Password: ${password}`);
        console.log(`   🆔 Auth ID: ${authUser.user.id}`);

        results.push({
          tenant: tenant,
          success: true,
          authUserId: authUser.user.id,
          password: password
        });

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          tenant: tenant,
          success: false,
          error: error.message
        });
      }
    }

    // Summary
    console.log("\n" + "=" .repeat(60));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successfully created: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
      console.log("\n🔑 NEW CREDENTIALS:");
      successful.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.tenant.first_name} ${result.tenant.last_name}`);
        console.log(`   📧 Email: ${result.tenant.email}`);
        console.log(`   🔑 Password: ${result.password}`);
        console.log(`   🆔 Auth ID: ${result.authUserId}`);
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ FAILED CREATIONS:");
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.tenant.first_name} ${result.tenant.last_name}`);
        console.log(`   📧 Email: ${result.tenant.email}`);
        console.log(`   ❌ Error: ${result.error}`);
      });
    }

    console.log("\n💡 NEXT STEPS:");
    console.log("1. Share the credentials with the tenants");
    console.log("2. Ask them to log in and change their passwords");
    console.log("3. Test the tenant dashboard functionality");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Run the script
createAuthUsersForExistingTenants().catch(console.error);
