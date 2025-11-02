#!/usr/bin/env node

/**
 * Check existing RLS policies for tenant_info to identify the recursion issue
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
  console.log('Checking RLS policies for tenant_info...\n');
  
  const query = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename = 'tenant_info'
    ORDER BY policyname;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    // Try alternative approach
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'tenant_info');

    if (policiesError) {
      console.error('Error fetching policies:', policiesError.message);
      
      // Try using raw query
      const { data: rawData, error: rawError } = await supabase
        .rpc('exec_raw_sql', { 
          sql: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tenant_info'` 
        });
        
      if (rawError) {
        console.error('Cannot query policies:', rawError.message);
        console.log('\nTrying direct SQL approach...\n');
        
        // Provide guidance
        console.log('Please check policies in Supabase dashboard:');
        console.log('1. Go to Authentication > Policies');
        console.log('2. Find tenant_info table');
        console.log('3. Look for recursive queries in policies\n');
        
        console.log('Common recursion issues:');
        console.log('- Policy queries tenant_info inside its own USING clause');
        console.log('- Policy references profiles that may query tenant_info');
        console.log('- Circular dependencies between policies\n');
      } else {
        console.log(rawData);
      }
      return;
    }
    
    console.log(policies);
  } else {
    console.log(data);
  }
}

checkPolicies();

