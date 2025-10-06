import { supabaseAdmin } from './supabaseAdmin.js';

/**
 * Database Manager - A comprehensive tool for managing Supabase schema
 * This script provides functions for creating tables, adding relationships,
 * and managing data with elevated permissions.
 */

// Example: Create utility_bills table with proper relationships
export async function createUtilityBillsTable() {
  console.log("🔧 Creating utility_bills table...");
  
  try {
    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabaseAdmin
      .from('utility_bills')
      .select('id')
      .limit(1);
    
    if (existingTable && existingTable.length >= 0) {
      console.log("⚠️  utility_bills table already exists");
      return true;
    }
    
    // Create the table using a migration approach
    const { data, error } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS utility_bills (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenant_info(id) ON DELETE CASCADE,
            landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
            bill_type TEXT NOT NULL CHECK (bill_type IN ('electricity', 'water', 'gas', 'internet', 'other')),
            amount DECIMAL(10,2) NOT NULL,
            due_date DATE NOT NULL,
            paid_date DATE,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `
      });
    
    if (error) {
      console.error("❌ Error creating utility_bills table:", error);
      return false;
    }
    
    console.log("✅ utility_bills table created successfully!");
    return true;
  } catch (err) {
    console.error("❌ Error in createUtilityBillsTable:", err);
    return false;
  }
}

// Example: Add RLS policies for utility_bills
export async function addUtilityBillsPolicies() {
  console.log("🔒 Adding RLS policies for utility_bills...");
  
  try {
    const { data, error } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          -- Enable RLS
          ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies if they exist
          DROP POLICY IF EXISTS "Landlords can manage utility bills for their properties" ON utility_bills;
          DROP POLICY IF EXISTS "Tenants can view their own utility bills" ON utility_bills;
          
          -- Create policies
          CREATE POLICY "Landlords can manage utility bills for their properties" 
          ON utility_bills 
          FOR ALL 
          USING (landlord_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
          ));
          
          CREATE POLICY "Tenants can view their own utility bills" 
          ON utility_bills 
          FOR SELECT 
          USING (tenant_id IN (
            SELECT id FROM tenant_info WHERE profile_id = auth.uid()
          ));
        `
      });
    
    if (error) {
      console.error("❌ Error adding RLS policies:", error);
      return false;
    }
    
    console.log("✅ RLS policies added successfully!");
    return true;
  } catch (err) {
    console.error("❌ Error in addUtilityBillsPolicies:", err);
    return false;
  }
}

// Example: Create indexes for better performance
export async function addUtilityBillsIndexes() {
  console.log("📊 Adding indexes for utility_bills...");
  
  try {
    const { data, error } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_utility_bills_tenant_id ON utility_bills(tenant_id);
          CREATE INDEX IF NOT EXISTS idx_utility_bills_landlord_id ON utility_bills(landlord_id);
          CREATE INDEX IF NOT EXISTS idx_utility_bills_unit_id ON utility_bills(unit_id);
          CREATE INDEX IF NOT EXISTS idx_utility_bills_status ON utility_bills(status);
          CREATE INDEX IF NOT EXISTS idx_utility_bills_due_date ON utility_bills(due_date);
          CREATE INDEX IF NOT EXISTS idx_utility_bills_bill_type ON utility_bills(bill_type);
        `
      });
    
    if (error) {
      console.error("❌ Error adding indexes:", error);
      return false;
    }
    
    console.log("✅ Indexes added successfully!");
    return true;
  } catch (err) {
    console.error("❌ Error in addUtilityBillsIndexes:", err);
    return false;
  }
}

// Example: Insert mock data
export async function insertMockUtilityBills() {
  console.log("📝 Inserting mock utility bills data...");
  
  try {
    // First, get some existing tenants and units
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select(`
        id,
        landlord_id,
        leases (
          unit_id,
          units (
            id
          )
        )
      `)
      .limit(3);
    
    if (tenantsError || !tenants || tenants.length === 0) {
      console.log("⚠️  No tenants found. Skipping mock data insertion.");
      return true;
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
            amount: Math.floor(Math.random() * 5000) + 1000, // Random amount between 1000-6000
            due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Random date within next 30 days
            status: 'pending',
            description: 'Monthly electricity bill'
          });
        }
      }
    });
    
    if (mockBills.length === 0) {
      console.log("⚠️  No valid tenant-lease combinations found. Skipping mock data insertion.");
      return true;
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

// Main function to set up utility_bills table completely
export async function setupUtilityBillsTable() {
  console.log("🚀 Setting up utility_bills table...\n");
  
  const steps = [
    { name: "Create Table", fn: createUtilityBillsTable },
    { name: "Add RLS Policies", fn: addUtilityBillsPolicies },
    { name: "Add Indexes", fn: addUtilityBillsIndexes },
    { name: "Insert Mock Data", fn: insertMockUtilityBills }
  ];
  
  for (const step of steps) {
    console.log(`\n📋 Step: ${step.name}`);
    const success = await step.fn();
    if (!success) {
      console.error(`❌ Failed at step: ${step.name}`);
      return false;
    }
  }
  
  console.log("\n✅ utility_bills table setup complete!");
  return true;
}

// Function to list all tables in the database
export async function listAllTables() {
  console.log("📋 Listing all tables in the database...");
  
  try {
    const { data, error } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      });
    
    if (error) {
      console.error("❌ Error listing tables:", error);
      return null;
    }
    
    console.log("📊 Available tables:");
    data.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    return data;
  } catch (err) {
    console.error("❌ Error in listAllTables:", err);
    return null;
  }
}

// Export all functions
export default {
  createUtilityBillsTable,
  addUtilityBillsPolicies,
  addUtilityBillsIndexes,
  insertMockUtilityBills,
  setupUtilityBillsTable,
  listAllTables
};
