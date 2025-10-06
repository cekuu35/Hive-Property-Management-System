import { supabaseAdmin } from './supabaseAdmin.js';

async function resetTenantPassword() {
  console.log("🔑 Reset Tenant Password");
  console.log("=" .repeat(40));
  
  try {
    // Get the tenant who can log in
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_id
      `)
      .eq('email', 'test.tenant@example.com')
      .single();

    if (tenantError || !tenant) {
      throw new Error('Test tenant not found');
    }

    console.log(`👤 Found tenant: ${tenant.first_name} ${tenant.last_name}`);
    console.log(`📧 Email: ${tenant.email}`);
    console.log(`🆔 Auth ID: ${tenant.profile_id}`);

    // Generate new password
    const newPassword = generateRandomPassword();
    console.log(`🔑 New password: ${newPassword}`);

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tenant.profile_id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log("\n✅ Password updated successfully!");
    console.log("\n📋 CREDENTIALS:");
    console.log(`📧 Email: ${tenant.email}`);
    console.log(`🔑 Password: ${newPassword}`);
    console.log(`🌐 Login URL: Your app's login page`);

    console.log("\n💡 NEXT STEPS:");
    console.log("1. Share these credentials with the tenant");
    console.log("2. Ask them to log in and change the password");
    console.log("3. Test the tenant dashboard");

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
resetTenantPassword().catch(console.error);
