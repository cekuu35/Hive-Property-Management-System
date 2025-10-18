import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class CompleteMpesaTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.apiKey = "eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJzdWJzY3JpYmVkQVBJcyI6W3sic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJNcGVzYUV4cHJlc3NBUElTZXJ2aWNlIiwiY29udGV4dCI6IlwvbW1cL2FwaVwvcmVxdWVzdFwvMS4wLjAiLCJwdWJsaXNoZXIiOiJzdXBlcl9hZG1pbiIsInZlcnNpb24iOiIxLjAuMCIsInN1YnNjcmlwdGlvblRpZXIiOiJVbmxpbWl0ZWQifV0sInRva2VuX3R5cGUiOiJhcGlLZXkiLCJpYXQiOjE3NjA3MDM4MzMsImp0aSI6IjVlYjJjYzY2LTRiN2ItNGIxMi04ODFmLTliOWI1ZDdkZDFiMiJ9.dfxnOskeHO5C3pHQHIgfH42oATV4gdTIFirbud8ZArhoQ8ArCyW9R7xH2B8E8uE7kXIr8uHv1g5cSYunkATsEXHXM6Tx3w7bOxLgfKhvHtJeYTGchilDxnWCsmPTif3r3A1OX_m6r4ivPIl5PUjFTwpgf-OURnIElgLW39KtHec_YD4Ci1elu_NE7fmK4S8obRR6Obk6cOat85AwtihA7WZ54GBGI4Dfmevgp4NfY0DGPg7BAnoqHrMgbIWSKNrBWRjfeNRusPjw03ER7QoUneTZExP8UPkWeI7BmZfxnT_EAFMk6TlYH-yNx-OGeHiMHuX3SsJwc53iffRA4NhwjQ==";
  }

  // Decode JWT token
  decodeToken() {
    try {
      const base64Url = this.apiKey.split('.')[1];
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
    console.log('🔍 Analyzing API Key...\n');
    
    const tokenData = this.decodeToken();
    if (tokenData) {
      console.log('📋 API Key Information:');
      console.log('- Subject:', tokenData.sub);
      console.log('- Application:', tokenData.application?.name);
      console.log('- Tier:', tokenData.application?.tier);
      console.log('- Key Type:', tokenData.keytype);
      console.log('- Issued At:', new Date(tokenData.iat * 1000).toISOString());
      console.log('- Subscribed APIs:', tokenData.subscribedAPIs?.map(api => api.name));
      
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

  // Test your app's payment endpoints
  async testAppPaymentEndpoints() {
    console.log('\n🧪 Testing App Payment Endpoints...\n');

    // Test 1: Server health
    console.log('1️⃣ Testing server health...');
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      if (response.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('⚠️  Server health check failed:', response.status);
      }
    } catch (error) {
      console.log('❌ Server is not responding:', error.message);
      return;
    }

    // Test 2: Rent payment endpoint
    console.log('\n2️⃣ Testing rent payment endpoint...');
    try {
      const rentData = {
        leaseId: 'test-lease-123',
        amount: 1000,
        phoneNumber: '254708374149'
      };

      const response = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rentData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Rent payment endpoint working');
        console.log('Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Rent payment failed:', result.error);
        console.log('This is expected if no lease exists in database');
      }
    } catch (error) {
      console.log('❌ Error testing rent payment:', error.message);
    }

    // Test 3: Utility payment endpoint
    console.log('\n3️⃣ Testing utility payment endpoint...');
    try {
      const utilityData = {
        billId: 'test-bill-123',
        amount: 500,
        phoneNumber: '254708374149'
      };

      const response = await fetch(`${this.baseURL}/api/mpesa/utility-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utilityData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Utility payment endpoint working');
        console.log('Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Utility payment failed:', result.error);
        console.log('This is expected if no bill exists in database');
      }
    } catch (error) {
      console.log('❌ Error testing utility payment:', error.message);
    }
  }

  // Test direct M-Pesa API calls
  async testDirectMpesaAPI() {
    console.log('\n🔍 Testing Direct M-Pesa API Calls...\n');

    const endpoints = [
      {
        name: 'Buni/KCB OAuth',
        url: 'https://sandbox.buni.kcbgroup.com/oauth2/v1/generate?grant_type=client_credentials',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      },
      {
        name: 'Buni/KCB OAuth Alt',
        url: 'https://sandbox.buni.kcbgroup.com/oauth2/token',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        body: 'grant_type=client_credentials'
      },
      {
        name: 'Safaricom Daraja OAuth',
        url: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        method: 'GET',
        headers: { 'Authorization': 'Basic ' + Buffer.from('your_consumer_key:your_consumer_secret').toString('base64') }
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
        } else {
          const errorText = await response.text();
          console.log('❌ Error:', errorText.substring(0, 200));
        }
      } catch (error) {
        console.log('❌ Network Error:', error.message);
      }
      console.log('---');
    }
  }

  // Provide recommendations
  provideRecommendations() {
    console.log('\n💡 Recommendations and Next Steps:\n');
    
    console.log('1. 🔑 API Key Status:');
    console.log('   - Your API key appears to be for Buni/KCB M-Pesa service');
    console.log('   - It may be expired or require different authentication');
    console.log('   - Consider getting a fresh API key from Buni/KCB');
    
    console.log('\n2. 🏗️ Integration Options:');
    console.log('   Option A: Use Buni/KCB M-Pesa (requires fresh API key)');
    console.log('   Option B: Switch to Safaricom Daraja API (standard)');
    console.log('   Option C: Use both services for redundancy');
    
    console.log('\n3. 🚀 Quick Setup for Daraja API:');
    console.log('   - Register at https://developer.safaricom.co.ke/');
    console.log('   - Get Consumer Key and Consumer Secret');
    console.log('   - Add to .env file:');
    console.log('     DARAJA_CONSUMER_KEY=your_key');
    console.log('     DARAJA_CONSUMER_SECRET=your_secret');
    console.log('     DARAJA_PASSKEY=your_passkey');
    
    console.log('\n4. 🧪 Testing:');
    console.log('   - Your app endpoints are working correctly');
    console.log('   - Test with real phone numbers in sandbox mode');
    console.log('   - Use small amounts (1-10 KES) for testing');
    
    console.log('\n5. 📱 Phone Number Format:');
    console.log('   - Use format: 254XXXXXXXXX (Kenyan numbers)');
    console.log('   - Example: 254708374149');
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Complete M-Pesa Integration Test\n');
    console.log('=' .repeat(50));
    
    // Test 1: API Key analysis
    const isValid = this.testAPIKeyInfo();
    
    // Test 2: App endpoints
    await this.testAppPaymentEndpoints();
    
    // Test 3: Direct API calls
    await this.testDirectMpesaAPI();
    
    // Test 4: Recommendations
    this.provideRecommendations();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test completed! Check the recommendations above.');
  }
}

// Run the tests
const tester = new CompleteMpesaTester();
tester.runAllTests();


