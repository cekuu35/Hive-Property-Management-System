#!/usr/bin/env node

import { testAdminConnection, fetchAllTenants } from './supabaseAdmin.js';
import { setupUtilityBillsTable, listAllTables } from './databaseManager.js';

async function main() {
  console.log("🚀 Supabase Database Setup & Management Tool");
  console.log("=" .repeat(50));
  
  // Step 1: Test basic connection
  console.log("\n1️⃣ Testing Admin Connection...");
  const connectionOk = await testAdminConnection();
  if (!connectionOk) {
    console.error("❌ Cannot proceed without admin connection");
    process.exit(1);
  }
  
  // Step 2: List existing tables
  console.log("\n2️⃣ Listing Existing Tables...");
  await listAllTables();
  
  // Step 3: Fetch and display tenant data
  console.log("\n3️⃣ Fetching Tenant Data...");
  const tenants = await fetchAllTenants();
  if (tenants) {
    console.log(`✅ Found ${tenants.length} tenants in the database`);
  }
  
  // Step 4: Ask user if they want to create utility_bills table
  console.log("\n4️⃣ Database Management Options:");
  console.log("   - utility_bills table (with relationships to tenants, landlords, units)");
  console.log("   - RLS policies for data security");
  console.log("   - Performance indexes");
  console.log("   - Mock data for testing");
  
  // For now, let's just show what we can do
  console.log("\n✅ Setup Complete!");
  console.log("\n📚 Available Commands:");
  console.log("   npm run test:admin     - Test admin connection");
  console.log("   node scripts/setupDatabase.js  - Run this setup");
  console.log("   node scripts/databaseManager.js - Use database management functions");
  
  console.log("\n🔧 Next Steps:");
  console.log("   1. Add your SUPABASE_SERVICE_ROLE_KEY to .env.local");
  console.log("   2. Run: npm run test:admin");
  console.log("   3. Use the databaseManager.js functions to create tables");
  
  console.log("\n📖 Example Usage:");
  console.log("   import { setupUtilityBillsTable } from './scripts/databaseManager.js';");
  console.log("   await setupUtilityBillsTable();");
}

// Run the setup
main().catch(console.error);
