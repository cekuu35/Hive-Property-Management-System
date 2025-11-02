#!/usr/bin/env node

/**
 * Test Supabase Connection
 * 
 * Quick script to verify Supabase connectivity and show a summary
 * of your database schema.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Known tables from your schema
const TABLES = [
  'contractors', 'expenses', 'inventory', 'leases', 'maintenance_requests',
  'messages', 'notifications', 'payments', 'profiles', 'properties',
  'property_notices', 'rent_payments', 'security_logs', 'tenant_info',
  'tenants', 'unit_applications', 'units', 'visitor_requests', 'visitors'
];

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  console.log(`URL: ${SUPABASE_URL}\n`);
  
  const results = {
    connected: false,
    accessibleTables: [],
    inaccessibleTables: [],
    totalRows: 0
  };
  
  // Test each table
  for (const tableName of TABLES) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results.inaccessibleTables.push({ table: tableName, error: error.message });
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        results.accessibleTables.push({ table: tableName, rows: count });
        results.totalRows += count || 0;
        console.log(`✅ ${tableName}: ${count || 0} rows`);
      }
    } catch (err) {
      results.inaccessibleTables.push({ table: tableName, error: err.message });
      console.log(`❌ ${tableName}: ${err.message}`);
    }
  }
  
  // Try calling a database function
  console.log('\n🧪 Testing database functions...\n');
  
  try {
    const { data: profileId, error } = await supabase.rpc('current_user_profile_id');
    if (!error) {
      console.log('✅ current_user_profile_id: Working');
    } else {
      console.log('⚠️  current_user_profile_id: Requires auth context');
    }
  } catch (err) {
    console.log('⚠️  current_user_profile_id: Requires auth context');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Connection Summary');
  console.log('='.repeat(60));
  console.log(`✅ Accessible Tables: ${results.accessibleTables.length}/${TABLES.length}`);
  console.log(`❌ Inaccessible Tables: ${results.inaccessibleTables.length}`);
  console.log(`📈 Total Rows: ${results.totalRows}`);
  
  if (results.accessibleTables.length > 0) {
    results.connected = true;
    console.log('\n🎉 Connection successful!');
    console.log('\nTop tables by size:');
    results.accessibleTables
      .sort((a, b) => b.rows - a.rows)
      .slice(0, 5)
      .forEach(({ table, rows }) => {
        console.log(`  - ${table}: ${rows} rows`);
      });
  } else {
    console.log('\n⚠️  No tables accessible. Check credentials.');
  }
  
  return results;
}

// Run the test
testConnection().catch(console.error);
