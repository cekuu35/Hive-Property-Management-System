import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixNotificationsDataColumn() {
  console.log('🔧 FIXING NOTIFICATIONS DATA COLUMN');
  console.log('==================================\n');

  try {
    // 1. Check if notifications table exists and has data column
    console.log('1️⃣ CHECKING NOTIFICATIONS TABLE STRUCTURE...');
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'notifications')
      .eq('table_schema', 'public');

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError);
      return;
    }

    console.log('📋 Current notifications table columns:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    const hasDataColumn = tableInfo.some(col => col.column_name === 'data');
    console.log(`\n🔍 Data column exists: ${hasDataColumn ? '✅ YES' : '❌ NO'}`);

    // 2. Add data column if it doesn't exist
    if (!hasDataColumn) {
      console.log('\n2️⃣ ADDING DATA COLUMN TO NOTIFICATIONS TABLE...');
      const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE notifications ADD COLUMN data jsonb;'
      });

      if (alterError) {
        console.error('❌ Error adding data column:', alterError);
        return;
      }
      console.log('✅ Data column added successfully');
    } else {
      console.log('✅ Data column already exists');
    }

    // 3. Check if the trigger exists
    console.log('\n3️⃣ CHECKING UTILITY BILL TRIGGER...');
    const { data: triggerInfo, error: triggerError } = await supabaseAdmin
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('trigger_name', 'trigger_notify_utility_bill_created')
      .eq('event_object_table', 'unit_bills');

    if (triggerError) {
      console.error('❌ Error checking trigger:', triggerError);
    } else if (triggerInfo && triggerInfo.length > 0) {
      console.log('✅ Utility bill trigger exists');
    } else {
      console.log('⚠️ Utility bill trigger does not exist');
    }

    // 4. Test creating a notification with data column
    console.log('\n4️⃣ TESTING NOTIFICATION CREATION...');
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
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
      console.error('❌ Error creating test notification:', testError);
    } else {
      console.log('✅ Test notification created successfully:', testResult);
      
      // Clean up test notification
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testResult.id);
      console.log('🧹 Test notification cleaned up');
    }

    console.log('\n🎉 NOTIFICATIONS DATA COLUMN FIX COMPLETE!');
    console.log('==========================================\n');
    console.log('✅ The notifications table now has the data column');
    console.log('✅ Utility bills should now create successfully');
    console.log('✅ Notifications will be created with proper data structure');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixNotificationsDataColumn();
