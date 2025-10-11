import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixNotificationsSimple() {
  console.log('🔧 FIXING NOTIFICATIONS DATA COLUMN (SIMPLE)');
  console.log('============================================\n');

  try {
    // 1. Try to add the data column directly
    console.log('1️⃣ ADDING DATA COLUMN TO NOTIFICATIONS TABLE...');
    const { error: alterError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .limit(1);

    if (alterError && alterError.message.includes('column "data" does not exist')) {
      console.log('❌ Data column missing, attempting to add it...');
      
      // Try to add the column using a direct SQL approach
      const { error: sqlError } = await supabaseAdmin.rpc('exec', {
        sql: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;'
      });

      if (sqlError) {
        console.error('❌ Error adding data column via RPC:', sqlError);
        
        // Try alternative approach - create a test notification with data
        console.log('🔄 Trying alternative approach...');
        const testNotification = {
          user_id: '00000000-0000-0000-0000-000000000000',
          title: 'Test',
          message: 'Test',
          type: 'test'
        };

        const { error: testError } = await supabaseAdmin
          .from('notifications')
          .insert(testNotification);

        if (testError) {
          console.error('❌ Error creating test notification:', testError);
        } else {
          console.log('✅ Notifications table accessible');
        }
      } else {
        console.log('✅ Data column added successfully');
      }
    } else if (alterError) {
      console.error('❌ Error checking notifications table:', alterError);
    } else {
      console.log('✅ Notifications table accessible');
    }

    // 2. Test creating a notification with data
    console.log('\n2️⃣ TESTING NOTIFICATION WITH DATA...');
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'test',
      data: { test: true, timestamp: new Date().toISOString() }
    };

    const { data: testResult, error: testError } = await supabaseAdmin
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (testError) {
      console.error('❌ Error creating test notification with data:', testError);
      
      // Try without data column
      console.log('🔄 Trying without data column...');
      const simpleNotification = {
        user_id: '00000000-0000-0000-0000-000000000000',
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'test'
      };

      const { data: simpleResult, error: simpleError } = await supabaseAdmin
        .from('notifications')
        .insert(simpleNotification)
        .select()
        .single();

      if (simpleError) {
        console.error('❌ Error creating simple notification:', simpleError);
      } else {
        console.log('✅ Simple notification created successfully');
        console.log('⚠️ Data column is missing - this will cause utility bill creation to fail');
      }
    } else {
      console.log('✅ Test notification with data created successfully:', testResult);
      
      // Clean up test notification
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testResult.id);
      console.log('🧹 Test notification cleaned up');
    }

    console.log('\n🎉 NOTIFICATIONS CHECK COMPLETE!');
    console.log('================================\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixNotificationsSimple();
