#!/usr/bin/env node

/**
 * Verify n8n Workflow Credentials Script
 * This script checks that all workflows are using the correct Supabase service role key
 */

import fs from 'fs';

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';
const OLD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M';

console.log('🔍 Verifying n8n Workflow Credentials...');
console.log('=======================================\n');

const workflowFiles = [
  'n8n-workflows/rent-reminder-automation.json',
  'n8n-workflows/mpesa-payment-processing.json',
  'n8n-workflows/utility-billing-automation.json',
  'n8n-workflows/maintenance-request-automation.json',
  'n8n-workflows/tenant-onboarding-automation.json'
];

let allCorrect = true;
let totalServiceKeyCount = 0;
let totalAnonKeyCount = 0;

workflowFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Count service role key occurrences
      const serviceKeyMatches = content.match(new RegExp(SUPABASE_SERVICE_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      const serviceKeyCount = serviceKeyMatches ? serviceKeyMatches.length : 0;
      
      // Count anon key occurrences
      const anonKeyMatches = content.match(new RegExp(OLD_ANON_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      const anonKeyCount = anonKeyMatches ? anonKeyMatches.length : 0;
      
      totalServiceKeyCount += serviceKeyCount;
      totalAnonKeyCount += anonKeyCount;
      
      if (anonKeyCount > 0) {
        console.log(`❌ ${filePath}: Still contains ${anonKeyCount} anon key references`);
        allCorrect = false;
      } else {
        console.log(`✅ ${filePath}: ${serviceKeyCount} service role key references (correct)`);
      }
    } else {
      console.log(`❌ File not found: ${filePath}`);
      allCorrect = false;
    }
  } catch (error) {
    console.log(`❌ Error checking ${filePath}: ${error.message}`);
    allCorrect = false;
  }
});

console.log('\n📊 Summary:');
console.log('===========');
console.log(`Service Role Key references: ${totalServiceKeyCount}`);
console.log(`Anon Key references: ${totalAnonKeyCount}`);
console.log(`All workflows correct: ${allCorrect ? '✅ YES' : '❌ NO'}`);

if (allCorrect) {
  console.log('\n🎉 All workflows are using the correct Supabase service role key!');
  console.log('\n📋 Ready for n8n import:');
  console.log('1. Open http://localhost:5678');
  console.log('2. Import the workflow files from n8n-workflows/ folder');
  console.log('3. Configure Daraja API credentials');
  console.log('4. Test and activate workflows');
} else {
  console.log('\n⚠️  Some workflows still need updating. Please run the update script again.');
}



