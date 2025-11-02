#!/usr/bin/env node

/**
 * Apply the tenant_info RLS recursion fix
 * This script applies the SQL migration directly via Supabase client
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

function log(emoji, message, color = 'reset') {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

async function applyFix() {
  log('🚀', 'Applying tenant_info RLS recursion fix...', 'cyan');
  
  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20250102000001_fix_tenant_info_recursion.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    log('📄', 'Read migration file', 'blue');
    
    // We can't execute raw SQL via PostgREST, so we need to use the Supabase REST API
    // or apply via edge function
    log('⚠️', 'Cannot apply SQL directly via client', 'yellow');
    log('📋', 'Please apply the migration manually:', 'cyan');
    log('', '1. Go to: https://kozhlejudselgtmohdfm.supabase.co', 'blue');
    log('', '2. Navigate to SQL Editor', 'blue');
    log('', '3. Run the contents of:', 'blue');
    log('', `   ${migrationPath}`, 'yellow');
    
    // Alternatively, we can test if tenant_info works now
    log('\n🧪', 'Testing tenant_info query...', 'cyan');
    
    const { data, error } = await supabase
      .from('tenant_info')
      .select('id, email, first_name, last_name')
      .limit(1);
    
    if (error) {
      log('❌', `Error: ${error.message}`, 'red');
      log('', `Code: ${error.code}`, 'red');
      
      if (error.code === '42P17') {
        log('\n💡', 'Infinite recursion detected! Apply the migration to fix.', 'yellow');
      }
    } else {
      log('✅', 'Query successful!', 'green');
      log('📊', `Found ${data?.length || 0} records`, 'blue');
    }
    
  } catch (error) {
    log('❌', `Failed: ${error.message}`, 'red');
  }
}

applyFix();

