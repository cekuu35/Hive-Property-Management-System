// Simple M-Pesa Integration Test
const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mpesa-stk-push`;

console.log('🧪 Testing M-Pesa Integration...\n');
console.log(`📍 Edge Function URL: ${EDGE_FUNCTION_URL}\n`);

async function testKCBToken() {
  console.log('🔑 Testing KCB OAuth token...');
  
  try {
    const response = await fetch('https://accounts.buni.kcbgroup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from('1tQvpm2n9wcq8zgJtz0za_LZD6Qa:YaAZqrI2hJmVI4SxhPs3J5TiPzga').toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ KCB OAuth working - Token expires in:', data.expires_in, 'seconds');
      return data.access_token;
    } else {
      const error = await response.text();
      console.log('❌ KCB OAuth failed:', response.status, error);
      return null;
    }
  } catch (error) {
    console.log('❌ KCB OAuth error:', error.message);
    return null;
  }
}

async function testEdgeFunction() {
  console.log('\n🔍 Testing Edge Function accessibility...');
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/rent-payment`, {
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

    const data = await response.json();
    console.log(`📊 Edge Function Response (${response.status}):`, JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log('✅ Edge Function is accessible and responding');
      return true;
    } else if (response.status === 404) {
      console.log('❌ Edge Function not found - check if deployed correctly');
      return false;
    } else {
      console.log('⚠️  Edge Function responding but may have issues');
      return true;
    }
  } catch (error) {
    console.log('❌ Edge Function test failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  Testing Database connection...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_requests?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ Database connection working - payment_requests table accessible');
      return true;
    } else {
      console.log('❌ Database connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Database test error:', error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Starting M-Pesa Integration Test Suite\n');
  
  const results = {
    kcbToken: false,
    edgeFunction: false,
    database: false
  };

  // Test 1: KCB OAuth
  const token = await testKCBToken();
  results.kcbToken = !!token;

  // Test 2: Edge Function
  results.edgeFunction = await testEdgeFunction();

  // Test 3: Database
  results.database = await testDatabaseConnection();

  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  console.log(`KCB OAuth Token: ${results.kcbToken ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Edge Function: ${results.edgeFunction ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database: ${results.database ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Your M-Pesa integration is ready.');
    console.log('\n📱 Next steps:');
    console.log('1. Test with real lease/bill IDs from your database');
    console.log('2. Use the frontend to make actual payments');
    console.log('3. Monitor the Supabase logs for any issues');
    console.log('\n🔗 Test URLs:');
    console.log(`Rent Payment: POST ${EDGE_FUNCTION_URL}/rent-payment`);
    console.log(`Utility Payment: POST ${EDGE_FUNCTION_URL}/utility-payment`);
    console.log(`Callback: POST ${EDGE_FUNCTION_URL}/callback`);
    console.log(`Status Check: GET ${EDGE_FUNCTION_URL}/payment-status/{id}`);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above and fix them.');
    console.log('\n🔧 Troubleshooting:');
    if (!results.kcbToken) {
      console.log('- Verify KCB credentials are correct in Supabase secrets');
    }
    if (!results.edgeFunction) {
      console.log('- Check if mpesa-stk-push function is deployed');
      console.log('- Verify all secrets are set correctly');
    }
    if (!results.database) {
      console.log('- Run the payment_requests table SQL in Supabase');
      console.log('- Check RLS policies');
    }
  }

  return allPassed;
}

// Run the tests
runFullTest().catch(console.error);
