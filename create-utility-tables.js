import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUtilityTables() {
  console.log('🚀 Creating Utility Billing System tables...\n');

  try {
    // 1. Create utilities table and insert sample data
    console.log('1. Creating utilities table...');
    
    // First, let's check if utilities table exists
    const { data: existingUtilities, error: checkError } = await supabase
      .from('utilities')
      .select('*')
      .limit(1);

    if (checkError && checkError.code === 'PGRST205') {
      console.log('   Utilities table does not exist, creating...');
      
      // Since we can't create tables directly via the client, we'll need to use the Supabase dashboard
      // or SQL editor to run the migration SQL
      console.log('   ⚠️  Please run the following SQL in your Supabase SQL Editor:');
      console.log('   ');
      console.log('   -- Create utilities table');
      console.log('   CREATE TABLE IF NOT EXISTS utilities (');
      console.log('       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('       name text NOT NULL,');
      console.log('       created_at timestamptz DEFAULT now()');
      console.log('   );');
      console.log('   ');
      console.log('   -- Insert sample utilities');
      console.log('   INSERT INTO utilities (name) VALUES ');
      console.log('       (\'Water\'),');
      console.log('       (\'Electricity\'),');
      console.log('       (\'Internet\')');
      console.log('   ON CONFLICT (name) DO NOTHING;');
      console.log('   ');
    } else if (checkError) {
      console.error('   ❌ Error checking utilities table:', checkError);
    } else {
      console.log('   ✅ Utilities table already exists');
    }

    // 2. Check unit_bills table
    console.log('\n2. Checking unit_bills table...');
    const { data: existingBills, error: billsCheckError } = await supabase
      .from('unit_bills')
      .select('*')
      .limit(1);

    if (billsCheckError && billsCheckError.code === 'PGRST205') {
      console.log('   Unit_bills table does not exist');
      console.log('   ⚠️  Please run the following SQL in your Supabase SQL Editor:');
      console.log('   ');
      console.log('   -- Create unit_bills table');
      console.log('   CREATE TABLE IF NOT EXISTS unit_bills (');
      console.log('       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('       unit_id uuid REFERENCES units(id) ON DELETE CASCADE,');
      console.log('       tenant_id uuid REFERENCES tenant_info(id) ON DELETE SET NULL,');
      console.log('       landlord_id uuid REFERENCES profiles(id) ON DELETE CASCADE,');
      console.log('       utility_id uuid REFERENCES utilities(id) ON DELETE RESTRICT,');
      console.log('       month text NOT NULL,');
      console.log('       amount numeric NOT NULL,');
      console.log('       due_date date,');
      console.log('       status text DEFAULT \'unpaid\' CHECK (status IN (\'unpaid\', \'paid\', \'overdue\')),');
      console.log('       paystack_reference text,');
      console.log('       payment_reason text,');
      console.log('       created_at timestamptz DEFAULT now(),');
      console.log('       updated_at timestamptz DEFAULT now()');
      console.log('   );');
      console.log('   ');
    } else if (billsCheckError) {
      console.error('   ❌ Error checking unit_bills table:', billsCheckError);
    } else {
      console.log('   ✅ Unit_bills table already exists');
    }

    // 3. Check notifications table
    console.log('\n3. Checking notifications table...');
    const { data: existingNotifications, error: notificationsCheckError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (notificationsCheckError && notificationsCheckError.code === 'PGRST205') {
      console.log('   Notifications table does not exist');
      console.log('   ⚠️  Please run the following SQL in your Supabase SQL Editor:');
      console.log('   ');
      console.log('   -- Create notifications table');
      console.log('   CREATE TABLE IF NOT EXISTS notifications (');
      console.log('       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.log('       user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,');
      console.log('       title text NOT NULL,');
      console.log('       message text NOT NULL,');
      console.log('       type text NOT NULL DEFAULT \'info\',');
      console.log('       data jsonb,');
      console.log('       read boolean DEFAULT false,');
      console.log('       created_at timestamptz DEFAULT now()');
      console.log('   );');
      console.log('   ');
    } else if (notificationsCheckError) {
      console.error('   ❌ Error checking notifications table:', notificationsCheckError);
    } else {
      console.log('   ✅ Notifications table already exists');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL commands shown above');
    console.log('4. Then run the test script again');
    
    console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/kozhlejudselgtmohdfm');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
createUtilityTables();









