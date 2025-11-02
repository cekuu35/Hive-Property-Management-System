#!/usr/bin/env node

/**
 * Supabase Database Introspector
 * 
 * This tool connects to Supabase and introspects the database schema
 * to create a comprehensive documentation of tables, relationships, and functions.
 * Similar to how Lovable.dev works with Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase credentials
const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Get all tables from public schema
 */
async function getTables() {
  // Since we can't query information_schema directly via PostgREST,
  // we'll use the fallback method to query known tables
  return await getTablesViaMetadata();
}

/**
 * Get tables by querying PostgREST metadata
 */
async function getTablesViaMetadata() {
  // Query information_schema using a direct connection approach
  // Since we can't use information_schema directly via PostgREST,
  // we'll query known tables from our types file
  
  const knownTables = [
    'contractors', 'expenses', 'inventory', 'leases', 'maintenance_requests',
    'messages', 'notifications', 'payments', 'profiles', 'properties',
    'property_notices', 'rent_payments', 'security_logs', 'tenant_info',
    'tenants', 'unit_applications', 'units', 'visitor_requests', 'visitors'
  ];
  
  const tables = [];
  
  for (const tableName of knownTables) {
    try {
      // Try to query the table to verify it exists
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        tables.push({
          table_name: tableName,
          exists: true,
          row_count: count || 0
        });
      }
    } catch (err) {
      console.warn(`Warning: Could not access table ${tableName}`);
    }
  }
  
  return tables;
}

/**
 * Get relationships between tables
 */
async function getRelationships(tableName) {
  const query = `
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = '${tableName}';
  `;
  
  // We can't execute raw SQL through PostgREST
  // So we'll rely on the types.ts file which already has relationships
  return null;
}

/**
 * Get database functions
 */
async function getFunctions() {
  const query = `
    SELECT
      routine_name,
      routine_type,
      data_type AS return_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type IN ('FUNCTION', 'PROCEDURE')
    ORDER BY routine_name;
  `;
  
  // Can't execute raw SQL, but we have the functions in types.ts
  return null;
}

/**
 * Get table statistics
 */
async function getTableStats(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return {
      row_count: count || 0,
      exists: true
    };
  } catch (error) {
    return {
      row_count: 0,
      exists: false,
      error: error.message
    };
  }
}

/**
 * Generate comprehensive schema documentation
 */
async function generateSchemaDoc() {
  console.log('🔍 Introspecting Supabase database...\n');
  
  const tables = await getTables();
  
  console.log(`✅ Found ${tables.length} tables\n`);
  
  // Generate markdown documentation
  let doc = `# Supabase Database Schema Documentation\n\n`;
  doc += `**Generated:** ${new Date().toISOString()}\n\n`;
  doc += `**Database:** ${SUPABASE_URL}\n\n`;
  doc += `**Tables:** ${tables.length}\n\n`;
  doc += `---\n\n`;
  
  doc += `## Tables Overview\n\n`;
  
  for (const table of tables) {
    const stats = await getTableStats(table.table_name);
    doc += `### ${table.table_name}\n\n`;
    doc += `- **Rows:** ${stats.row_count}\n`;
    doc += `- **Status:** ${stats.exists ? '✅ Active' : '❌ Error'}\n\n`;
    
    if (stats.error) {
      doc += `> Error: ${stats.error}\n\n`;
    }
  }
  
  // Read our types.ts file to get detailed schema information
  const typesPath = path.join(process.cwd(), 'src/integrations/supabase/types.ts');
  
  if (fs.existsSync(typesPath)) {
    doc += `---\n\n`;
    doc += `## Detailed Schema Information\n\n`;
    doc += `Full schema information is available in \`src/integrations/supabase/types.ts\`. `;
    doc += `This file contains TypeScript types for all tables, relationships, and functions.\n\n`;
    
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    
    // Extract table information
    const tableRegex = /(\w+):\s*\{[\s\S]*?Relationships:\s*\[[\s\S]*?\]\s*\}/g;
    const tablesMatch = typesContent.match(/Tables:\s*\{[\s\S]*?Views:/);
    
    if (tablesMatch) {
      doc += `### Tables and Columns\n\n`;
      
      // List all table names from the file
      const tableNames = tables.map(t => t.table_name);
      tableNames.forEach(name => {
        doc += `- **${name}**: [View in types.ts](./src/integrations/supabase/types.ts)\n`;
      });
    }
  }
  
  // Save documentation
  const outputPath = path.join(process.cwd(), 'SUPABASE_SCHEMA.md');
  fs.writeFileSync(outputPath, doc);
  
  console.log(`✅ Schema documentation generated: ${outputPath}`);
  
  // Generate JSON summary
  const tableStats = [];
  for (const table of tables) {
    const stats = await getTableStats(table.table_name);
    tableStats.push({
      name: table.table_name,
      ...stats
    });
  }
  
  const summary = {
    generated_at: new Date().toISOString(),
    database_url: SUPABASE_URL,
    tables: tableStats
  };
  
  const summaryPath = path.join(process.cwd(), 'supabase-schema-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`✅ Schema summary generated: ${summaryPath}`);
  
  console.log('\n🎉 Supabase introspection complete!\n');
  
  return { doc, summary };
}

// Main execution
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
    import.meta.url.endsWith('supabase-introspector.mjs')) {
  generateSchemaDoc().catch(console.error);
}

export { generateSchemaDoc, getTables, getTableStats };
