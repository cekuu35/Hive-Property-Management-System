import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addDataColumnDirect() {
  console.log('🔧 ADDING DATA COLUMN DIRECTLY');
  console.log('==============================\n');

  try {
    // Method 1: Try to create a notification with data to see if column exists
    console.log('1️⃣ TESTING NOTIFICATIONS TABLE WITH DATA...');
    
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test with Data',
      message: 'Testing data column',
      type: 'maintenance',
      data: { test: true }
    };

    const { data: testResult, error: testError } = await supabaseAdmin
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (testError) {
      console.log('❌ Data column missing:', testError.message);
      
      // Method 2: Try to add the column using a different approach
      console.log('\n2️⃣ ATTEMPTING TO ADD DATA COLUMN...');
      
      // Try using a raw SQL query through a function call
      const { data: sqlResult, error: sqlError } = await supabaseAdmin
        .rpc('exec_sql', {
          query: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;'
        });

      if (sqlError) {
        console.log('❌ RPC method failed:', sqlError.message);
        
        // Method 3: Try to create a simple notification without data
        console.log('\n3️⃣ TESTING SIMPLE NOTIFICATION...');
        const simpleNotification = {
          user_id: '00000000-0000-0000-0000-000000000000',
          title: 'Simple Test',
          message: 'Testing without data',
          type: 'maintenance'
        };

        const { data: simpleResult, error: simpleError } = await supabaseAdmin
          .from('notifications')
          .insert(simpleNotification)
          .select()
          .single();

        if (simpleError) {
          console.log('❌ Simple notification failed:', simpleError.message);
        } else {
          console.log('✅ Simple notification works');
          console.log('⚠️ Data column is missing - this will cause utility bill creation to fail');
        }
      } else {
        console.log('✅ Data column added successfully');
        
        // Test again
        const { data: retryResult, error: retryError } = await supabaseAdmin
          .from('notifications')
          .insert(testNotification)
          .select()
          .single();

        if (retryError) {
          console.log('❌ Still failing after adding column:', retryError.message);
        } else {
          console.log('✅ Data column works now!');
          
          // Clean up
          await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('id', retryResult.id);
          console.log('🧹 Test notification cleaned up');
        }
      }
    } else {
      console.log('✅ Data column already exists and works!');
      
      // Clean up
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testResult.id);
      console.log('🧹 Test notification cleaned up');
    }

    console.log('\n🎉 DATA COLUMN CHECK COMPLETE!');
    console.log('==============================\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addDataColumnDirect();
