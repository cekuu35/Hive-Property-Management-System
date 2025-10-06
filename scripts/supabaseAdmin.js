import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required but not found in environment variables");
  console.error("Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file");
  process.exit(1);
}

// Create admin client with service role key for elevated permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test function to verify admin connection
export async function testAdminConnection() {
  try {
    console.log("Testing Supabase Admin connection...");
    
    // Test basic connection by fetching from profiles table
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .limit(5);
    
    if (error) {
      console.error("Admin connection test failed:", error);
      return false;
    }
    
    console.log("✅ Admin connection successful!");
    console.log(`Found ${data.length} profiles`);
    return true;
  } catch (err) {
    console.error("Admin connection test error:", err);
    return false;
  }
}

// Function to fetch all tenants data
export async function fetchAllTenants() {
  try {
    console.log("Fetching all tenant data...");
    
    const { data, error } = await supabaseAdmin
      .from("tenant_info")
      .select(`
        *,
        leases!leases_tenant_info_id_fkey (
          id,
          unit_id,
          start_date,
          end_date,
          rent_amount,
          deposit_amount,
          status,
          units (
            unit_number,
            properties (
              name,
              address
            )
          )
        )
      `);
    
    if (error) {
      console.error("Error fetching tenants:", error);
      return null;
    }
    
    console.log(`✅ Successfully fetched ${data.length} tenants`);
    return data;
  } catch (err) {
    console.error("Error in fetchAllTenants:", err);
    return null;
  }
}

// Function to create a new table (example)
export async function createUtilityBillsTable() {
  try {
    console.log("Creating utility_bills table...");
    
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
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
        
        -- Enable RLS
        ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;
        
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
        
        -- Create indexes for better performance
        CREATE INDEX idx_utility_bills_tenant_id ON utility_bills(tenant_id);
        CREATE INDEX idx_utility_bills_landlord_id ON utility_bills(landlord_id);
        CREATE INDEX idx_utility_bills_unit_id ON utility_bills(unit_id);
        CREATE INDEX idx_utility_bills_status ON utility_bills(status);
        CREATE INDEX idx_utility_bills_due_date ON utility_bills(due_date);
      `
    });
    
    if (error) {
      console.error("Error creating utility_bills table:", error);
      return false;
    }
    
    console.log("✅ utility_bills table created successfully!");
    return true;
  } catch (err) {
    console.error("Error in createUtilityBillsTable:", err);
    return false;
  }
}

// Export default for easy importing
export default supabaseAdmin;
