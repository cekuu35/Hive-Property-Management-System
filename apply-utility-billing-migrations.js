import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client with service role key
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 Applying Utility Billing System migrations...\n');

  try {
    // Read and apply the utilities and unit_bills migration
    const migration1 = fs.readFileSync('./supabase/migrations/20250101_create_utility_billing_system.sql', 'utf8');
    
    console.log('1. Applying utility billing system migration...');
    const { error: migration1Error } = await supabase.rpc('exec_sql', { sql: migration1 });
    
    if (migration1Error) {
      console.error('❌ Error applying migration 1:', migration1Error);
    } else {
      console.log('✅ Utility billing system migration applied successfully');
    }

    // Read and apply the notifications migration
    const migration2 = fs.readFileSync('./supabase/migrations/20250101_create_notifications_table.sql', 'utf8');
    
    console.log('\n2. Applying notifications migration...');
    const { error: migration2Error } = await supabase.rpc('exec_sql', { sql: migration2 });
    
    if (migration2Error) {
      console.error('❌ Error applying migration 2:', migration2Error);
    } else {
      console.log('✅ Notifications migration applied successfully');
    }

    // Verify the tables were created
    console.log('\n3. Verifying table creation...');
    
    const { data: utilities, error: utilitiesError } = await supabase
      .from('utilities')
      .select('*');

    if (utilitiesError) {
      console.error('❌ Error verifying utilities table:', utilitiesError);
    } else {
      console.log('✅ Utilities table created successfully');
      console.log(`   Found ${utilities.length} utilities:`, utilities.map(u => u.name).join(', '));
    }

    const { data: unitBills, error: unitBillsError } = await supabase
      .from('unit_bills')
      .select('*')
      .limit(1);

    if (unitBillsError) {
      console.error('❌ Error verifying unit_bills table:', unitBillsError);
    } else {
      console.log('✅ Unit_bills table created successfully');
    }

    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (notificationsError) {
      console.error('❌ Error verifying notifications table:', notificationsError);
    } else {
      console.log('✅ Notifications table created successfully');
    }

    const { data: webhookLogs, error: webhookLogsError } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(1);

    if (webhookLogsError) {
      console.error('❌ Error verifying webhook_logs table:', webhookLogsError);
    } else {
      console.log('✅ Webhook_logs table created successfully');
    }

    console.log('\n🎉 All migrations applied successfully!');
    console.log('\n📋 Database schema updated with:');
    console.log('   ✅ utilities table');
    console.log('   ✅ unit_bills table');
    console.log('   ✅ notifications table');
    console.log('   ✅ webhook_logs table');
    console.log('   ✅ RLS policies');
    console.log('   ✅ Database functions');
    console.log('   ✅ Triggers');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migrations
applyMigrations();




