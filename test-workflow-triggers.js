#!/usr/bin/env node

/**
 * Test Workflow Triggers Script
 * This script helps you test the n8n workflows by sending test data
 */

console.log('🧪 n8n Workflow Test Triggers');
console.log('=============================\n');

const N8N_BASE_URL = 'http://localhost:5678';

// Test data for different workflows
const testData = {
  mpesaCallback: {
    Body: {
      stkCallback: {
        MerchantRequestID: "test-merchant-123",
        CheckoutRequestID: "test-checkout-456",
        ResultCode: 0,
        ResultDesc: "Success",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 50000 },
            { Name: "MpesaReceiptNumber", Value: "test-receipt-789" },
            { Name: "TransactionDate", Value: "20250120120000" },
            { Name: "PhoneNumber", Value: "254768679899" }
          ]
        }
      }
    }
  },
  
  maintenanceRequest: {
    tenant_id: "fdc59a21-806f-4fdf-8399-f980038b3545",
    property_id: "83797eb2-dc1d-4a13-b524-16fb34cdf4d4",
    issue_type: "Plumbing",
    description: "Leaky faucet in kitchen sink",
    priority: "medium",
    urgency: "normal"
  },
  
  tenantOnboarding: {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone_number: "254712345678",
    property_id: "83797eb2-dc1d-4a13-b524-16fb34cdf4d4",
    rent_amount: 30000,
    deposit_amount: 60000,
    move_in_date: "2025-02-01",
    lease_duration: 12
  }
};

async function testWebhook(endpoint, data, description) {
  try {
    console.log(`\n🔗 Testing ${description}...`);
    console.log(`URL: ${N8N_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${N8N_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      const result = await response.text();
      console.log(`✅ ${description} - Success!`);
      console.log(`Response: ${result}`);
    } else {
      console.log(`❌ ${description} - Failed: ${response.status}`);
      const error = await response.text();
      console.log(`Error: ${error}`);
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
  }
}

async function testAllWebhooks() {
  console.log('🚀 Testing all webhook workflows...\n');
  
  // Test M-Pesa Payment Processing
  await testWebhook(
    '/webhook/mpesa-callback',
    testData.mpesaCallback,
    'M-Pesa Payment Processing'
  );
  
  // Wait 2 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Maintenance Request
  await testWebhook(
    '/webhook/maintenance-request',
    testData.maintenanceRequest,
    'Maintenance Request'
  );
  
  // Wait 2 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Tenant Onboarding
  await testWebhook(
    '/webhook/tenant-onboarding',
    testData.tenantOnboarding,
    'Tenant Onboarding'
  );
  
  console.log('\n📋 Manual Testing Instructions:');
  console.log('================================');
  console.log('For scheduled workflows (Rent Reminder & Utility Billing):');
  console.log('1. Open n8n at http://localhost:5678');
  console.log('2. Go to the workflow');
  console.log('3. Click "Execute Workflow" button (play icon)');
  console.log('4. Or change the schedule to run more frequently');
  console.log('\nFor webhook workflows:');
  console.log('1. Make sure workflows are Active');
  console.log('2. Use the curl commands below to test');
  console.log('\n🔧 Curl Commands:');
  console.log('=================');
  console.log('# M-Pesa Callback:');
  console.log(`curl -X POST ${N8N_BASE_URL}/webhook/mpesa-callback \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify(testData.mpesaCallback)}'`);
  console.log('\n# Maintenance Request:');
  console.log(`curl -X POST ${N8N_BASE_URL}/webhook/maintenance-request \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify(testData.maintenanceRequest)}'`);
  console.log('\n# Tenant Onboarding:');
  console.log(`curl -X POST ${N8N_BASE_URL}/webhook/tenant-onboarding \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify(testData.tenantOnboarding)}'`);
}

// Run the tests
testAllWebhooks().catch(console.error);



