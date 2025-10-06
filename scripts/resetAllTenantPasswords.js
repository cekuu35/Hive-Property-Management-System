import { supabaseAdmin } from './supabaseAdmin.js';

async function resetAllTenantPasswords() {
  console.log("🔑 Reset All Tenant Passwords");
  console.log("=" .repeat(40));
  
  try {
    // Get tenants with auth users
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_id
      `)
      .not('profile_id', 'is', null);

    if (tenantsError) {
      throw new Error(`Failed to get tenants: ${tenantsError.message}`);
    }

    console.log(`👥 Found ${tenants.length} tenants with auth users\n`);

    const results = [];

    for (const tenant of tenants) {
      console.log(`\n🔄 Resetting password for: ${tenant.first_name} ${tenant.last_name}`);
      console.log(`   📧 Email: ${tenant.email}`);
      
      try {
        // Generate new password
        const newPassword = generateRandomPassword();
        
        // Update the password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          tenant.profile_id,
          { password: newPassword }
        );

        if (updateError) {
          console.log(`   ❌ Failed to update password: ${updateError.message}`);
          results.push({
            tenant: tenant,
            success: false,
            error: updateError.message
          });
          continue;
        }

        console.log(`   ✅ Password updated successfully`);
        console.log(`   🔑 New password: ${newPassword}`);

        results.push({
          tenant: tenant,
          success: true,
          password: newPassword
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
    console.log("\n" + "=" .repeat(40));
    console.log("📊 SUMMARY");
    console.log("=" .repeat(40));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successfully reset: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
      console.log("\n🔑 NEW CREDENTIALS:");
      successful.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.tenant.first_name} ${result.tenant.last_name}`);
        console.log(`   📧 Email: ${result.tenant.email}`);
        console.log(`   🔑 Password: ${result.password}`);
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ FAILED RESETS:");
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.tenant.first_name} ${result.tenant.last_name}`);
        console.log(`   📧 Email: ${result.tenant.email}`);
        console.log(`   ❌ Error: ${result.error}`);
      });
    }

    console.log("\n💡 NEXT STEPS:");
    console.log("1. Share these credentials with the tenants");
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
resetAllTenantPasswords().catch(console.error);
