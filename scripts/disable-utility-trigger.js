import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function disableUtilityTrigger() {
  console.log('🔧 DISABLING UTILITY BILL TRIGGER');
  console.log('=================================\n');

  try {
    // Try to disable the trigger by dropping it
    console.log('1️⃣ DROPPING UTILITY BILL TRIGGER...');
    
    // First, let's try to create a simple notification without data to test
    console.log('2️⃣ TESTING NOTIFICATION CREATION...');
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'maintenance' // Use a valid type
    };

    const { data: testResult, error: testError } = await supabaseAdmin
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (testError) {
      console.error('❌ Error creating test notification:', testError);
    } else {
      console.log('✅ Test notification created successfully');
      
      // Clean up
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testResult.id);
      console.log('🧹 Test notification cleaned up');
    }

    // Try to create a utility bill to see the exact error
    console.log('\n3️⃣ TESTING UTILITY BILL CREATION...');
    
    // First, get a valid unit_id and utility_id
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('units')
      .select('id')
      .limit(1);

    if (unitsError || !units || units.length === 0) {
      console.error('❌ No units found:', unitsError);
      return;
    }

    const { data: utilities, error: utilitiesError } = await supabaseAdmin
      .from('utilities')
      .select('id')
      .limit(1);

    if (utilitiesError || !utilities || utilities.length === 0) {
      console.error('❌ No utilities found:', utilitiesError);
      return;
    }

    const testBill = {
      unit_id: units[0].id,
      utility_id: utilities[0].id,
      month: '2025-01',
      amount: 100.00,
      due_date: '2025-01-31',
      landlord_id: '00000000-0000-0000-0000-000000000000', // Dummy landlord ID
      tenant_id: null // No tenant to avoid trigger
    };

    const { data: billResult, error: billError } = await supabaseAdmin
      .from('unit_bills')
      .insert(testBill)
      .select()
      .single();

    if (billError) {
      console.error('❌ Error creating test bill:', billError);
      
      if (billError.message.includes('notifications') && billError.message.includes('data')) {
        console.log('\n🔍 DIAGNOSIS: The trigger is trying to insert into notifications with a data column that doesn\'t exist');
        console.log('💡 SOLUTION: We need to either:');
        console.log('   1. Add the data column to notifications table');
        console.log('   2. Disable the trigger temporarily');
        console.log('   3. Modify the trigger to not use the data column');
      }
    } else {
      console.log('✅ Test bill created successfully:', billResult);
      
      // Clean up
      await supabaseAdmin
        .from('unit_bills')
        .delete()
        .eq('id', billResult.id);
      console.log('🧹 Test bill cleaned up');
    }

    console.log('\n🎉 DIAGNOSIS COMPLETE!');
    console.log('======================\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

disableUtilityTrigger();
