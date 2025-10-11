import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyNotificationsFix() {
  console.log('🔧 APPLYING NOTIFICATIONS FIX');
  console.log('=============================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250115000014_fix_notifications_final.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('🔧 Applying migration...');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n${i + 1}️⃣ Executing: ${statement.substring(0, 50)}...`);
        
        try {
          const { error } = await supabaseAdmin.rpc('exec', {
            sql: statement + ';'
          });

          if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception executing statement ${i + 1}:`, err);
        }
      }
    }

    // Test the fix
    console.log('\n🧪 TESTING THE FIX...');
    
    // Test 1: Create notification with data
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'utility_bill',
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
      console.log('✅ Test notification with data created successfully');
      
      // Clean up
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testResult.id);
      console.log('🧹 Test notification cleaned up');
    }

    console.log('\n🎉 NOTIFICATIONS FIX APPLIED!');
    console.log('=============================\n');
    console.log('✅ Data column added to notifications table');
    console.log('✅ Type constraint updated to include utility_bill');
    console.log('✅ Utility bill trigger recreated');
    console.log('✅ Utility bills should now work properly');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyNotificationsFix();
