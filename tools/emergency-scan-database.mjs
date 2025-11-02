import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function scanDatabase() {
  console.log('🔍 Scanning database for current RLS policy state...\n');

  // Get all tables
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `
  });

  if (tablesError) {
    console.error('Error getting tables:', tablesError);
    return;
  }

  // For each table, get its policies
  const tablesToCheck = ['profiles', 'tenant_info', 'leases', 'units', 'rent_payments', 'properties', 'maintenance_requests', 'visitor_requests', 'visitors', 'staff_assignments'];
  
  for (const table of tablesToCheck) {
    console.log(`\n📋 Table: ${table}`);
    console.log('─'.repeat(50));
    
    const { data: policies, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = '${table}'
        ORDER BY policyname;
      `
    });

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    } else if (policies && policies.length > 0) {
      policies.forEach(p => {
        console.log(`   ✅ ${p.policyname}`);
        console.log(`      Command: ${p.cmd}`);
        if (p.qual) console.log(`      USING: ${p.qual.substring(0, 100)}...`);
        if (p.with_check) console.log(`      WITH CHECK: ${p.with_check.substring(0, 100)}...`);
      });
    } else {
      console.log(`   ❌ NO POLICIES (RLS enabled but no access!)`);
    }
  }

  // Check if current_user_profile_id function exists
  console.log('\n\n🔧 Helper Functions:');
  console.log('─'.repeat(50));
  
  const { data: funcs, error: funcError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT proname, prosecdef, proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname IN ('current_user_profile_id', 'get_profile_id_by_user');
    `
  });

  if (funcs && funcs.length > 0) {
    funcs.forEach(f => {
      console.log(`   ✅ ${f.proname}`);
      console.log(`      Security Definer: ${f.prosecdef}`);
    });
  } else {
    console.log('   ❌ Helper functions missing!');
  }
}

scanDatabase().catch(console.error);

