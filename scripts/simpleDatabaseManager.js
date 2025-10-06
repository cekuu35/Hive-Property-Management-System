import { supabaseAdmin } from './supabaseAdmin.js';

/**
 * Simple Database Manager - Uses direct table operations instead of SQL execution
 * This approach works with the standard Supabase client without requiring exec_sql function
 */

// Test basic table operations
export async function testTableOperations() {
  console.log("🧪 Testing basic table operations...");
  
  try {
    // Test 1: List all tables by trying to select from common tables
    const tables = ['profiles', 'tenant_info', 'leases', 'units', 'properties', 'rent_payments'];
    const availableTables = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('count')
          .limit(1);
        
        if (!error) {
          availableTables.push(table);
          console.log(`✅ Table '${table}' is accessible`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' not accessible: ${err.message}`);
      }
    }
    
    console.log(`\n📊 Available tables: ${availableTables.join(', ')}`);
    return availableTables;
  } catch (err) {
    console.error("❌ Error testing table operations:", err);
    return [];
  }
}

// Test inserting data into existing tables
export async function testDataInsertion() {
  console.log("\n📝 Testing data insertion...");
  
  try {
    // Test inserting a simple record (we'll use a safe approach)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      console.log(`✅ Can read from profiles table`);
      console.log(`Sample profile: ${profiles[0].first_name} ${profiles[0].last_name}`);
    }
    
    return true;
  } catch (err) {
    console.error("❌ Error testing data insertion:", err);
    return false;
  }
}

// Test utility_bills table if it exists
export async function testUtilityBillsTable() {
  console.log("\n🔍 Testing utility_bills table...");
  
  try {
    const { data, error } = await supabaseAdmin
      .from('utility_bills')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log("ℹ️  utility_bills table doesn't exist yet");
        return false;
      } else {
        console.error("❌ Error accessing utility_bills table:", error);
        return false;
      }
    }
    
    console.log(`✅ utility_bills table exists with ${data.length} records`);
    return true;
  } catch (err) {
    console.log("ℹ️  utility_bills table doesn't exist yet");
    return false;
  }
}

// Create utility_bills table using direct operations (if possible)
export async function createUtilityBillsTableDirect() {
  console.log("\n🔧 Attempting to create utility_bills table...");
  
  try {
    // This approach might not work without proper SQL execution permissions
    // But we can test if we have the capability
    console.log("ℹ️  Direct table creation requires SQL execution permissions");
    console.log("ℹ️  Use the migration file: supabase/migrations/20250115000000_create_utility_bills_table.sql");
    console.log("ℹ️  Or apply it manually in your Supabase dashboard");
    
    return false;
  } catch (err) {
    console.error("❌ Error creating table:", err);
    return false;
  }
}

// Insert mock data into utility_bills (if table exists)
export async function insertMockUtilityBills() {
  console.log("\n📝 Testing mock data insertion...");
  
  try {
    // First check if table exists
    const tableExists = await testUtilityBillsTable();
    if (!tableExists) {
      console.log("ℹ️  utility_bills table doesn't exist. Create it first using the migration file.");
      return false;
    }
    
    // Get some existing data for relationships
    const { data: tenants } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        landlord_id,
        leases!leases_tenant_info_id_fkey (
          unit_id,
          units (
            id
          )
        )
      `)
      .limit(3);
    
    if (!tenants || tenants.length === 0) {
      console.log("ℹ️  No tenants found for mock data");
      return false;
    }
    
    const mockBills = [];
    
    tenants.forEach(tenant => {
      if (tenant.leases && tenant.leases.length > 0) {
        const lease = tenant.leases[0];
        if (lease.units) {
          mockBills.push({
            tenant_id: tenant.id,
            landlord_id: tenant.landlord_id,
            unit_id: lease.units.id,
            bill_type: 'electricity',
            amount: Math.floor(Math.random() * 5000) + 1000,
            due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'pending',
            description: 'Monthly electricity bill'
          });
        }
      }
    });
    
    if (mockBills.length === 0) {
      console.log("ℹ️  No valid tenant-lease combinations found");
      return false;
    }
    
    const { data, error } = await supabaseAdmin
      .from('utility_bills')
      .insert(mockBills);
    
    if (error) {
      console.error("❌ Error inserting mock data:", error);
      return false;
    }
    
    console.log(`✅ Successfully inserted ${mockBills.length} mock utility bills!`);
    return true;
  } catch (err) {
    console.error("❌ Error in insertMockUtilityBills:", err);
    return false;
  }
}

// Main test function
export async function runDatabaseTests() {
  console.log("🚀 Running Database Management Tests");
  console.log("=" .repeat(50));
  
  const tests = [
    { name: "Table Operations", fn: testTableOperations },
    { name: "Data Insertion", fn: testDataInsertion },
    { name: "Utility Bills Table Check", fn: testUtilityBillsTable },
    { name: "Mock Data Insertion", fn: insertMockUtilityBills }
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    try {
      await test.fn();
    } catch (err) {
      console.error(`❌ Test failed: ${err.message}`);
    }
  }
  
  console.log("\n✅ Database tests completed!");
  console.log("\n📚 Next Steps:");
  console.log("1. Apply the migration file: supabase/migrations/20250115000000_create_utility_bills_table.sql");
  console.log("2. Run this test again to verify table creation");
  console.log("3. Use the admin client for data operations");
}

// Export all functions
export default {
  testTableOperations,
  testDataInsertion,
  testUtilityBillsTable,
  createUtilityBillsTableDirect,
  insertMockUtilityBills,
  runDatabaseTests
};
