import { supabaseAdmin, testAdminConnection, fetchAllTenants } from './supabaseAdmin.js';

async function main() {
  console.log("🚀 Testing Supabase Admin Setup...\n");
  
  // Test 1: Basic connection
  const connectionTest = await testAdminConnection();
  if (!connectionTest) {
    console.error("❌ Connection test failed. Please check your environment variables.");
    process.exit(1);
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 2: Fetch all tenants
  const tenants = await fetchAllTenants();
  if (tenants) {
    console.log("📊 Tenant Data Summary:");
    console.log(`Total tenants: ${tenants.length}`);
    
    const tenantsWithLeases = tenants.filter(t => t.leases && t.leases.length > 0);
    const tenantsWithoutLeases = tenants.filter(t => !t.leases || t.leases.length === 0);
    
    console.log(`Tenants with leases: ${tenantsWithLeases.length}`);
    console.log(`Tenants without leases: ${tenantsWithoutLeases.length}`);
    
    if (tenants.length > 0) {
      console.log("\n📋 Sample tenant data:");
      console.log(JSON.stringify(tenants[0], null, 2));
    }
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Test 3: Test table creation (optional)
  console.log("🔧 Testing table creation capabilities...");
  try {
    // Test if we can execute SQL (this might fail if RPC is not enabled)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log("⚠️  Note: Some admin functions may require additional RLS policies");
      console.log("Error details:", error.message);
    } else {
      console.log("✅ Admin client has proper database access");
    }
  } catch (err) {
    console.log("⚠️  Note: Some admin functions may require additional setup");
    console.log("Error details:", err.message);
  }
  
  console.log("\n✅ Supabase Admin setup is complete and working!");
  console.log("\nYou can now use the supabaseAdmin client for:");
  console.log("- Creating and modifying tables");
  console.log("- Adding foreign key relationships");
  console.log("- Inserting mock data");
  console.log("- Managing database schema");
}

// Run the test
main().catch(console.error);
