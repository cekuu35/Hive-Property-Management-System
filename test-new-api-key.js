import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// The new API key you provided
const NEW_API_KEY = "eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiQXBvbGxvIiwiaWQiOjMwMzAyLCJ1dWlkIjoiNWJlNjQ2ZWYtMTBiZS00MmQ1LWE3OTMtZjRlOGU5Njk5ZjA5In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnt9LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInBlcm1pdHRlZFJlZmVyZXIiOiIiLCJzdWJzY3JpYmVkQVBJcyI6W10sInRva2VuX3R5cGUiOiJhcGlLZXkiLCJwZXJtaXR0ZWRJUCI6IiIsImlhdCI6MTc2MDcwNTM4MCwianRpIjoiM2UyMjk2OWMtMmVkZi00MjI1LWI5ODMtMTE3N2ZmYWJhMjlkIn0=.id_eLAfmnTnoFEKuG1WR9Yjyl4oVYuSoxY0L6ncOrvvCJ2-3c6aKIdIR24tXghwuWejJvIlyRL8yxNlZu7Mw0Sh2lWiDZL7RolDQ8s51sNYLtU3bkNqY15wR13AVA1d1jGabv5IhoDXSM79nMru1b8LQPq7YsgxJBYC1NavpdnyAdCEyK2kCRh22353OqbjJCge6GSn0cw65J2raSFdPlR847_4nCxGqBy3g3idhJ2TAu8sZsMqF1p_4qqorCJUGxbSO3WdrDuuEA3afc0RC3bL1JmEnimaXo-SA9MOhL1ia0lEcGJ6JlwoyAeBhX4tj68d17GJiuGdF5DtsC3LsAg==";

class NewAPIKeyTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  // Decode JWT token
  decodeToken() {
    try {
      const base64Url = NEW_API_KEY.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Test API key information
  testAPIKeyInfo() {
    console.log('🔍 Analyzing New API Key...\n');
    
    const tokenData = this.decodeToken();
    if (tokenData) {
      console.log('📋 API Key Information:');
      console.log('- Subject:', tokenData.sub);
      console.log('- Application:', tokenData.application?.name);
      console.log('- Tier:', tokenData.application?.tier);
      console.log('- Key Type:', tokenData.keytype);
      console.log('- Issued At:', new Date(tokenData.iat * 1000).toISOString());
      console.log('- Subscribed APIs:', tokenData.subscribedAPIs?.map(api => api.name) || 'None');
      
      // Check if token is expired
      if (tokenData.exp) {
        const expiryDate = new Date(tokenData.exp * 1000);
        const now = new Date();
        if (now > expiryDate) {
          console.log('❌ API Key is EXPIRED!');
          console.log('- Expired on:', expiryDate.toISOString());
          return false;
        } else {
          console.log('✅ API Key is still valid');
          console.log('- Expires on:', expiryDate.toISOString());
        }
      } else {
        console.log('⚠️  No expiration date found in token');
      }
      
      return true;
    } else {
      console.log('❌ Could not decode API key');
      return false;
    }
  }

  // Test direct M-Pesa API calls with new key
  async testDirectMpesaAPI() {
    console.log('\n🔍 Testing Direct M-Pesa API Calls with New Key...\n');

    const endpoints = [
      {
        name: 'Buni/KCB OAuth',
        url: 'https://sandbox.buni.kcbgroup.com/oauth2/v1/generate?grant_type=client_credentials',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${NEW_API_KEY}` }
      },
      {
        name: 'Buni/KCB OAuth Alt',
        url: 'https://sandbox.buni.kcbgroup.com/oauth2/token',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${NEW_API_KEY}` },
        body: 'grant_type=client_credentials'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}...`);
        
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            ...endpoint.headers,
            'Content-Type': 'application/json'
          },
          body: endpoint.body
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Success:', JSON.stringify(data, null, 2));
          return data.access_token; // Return access token if successful
        } else {
          const errorText = await response.text();
          console.log('❌ Error:', errorText.substring(0, 200));
        }
      } catch (error) {
        console.log('❌ Network Error:', error.message);
      }
      console.log('---');
    }
    return null;
  }

  // Test STK Push with access token
  async testSTKPush(accessToken) {
    if (!accessToken) {
      console.log('⚠️  No access token available for STK Push test');
      return;
    }

    console.log('\n📱 Testing STK Push with New API Key...\n');

    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const businessShortCode = '174379';
      const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
      const passwordString = `${businessShortCode}${passkey}${timestamp}`;
      const password = Buffer.from(passwordString).toString('base64');

      const stkPushRequest = {
        BusinessShortCode: businessShortCode,
        TransactionType: 'CustomerPayBillOnline',
        Amount: 1, // 1 KES for testing
        PartyA: '254708374149',
        PartyB: businessShortCode,
        PhoneNumber: '254708374149',
        CallBackURL: 'https://your-callback-url.com/callback',
        AccountReference: 'TestPayment',
        TransactionDesc: 'Test STK Push Payment',
        Password: password,
        Timestamp: timestamp
      };

      console.log('STK Push Request:', JSON.stringify(stkPushRequest, null, 2));

      const response = await fetch('https://sandbox.buni.kcbgroup.com/mm/api/request/v1/processrequest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPushRequest)
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ STK Push initiated successfully:', JSON.stringify(data, null, 2));
        return data;
      } else {
        const errorText = await response.text();
        console.log('❌ STK Push failed:', errorText);
      }

    } catch (error) {
      console.error('❌ Error testing STK Push:', error);
    }
  }

  // Test your app's payment endpoints with real UUIDs
  async testAppWithRealData() {
    console.log('\n🧪 Testing App with Real Data...\n');

    try {
      // First, let's get some real data from your database
      console.log('1️⃣ Fetching real leases from database...');
      
      const leasesResponse = await fetch(`${this.baseURL}/api/leases`);
      if (leasesResponse.ok) {
        const leases = await leasesResponse.json();
        console.log(`✅ Found ${leases.length} leases in database`);
        
        if (leases.length > 0) {
          const lease = leases[0];
          console.log('Using lease:', lease.id, 'for testing');
          
          // Test rent payment with real lease ID
          console.log('\n2️⃣ Testing rent payment with real lease...');
          const rentData = {
            leaseId: lease.id,
            amount: 1000,
            phoneNumber: '254708374149'
          };

          const rentResponse = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rentData)
          });

          const rentResult = await rentResponse.json();
          
          if (rentResponse.ok) {
            console.log('✅ Rent payment initiated successfully!');
            console.log('Response:', JSON.stringify(rentResult, null, 2));
          } else {
            console.log('❌ Rent payment failed:', rentResult.error);
          }
        } else {
          console.log('⚠️  No leases found. You may need to create a lease first.');
        }
      } else {
        console.log('❌ Could not fetch leases from database');
      }

    } catch (error) {
      console.log('❌ Error testing app with real data:', error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Testing New M-Pesa API Key\n');
    console.log('=' .repeat(50));
    
    // Test 1: API Key analysis
    const isValid = this.testAPIKeyInfo();
    
    if (!isValid) {
      console.log('❌ API Key validation failed. Stopping tests.');
      return;
    }

    // Test 2: Direct API calls
    const accessToken = await this.testDirectMpesaAPI();
    
    // Test 3: STK Push (if we got access token)
    if (accessToken) {
      await this.testSTKPush(accessToken);
    }

    // Test 4: App with real data
    await this.testAppWithRealData();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test completed!');
    
    if (accessToken) {
      console.log('🎉 Your new API key is working!');
      console.log('💡 Next steps:');
      console.log('1. Update your .env file with the new API key');
      console.log('2. Test with real phone numbers');
      console.log('3. Create real leases and bills for testing');
    } else {
      console.log('⚠️  API key authentication failed. Check the error messages above.');
    }
  }
}

// Run the tests
const tester = new NewAPIKeyTester();
tester.runAllTests();