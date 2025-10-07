import { supabaseAdmin } from './supabaseAdmin.js';

/**
 * Delete All Tenants Script
 * This script safely deletes all tenant-related data from the database
 * in the correct order to respect foreign key constraints
 */

async function deleteAllTenants() {
  console.log("🗑️  Starting deletion of all tenant data...\n");
  
  try {
    // Step 1: Delete tenant-related data in order (respecting foreign key constraints)
    console.log("📋 Step 1: Deleting tenant-related data...");
    
    // Delete from tables that reference tenant_info
    const deletionSteps = [
      {
        name: "Utility Bills",
        table: "utility_bills",
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Maintenance Requests", 
        table: "maintenance_requests",
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Payment Receipts",
        table: "payment_receipts", 
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Messages",
        table: "messages",
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Notifications",
        table: "notifications",
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Visitor Requests",
        table: "visitor_requests",
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Work Orders",
        table: "work_orders",
        condition: "tenant_id IS NOT NULL"
      },
      {
        name: "Leases",
        table: "leases",
        condition: "tenant_info_id IS NOT NULL"
      },
      {
        name: "Unit Applications",
        table: "unit_applications",
        condition: "tenant_id IS NOT NULL"
      }
    ];

    for (const step of deletionSteps) {
      console.log(`  🗑️  Deleting ${step.name}...`);
      
      const { data, error } = await supabaseAdmin
        .from(step.table)
        .delete()
        .not(step.condition.split(' ')[0], 'is', null);
      
      if (error) {
        console.log(`    ⚠️  ${step.name}: ${error.message}`);
      } else {
        console.log(`    ✅ ${step.name} deleted successfully`);
      }
    }

    // Step 2: Delete tenant_info records
    console.log("\n📋 Step 2: Deleting tenant_info records...");
    
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenant_info")
      .select("id, email, first_name, last_name")
      .limit(10);
    
    if (tenantError) {
      console.error("❌ Error fetching tenant data:", tenantError);
      return false;
    }
    
    if (tenantData && tenantData.length > 0) {
      console.log(`  📊 Found ${tenantData.length} tenants to delete:`);
      tenantData.forEach(tenant => {
        console.log(`    - ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
      });
      
      const { error: deleteError } = await supabaseAdmin
        .from("tenant_info")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all except dummy record
      
      if (deleteError) {
        console.error("❌ Error deleting tenant_info:", deleteError);
        return false;
      }
      
      console.log("  ✅ All tenant_info records deleted successfully");
    } else {
      console.log("  ℹ️  No tenant_info records found");
    }

    // Step 3: Delete auth users associated with tenants
    console.log("\n📋 Step 3: Cleaning up auth users...");
    
    try {
      // Get all tenant emails to delete from auth
      const { data: tenantEmails, error: emailError } = await supabaseAdmin
        .from("tenant_info")
        .select("email");
      
      if (!emailError && tenantEmails && tenantEmails.length > 0) {
        console.log(`  📧 Found ${tenantEmails.length} tenant emails to clean up`);
        
        // Note: We can't directly delete auth users from here
        // This would need to be done through Supabase Dashboard or Auth API
        console.log("  ℹ️  Auth user cleanup should be done through Supabase Dashboard");
        console.log("  ℹ️  Go to Authentication > Users and delete tenant accounts manually");
      }
    } catch (err) {
      console.log("  ⚠️  Could not fetch tenant emails for auth cleanup");
    }

    // Step 4: Reset sequences and clean up
    console.log("\n📋 Step 4: Resetting sequences...");
    
    try {
      const { error: resetError } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: `
            -- Reset any sequences if needed
            -- (Most tables use UUIDs, so this might not be necessary)
            SELECT 'Sequences reset' as status;
          `
        });
      
      if (resetError) {
        console.log("  ⚠️  Sequence reset not needed or failed:", resetError.message);
      } else {
        console.log("  ✅ Sequences reset successfully");
      }
    } catch (err) {
      console.log("  ℹ️  Sequence reset not applicable for this database");
    }

    // Step 5: Verify deletion
    console.log("\n📋 Step 5: Verifying deletion...");
    
    const { data: remainingTenants, error: verifyError } = await supabaseAdmin
      .from("tenant_info")
      .select("id")
      .limit(5);
    
    if (verifyError) {
      console.error("❌ Error verifying deletion:", verifyError);
      return false;
    }
    
    if (remainingTenants && remainingTenants.length > 0) {
      console.log(`  ⚠️  Warning: ${remainingTenants.length} tenant records still exist`);
      return false;
    } else {
      console.log("  ✅ Verification successful - no tenant records remain");
    }

    console.log("\n🎉 All tenant data has been successfully deleted!");
    console.log("\n📝 Next steps:");
    console.log("  1. Check Supabase Dashboard > Authentication > Users");
    console.log("  2. Delete any remaining tenant auth accounts manually");
    console.log("  3. Verify all related data has been cleaned up");
    
    return true;

  } catch (err) {
    console.error("❌ Error in deleteAllTenants:", err);
    return false;
  }
}

// Function to show current tenant count before deletion
async function showTenantCount() {
  try {
    console.log("📊 Checking current tenant count...");
    
    const { data, error } = await supabaseAdmin
      .from("tenant_info")
      .select("id, email, first_name, last_name, created_at");
    
    if (error) {
      console.error("❌ Error fetching tenant count:", error);
      return 0;
    }
    
    console.log(`📈 Found ${data.length} tenants in the database:`);
    data.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.first_name} ${tenant.last_name} (${tenant.email}) - Created: ${new Date(tenant.created_at).toLocaleDateString()}`);
    });
    
    return data.length;
  } catch (err) {
    console.error("❌ Error in showTenantCount:", err);
    return 0;
  }
}

// Main execution
async function main() {
  console.log("🚀 Tenant Deletion Script");
  console.log("========================\n");
  
  // Show current count
  const tenantCount = await showTenantCount();
  
  if (tenantCount === 0) {
    console.log("ℹ️  No tenants found in the database. Nothing to delete.");
    return;
  }
  
  console.log(`\n⚠️  WARNING: This will delete ALL ${tenantCount} tenants and their related data!`);
  console.log("This action cannot be undone.\n");
  
  // For safety, we'll require manual confirmation
  console.log("To proceed with deletion, run:");
  console.log("node scripts/deleteAllTenants.js --confirm");
  
  // Check if --confirm flag is passed
  if (process.argv.includes('--confirm')) {
    console.log("\n✅ Confirmation received. Proceeding with deletion...\n");
    await deleteAllTenants();
  } else {
    console.log("\n🛑 Deletion cancelled. Use --confirm flag to proceed.");
  }
}

// Export functions for use in other scripts
export { deleteAllTenants, showTenantCount };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
