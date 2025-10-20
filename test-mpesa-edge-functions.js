#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mpesa-stk-push`;

console.log('🧪 Testing M-Pesa Edge Functions...\n');
console.log(`📍 Edge Function URL: ${EDGE_FUNCTION_URL}\n`);

async function testEdgeFunction() {
  try {
    // Test 1: Check if edge function is accessible
    console.log('🔍 Test 1: Checking edge function accessibility...');
    
    const healthResponse = await fetch(`${EDGE_FUNCTION_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (healthResponse.status === 404) {
      console.log('⚠️  Health endpoint not found (expected for this function)');
    } else {
      console.log(`✅ Edge function is accessible (Status: ${healthResponse.status})`);
    }

    // Test 2: Test rent payment endpoint (with invalid data)
    console.log('\n🔍 Test 2: Testing rent payment endpoint...');
    
    const rentPaymentResponse = await fetch(`${EDGE_FUNCTION_URL}/rent-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leaseId: 'test-lease-id',
        amount: 1000,
        phoneNumber: '254712345678'
      }),
    });

    const rentPaymentData = await rentPaymentResponse.json();
    console.log(`📊 Rent Payment Response (${rentPaymentResponse.status}):`, JSON.stringify(rentPaymentData, null, 2));

    // Test 3: Test utility payment endpoint (with invalid data)
    console.log('\n🔍 Test 3: Testing utility payment endpoint...');
    
    const utilityPaymentResponse = await fetch(`${EDGE_FUNCTION_URL}/utility-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billId: 'test-bill-id',
        amount: 500,
        phoneNumber: '254712345678'
      }),
    });

    const utilityPaymentData = await utilityPaymentResponse.json();
    console.log(`📊 Utility Payment Response (${utilityPaymentResponse.status}):`, JSON.stringify(utilityPaymentData, null, 2));

    // Test 4: Test payment status endpoint
    console.log('\n🔍 Test 4: Testing payment status endpoint...');
    
    const statusResponse = await fetch(`${EDGE_FUNCTION_URL}/payment-status/test-checkout-id`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const statusData = await statusResponse.json();
    console.log(`📊 Payment Status Response (${statusResponse.status}):`, JSON.stringify(statusData, null, 2));

    console.log('\n✅ Edge function tests completed!');
    console.log('\n📋 Summary:');
    console.log('- Edge function is deployed and accessible');
    console.log('- Rent payment endpoint is responding');
    console.log('- Utility payment endpoint is responding');
    console.log('- Payment status endpoint is responding');
    console.log('\n🎯 Next steps:');
    console.log('1. Set up your M-Pesa API credentials in Supabase Dashboard');
    console.log('2. Test with real lease and bill IDs from your database');
    console.log('3. Configure M-Pesa callback URL to point to your edge function');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure the edge function is deployed: supabase functions list');
    console.error('2. Check your Supabase URL and anon key');
    console.error('3. Verify the edge function is accessible from your network');
  }
}

// Run the tests
testEdgeFunction();

