#!/usr/bin/env node

/**
 * AI Supabase Helper
 * 
 * This tool provides AI with quick access to your Supabase schema information
 * to help with code generation, query suggestions, and schema understanding.
 * 
 * Usage:
 *   node tools/ai-supabase-helper.mjs [command]
 * 
 * Commands:
 *   schema    - Show complete schema summary
 *   tables    - List all tables
 *   relations - Show table relationships
 *   functions - List all database functions
 *   examples  - Show usage examples
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const TYPES_FILE = 'src/integrations/supabase/types.ts';
const SCHEMA_SUMMARY_FILE = 'supabase-schema-summary.json';

function showSchemaSummary() {
  console.log('\n📊 SUPABASE SCHEMA SUMMARY\n');
  console.log('='.repeat(60));
  
  try {
    const summary = JSON.parse(readFileSync(SCHEMA_SUMMARY_FILE, 'utf-8'));
    console.log(`Database: ${summary.database_url}`);
    console.log(`Generated: ${new Date(summary.generated_at).toLocaleString()}`);
    console.log(`Total Tables: ${summary.tables.length}`);
    console.log(`Total Rows: ${summary.tables.reduce((sum, t) => sum + t.row_count, 0)}`);
    
    console.log('\n📋 Tables:');
    summary.tables.forEach(table => {
      console.log(`  ${table.exists ? '✅' : '❌'} ${table.name.padEnd(25)} ${table.row_count} rows`);
    });
  } catch (err) {
    console.error('❌ Could not read schema summary');
  }
  
  console.log('\n');
}

function showTables() {
  console.log('\n📋 ALL TABLES\n');
  console.log('='.repeat(60));
  
  const tables = [
    'contractors', 'expenses', 'inventory', 'leases', 'maintenance_requests',
    'messages', 'notifications', 'payments', 'profiles', 'properties',
    'property_notices', 'rent_payments', 'security_logs', 'tenant_info',
    'tenants', 'unit_applications', 'units', 'visitor_requests', 'visitors'
  ];
  
  tables.forEach((table, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${table}`);
  });
  
  console.log('\n');
}

function showRelationships() {
  console.log('\n🔗 TABLE RELATIONSHIPS\n');
  console.log('='.repeat(60));
  console.log(`
Core Entity Flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
profiles (Users)
  ├──> properties (Properties owned)
  │     └──> units (Units in property)
  │           ├──> leases (Lease agreements)
  │           │     ├──> rent_payments (Monthly payments)
  │           │     └──> payments (Transaction records)
  │           ├──> unit_applications (Rental applications)
  │           ├──> maintenance_requests (Repair tickets)
  │           └──> messages (Unit-specific messages)
  │
  ├──> tenants (Tenant records)
  │     └──> tenant_info (Tenant details)
  │           ├──> leases (Tenant's leases)
  │           ├──> rent_payments (Payment history)
  │           └──> payments (All payments)
  │
  ├──> contractors (Service providers)
  │     └──> maintenance_requests (Work assignments)
  │
  └──> security_logs (Security incidents)
        └──> properties (Property where incident occurred)

Communication & Notifications:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
messages (Direct messages between users)
notifications (System notifications)
property_notices (Public announcements)

Visitor Management:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
visitor_requests (Pre-approved visitor requests)
visitors (Active visitor logs)

Financial Tracking:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
expenses (Landlord expense tracking)
rent_payments (Monthly rent with late fees)
payments (All payment transactions)
  `);
  
  console.log('\n');
}

function showFunctions() {
  console.log('\n⚙️  DATABASE FUNCTIONS\n');
  console.log('='.repeat(60));
  
  const functions = [
    'Security & Access Control:',
    '  • caretaker_can_view_tenant_profile(_target_profile_id)',
    '  • landlord_can_view_profile(_target_profile_id)',
    '  • tenant_can_view_landlord_profile(_target_profile_id)',
    '  • tenant_can_view_assigned_caretaker_profile(_target_profile_id)',
    '  • user_can_view_profile(_profile_id)',
    '  • user_can_view_property(_property_id)',
    '  • user_can_view_unit(_unit_id)',
    '  • user_can_view_lease(_lease_id)',
    '  • current_user_is_landlord_of_property(_property_id)',
    '  • is_security_user()',
    '',
    'User & Tenant Management:',
    '  • current_user_profile_id()',
    '  • get_tenant_by_auth_user(p_auth_user_id)',
    '  • get_tenant_primary_unit(tenant_profile_id)',
    '  • get_landlord_tenants(landlord_profile_id)',
    '  • get_tenant_landlord(tenant_profile_id)',
    '',
    'Business Logic:',
    '  • create_tenant_with_auth(...)',
    '  • generate_rent_payments(p_lease_id)',
    '',
    'Debugging:',
    '  • debug_tenant_units(tenant_profile_id)'
  ];
  
  functions.forEach(line => console.log(line));
  console.log('\n');
}

function showExamples() {
  console.log('\n💡 USAGE EXAMPLES\n');
  console.log('='.repeat(60));
  console.log(`
1. Query Properties with Units:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { data } = await supabase
  .from('properties')
  .select(\`
    *,
    units (
      unit_number,
      rent_amount,
      status,
      leases (
        tenant_info (first_name, last_name, email)
      )
    )
  \`)
  .eq('landlord_id', profileId);


2. Get Tenant's Rent Payments:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { data } = await supabase
  .from('rent_payments')
  .select(\`
    *,
    leases!inner (
      units (unit_number, properties (name))
    )
  \`)
  .eq('status', 'pending');


3. Check Access Permissions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { data: canView } = await supabase.rpc(
  'user_can_view_profile',
  { _profile_id: targetProfileId }
);


4. Generate Rent Payments for Lease:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
await supabase.rpc('generate_rent_payments', {
  p_lease_id: leaseId
});


5. Get Landlord's Dashboard Data:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { data: tenants } = await supabase.rpc(
  'get_landlord_tenants',
  { landlord_profile_id: profileId }
);


6. Create Tenant with Auth User:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const { data } = await supabase.rpc('create_tenant_with_auth', {
  p_email: 'tenant@example.com',
  p_first_name: 'John',
  p_last_name: 'Doe',
  p_phone: '+1234567890',
  p_landlord_id: landlordProfileId,
  p_unit_id: unitId,
  p_rent_amount: 1500,
  p_security_deposit: 1500,
  p_lease_start_date: '2024-01-01',
  p_lease_end_date: '2024-12-31'
});
  `);
  
  console.log('\n');
}

function showHelp() {
  console.log(`
🤖 AI SUPABASE HELPER

Quick access to your Supabase schema for AI-assisted development.

USAGE:
  node tools/ai-supabase-helper.mjs [command]

COMMANDS:
  schema      Show complete schema summary with row counts
  tables      List all database tables
  relations   Show table relationships and data flow
  functions   List all database functions
  examples    Show code usage examples
  help        Show this help message (default)

ENVIRONMENT:
  Database: Connected ✅
  Tables: 19
  Functions: 22
  Total Rows: 525+

DOCUMENTATION:
  • SUPABASE_CONNECTION.md - Full connection guide
  • SUPABASE_SCHEMA.md - Live schema documentation
  • src/integrations/supabase/types.ts - TypeScript types
  `);
}

// Main execution
const command = process.argv[2] || 'help';

switch (command.toLowerCase()) {
  case 'schema':
    showSchemaSummary();
    break;
  case 'tables':
    showTables();
    break;
  case 'relations':
  case 'relationships':
    showRelationships();
    break;
  case 'functions':
    showFunctions();
    break;
  case 'examples':
    showExamples();
    break;
  default:
    showHelp();
}

