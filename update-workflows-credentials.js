#!/usr/bin/env node

/**
 * Update n8n Workflow Credentials Script
 * This script updates all workflow files with the correct Supabase service role key
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M';

console.log('🔄 Updating n8n Workflow Credentials...');
console.log('=====================================\n');

// List of workflow files to update
const workflowFiles = [
  'n8n-workflows/rent-reminder-automation.json',
  'n8n-workflows/mpesa-payment-processing.json',
  'n8n-workflows/utility-billing-automation.json',
  'n8n-workflows/maintenance-request-automation.json',
  'n8n-workflows/tenant-onboarding-automation.json'
];

let updatedFiles = 0;
let totalReplacements = 0;

workflowFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileReplacements = 0;
      
      // Replace Authorization header values
      const authPattern = /"Authorization",\s*"value":\s*"Bearer [^"]+"/g;
      const authMatches = content.match(authPattern);
      if (authMatches) {
        content = content.replace(authPattern, `"Authorization", "value": "Bearer ${SUPABASE_SERVICE_KEY}"`);
        fileReplacements += authMatches.length;
      }
      
      // Replace apikey values
      const apikeyPattern = /"apikey":\s*"[^"]+"/g;
      const apikeyMatches = content.match(apikeyPattern);
      if (apikeyMatches) {
        content = content.replace(apikeyPattern, `"apikey": "${SUPABASE_SERVICE_KEY}"`);
        fileReplacements += apikeyMatches.length;
      }
      
      if (fileReplacements > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${filePath} (${fileReplacements} replacements)`);
        updatedFiles++;
        totalReplacements += fileReplacements;
      } else {
        console.log(`ℹ️  No updates needed for ${filePath}`);
      }
    } else {
      console.log(`❌ File not found: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Error updating ${filePath}: ${error.message}`);
  }
});

console.log('\n📊 Summary:');
console.log('===========');
console.log(`Files updated: ${updatedFiles}/${workflowFiles.length}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('\n🎉 Credential update complete!');
console.log('\n📋 Next Steps:');
console.log('1. Import the updated workflows into n8n');
console.log('2. Test the Supabase connections');
console.log('3. Activate the workflows');
console.log('\n🔗 Access n8n at: http://localhost:5678');



