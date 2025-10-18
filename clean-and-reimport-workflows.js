#!/usr/bin/env node

/**
 * Clean and Reimport Workflows Script
 * This script helps you clean up existing workflows and reimport them properly
 */

const N8N_BASE_URL = 'http://localhost:5678';
const N8N_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NjAxNzUxYS0zM2M3LTRhYjctYTQxOS02NzNiYTZlMzY5MzYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwNjA3MzYzfQ.RElb8K3NIeuppRGBgtF0nWAaG5_BRak8aIId5cpapG0';

console.log('🧹 Cleaning and Reimporting n8n Workflows...');
console.log('============================================\n');

async function listWorkflows() {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_TOKEN
      }
    });

    if (response.ok) {
      const data = await response.json();
      const workflows = data.data || data;
      return Array.isArray(workflows) ? workflows : [];
    } else {
      console.log(`❌ Failed to list workflows: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Error listing workflows: ${error.message}`);
    return [];
  }
}

async function deleteWorkflow(workflowId) {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': N8N_API_TOKEN
      }
    });

    if (response.ok) {
      return true;
    } else {
      console.log(`❌ Failed to delete workflow ${workflowId}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error deleting workflow ${workflowId}: ${error.message}`);
    return false;
  }
}

async function importWorkflow(workflowData) {
  try {
    const response = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...workflowData,
        active: false // Import as inactive initially
      })
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, id: result.id, name: workflowData.name };
    } else {
      const error = await response.text();
      return { success: false, error: error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  // Step 1: List existing workflows
  console.log('📋 Listing existing workflows...');
  const existingWorkflows = await listWorkflows();
  
  if (existingWorkflows.length > 0) {
    console.log(`Found ${existingWorkflows.length} existing workflows:`);
    existingWorkflows.forEach(wf => {
      console.log(`  - ${wf.name} (ID: ${wf.id}, Active: ${wf.active})`);
    });
    
    console.log('\n🗑️  Deleting existing workflows...');
    let deletedCount = 0;
    for (const workflow of existingWorkflows) {
      if (await deleteWorkflow(workflow.id)) {
        console.log(`✅ Deleted: ${workflow.name}`);
        deletedCount++;
      }
    }
    console.log(`\n📊 Deleted ${deletedCount}/${existingWorkflows.length} workflows`);
  } else {
    console.log('ℹ️  No existing workflows found');
  }

  // Step 2: Import fresh workflows
  console.log('\n📥 Importing fresh workflows...');
  
  const workflowFiles = [
    'n8n-workflows/rent-reminder-automation.json',
    'n8n-workflows/mpesa-payment-processing.json',
    'n8n-workflows/utility-billing-automation.json',
    'n8n-workflows/maintenance-request-automation.json',
    'n8n-workflows/tenant-onboarding-automation.json'
  ];

  let importedCount = 0;
  const results = [];

  for (const filePath of workflowFiles) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(filePath)) {
        const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const result = await importWorkflow(workflowData);
        results.push({ file: filePath, ...result });
        
        if (result.success) {
          console.log(`✅ Imported: ${workflowData.name} (ID: ${result.id})`);
          importedCount++;
        } else {
          console.log(`❌ Failed to import ${workflowData.name}: ${result.error}`);
        }
      } else {
        console.log(`❌ File not found: ${filePath}`);
        results.push({ file: filePath, success: false, error: 'File not found' });
      }
    } catch (error) {
      console.log(`❌ Error importing ${filePath}: ${error.message}`);
      results.push({ file: filePath, success: false, error: error.message });
    }
    
    // Small delay between imports
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 3: Summary
  console.log('\n📊 Import Summary:');
  console.log('==================');
  console.log(`✅ Successfully imported: ${importedCount}/${workflowFiles.length}`);
  console.log(`❌ Failed: ${workflowFiles.length - importedCount}`);

  if (importedCount > 0) {
    console.log('\n🎉 Workflows imported successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open n8n at http://localhost:5678');
    console.log('2. Go to Workflows section');
    console.log('3. Activate the workflows you want to use');
    console.log('4. Test each workflow with "Execute Workflow" button');
    console.log('5. Configure Daraja API credentials for M-Pesa functionality');
    
    console.log('\n🔗 Webhook URLs:');
    console.log('- M-Pesa Callback: http://localhost:5678/webhook/mpesa-callback');
    console.log('- Maintenance Request: http://localhost:5678/webhook/maintenance-request');
    console.log('- Tenant Onboarding: http://localhost:5678/webhook/tenant-onboarding');
  }

  if (importedCount < workflowFiles.length) {
    console.log('\n⚠️  Some workflows failed to import. Check the errors above.');
  }
}

main().catch(console.error);



