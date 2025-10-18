#!/usr/bin/env node

/**
 * Import n8n Workflows Script
 * This script imports all workflow files directly into n8n using the API
 */

import fs from 'fs';
import path from 'path';

const N8N_BASE_URL = 'http://localhost:5678';
const N8N_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';

const workflowFiles = [
  'n8n-workflows/rent-reminder-automation.json',
  'n8n-workflows/mpesa-payment-processing.json',
  'n8n-workflows/utility-billing-automation.json',
  'n8n-workflows/maintenance-request-automation.json',
  'n8n-workflows/tenant-onboarding-automation.json'
];

console.log('🚀 Importing n8n Workflows via API...');
console.log('=====================================\n');

async function importWorkflow(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Prepare the workflow for import (n8n expects the full workflow object)
    const importData = {
      ...workflowData,
      active: false // Import as inactive initially
    };

    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(importData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Imported: ${workflowData.name} (ID: ${result.id})`);
      return { success: true, id: result.id, name: workflowData.name };
    } else {
      const error = await response.text();
      console.log(`❌ Failed to import ${workflowData.name}: ${response.status} - ${error}`);
      return { success: false, error: error };
    }
  } catch (error) {
    console.log(`❌ Error importing ${filePath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function listExistingWorkflows() {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_TOKEN
      }
    });

    if (response.ok) {
      const data = await response.json();
      const workflows = data.data || data;
      if (Array.isArray(workflows)) {
        console.log(`📋 Found ${workflows.length} existing workflows:`);
        workflows.forEach(wf => {
          console.log(`   - ${wf.name} (ID: ${wf.id}, Active: ${wf.active})`);
        });
        return workflows;
      } else {
        console.log(`📋 Found 0 existing workflows`);
        return [];
      }
    } else {
      console.log(`❌ Failed to list workflows: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Error listing workflows: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🔍 Checking existing workflows...\n');
  await listExistingWorkflows();
  
  console.log('\n📥 Importing new workflows...\n');
  
  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const filePath of workflowFiles) {
    const result = await importWorkflow(filePath);
    results.push({ file: filePath, ...result });
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay between imports
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Import Summary:');
  console.log('==================');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Total: ${workflowFiles.length}`);

  if (successCount > 0) {
    console.log('\n🎉 Workflows imported successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open n8n at http://localhost:5678');
    console.log('2. Go to Workflows section');
    console.log('3. Configure Daraja API credentials');
    console.log('4. Test each workflow');
    console.log('5. Activate workflows when ready');
    
    console.log('\n🔗 Webhook URLs:');
    console.log('- M-Pesa Callback: http://localhost:5678/webhook/mpesa-callback');
    console.log('- Maintenance Request: http://localhost:5678/webhook/maintenance-request');
    console.log('- Tenant Onboarding: http://localhost:5678/webhook/tenant-onboarding');
  }

  if (failCount > 0) {
    console.log('\n⚠️  Some workflows failed to import. Check the errors above.');
  }
}

main().catch(console.error);
