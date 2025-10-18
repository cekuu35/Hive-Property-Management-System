#!/usr/bin/env node

/**
 * Fix Workflows Database Structure Script
 * This script updates all workflows to use the correct database structure
 */

import fs from 'fs';

console.log('🔧 Fixing Workflows Database Structure...');
console.log('=========================================\n');

const workflowFiles = [
  'n8n-workflows/rent-reminder-automation.json',
  'n8n-workflows/mpesa-payment-processing.json',
  'n8n-workflows/utility-billing-automation.json',
  'n8n-workflows/maintenance-request-automation.json',
  'n8n-workflows/tenant-onboarding-automation.json'
];

function fixWorkflow(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;

    // Fix tenant queries to use correct structure
    const oldTenantQuery = /"url":\s*"https:\/\/kozhlejudselgtmohdfm\.supabase\.co\/rest\/v1\/tenants\?select=\*,properties\(\*\)"/g;
    const newTenantQuery = '"url": "https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)"';
    
    if (content.match(oldTenantQuery)) {
      content = content.replace(oldTenantQuery, newTenantQuery);
      changes++;
      console.log(`  ✅ Fixed tenant query in ${filePath}`);
    }

    // Fix tenant queries with status filter
    const oldTenantQueryWithStatus = /"url":\s*"https:\/\/kozhlejudselgtmohdfm\.supabase\.co\/rest\/v1\/tenants\?select=\*,properties\(\*\)&status=eq\.active"/g;
    const newTenantQueryWithStatus = '"url": "https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&status=eq.active"';
    
    if (content.match(oldTenantQueryWithStatus)) {
      content = content.replace(oldTenantQueryWithStatus, newTenantQueryWithStatus);
      changes++;
      console.log(`  ✅ Fixed tenant query with status in ${filePath}`);
    }

    // Fix field references
    const fieldMappings = [
      { from: '={{$json.name}}', to: '={{$json.tenant_info.full_name}}' },
      { from: '={{$json.properties.address}}', to: '={{$json.units.properties.address}}' },
      { from: '={{$json.phone_number}}', to: '={{$json.tenant_info.phone}}' },
      { from: '={{$json.email}}', to: '={{$json.tenant_info.email}}' },
      { from: '={{$json.property_id}}', to: '={{$json.units.property_id}}' }
    ];

    fieldMappings.forEach(mapping => {
      if (content.includes(mapping.from)) {
        content = content.replace(new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), mapping.to);
        changes++;
      }
    });

    if (changes > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath} (${changes} changes)`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

let totalFiles = 0;
let totalChanges = 0;

workflowFiles.forEach(filePath => {
  const result = fixWorkflow(filePath);
  if (result) {
    totalFiles++;
    totalChanges++;
  }
});

console.log('\n📊 Summary:');
console.log('===========');
console.log(`Files updated: ${totalFiles}/${workflowFiles.length}`);
console.log(`Total changes: ${totalChanges}`);

if (totalFiles > 0) {
  console.log('\n🎉 Database structure fixes applied!');
  console.log('\n📋 Updated field mappings:');
  console.log('- tenant_name: $json.tenant_info.full_name');
  console.log('- property_address: $json.units.properties.address');
  console.log('- phone_number: $json.tenant_info.phone');
  console.log('- email: $json.tenant_info.email');
  console.log('- property_id: $json.units.property_id');
  console.log('\n🔗 All workflows now use the correct database structure!');
} else {
  console.log('\n⚠️  No workflows needed updating.');
}



