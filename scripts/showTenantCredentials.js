import { supabaseAdmin } from './supabaseAdmin.js';

async function showTenantCredentials() {
  console.log("🔑 Tenant Credentials Lookup");
  console.log("=" .repeat(50));
  
  try {
    // Get all tenants with their auth user info
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_id,
        created_at,
        landlord_id
      `)
      .order('created_at', { ascending: false });

    if (tenantsError) {
      throw new Error(`Failed to get tenants: ${tenantsError.message}`);
    }

    console.log(`📋 Found ${tenants.length} tenants\n`);

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to get auth users: ${authError.message}`);
    }

    console.log(`👥 Found ${authUsers.users.length} auth users\n`);

    // Match tenants with auth users
    const tenantsWithAuth = tenants.map(tenant => {
      const authUser = authUsers.users.find(user => user.id === tenant.profile_id);
      return {
        ...tenant,
        authUser: authUser ? {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          hasPassword: true // We can't see the actual password, but we know it exists
        } : null
      };
    });

    // Display tenants with their login info
    console.log("📊 TENANT CREDENTIALS SUMMARY");
    console.log("=" .repeat(50));

    tenantsWithAuth.forEach((tenant, index) => {
      console.log(`\n${index + 1}. ${tenant.first_name} ${tenant.last_name}`);
      console.log(`   📧 Email: ${tenant.email}`);
      console.log(`   🆔 Tenant ID: ${tenant.id}`);
      console.log(`   📅 Created: ${new Date(tenant.created_at).toLocaleString()}`);
      
      if (tenant.authUser) {
        console.log(`   ✅ Auth User: ${tenant.authUser.email}`);
        console.log(`   🔑 Password: [GENERATED - Check creation logs]`);
        console.log(`   🆔 Auth ID: ${tenant.authUser.id}`);
      } else {
        console.log(`   ❌ No auth user linked`);
      }
    });

    // Show tenants that can log in
    const tenantsWithLogin = tenantsWithAuth.filter(t => t.authUser);
    const tenantsWithoutLogin = tenantsWithAuth.filter(t => !t.authUser);

    console.log("\n" + "=" .repeat(50));
    console.log("📈 SUMMARY");
    console.log("=" .repeat(50));
    console.log(`✅ Tenants with login access: ${tenantsWithLogin.length}`);
    console.log(`❌ Tenants without login access: ${tenantsWithoutLogin.length}`);

    if (tenantsWithLogin.length > 0) {
      console.log("\n🔑 TENANTS WHO CAN LOG IN:");
      tenantsWithLogin.forEach(tenant => {
        console.log(`   - ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
      });
    }

    if (tenantsWithoutLogin.length > 0) {
      console.log("\n⚠️  TENANTS WHO CANNOT LOG IN:");
      tenantsWithoutLogin.forEach(tenant => {
        console.log(`   - ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
      });
    }

    console.log("\n💡 NOTE:");
    console.log("   - Passwords are generated during tenant creation");
    console.log("   - Passwords are shown in the success modal");
    console.log("   - Passwords are NOT stored in the database (for security)");
    console.log("   - If you need to reset a password, use the auth admin API");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the script
showTenantCredentials().catch(console.error);
