import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// The API key you provided
const API_KEY = "eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJBcG9sbG8uc2Fua2lpQGNhcmJvbi5zdXBlciIsImFwcGxpY2F0aW9uIjp7Im93bmVyIjoiQXBvbGxvLnNhbmtpaSIsInRpZXJRdW90YVR5cGUiOm51bGwsInRpZXIiOiJVbmxpbWl0ZWQiLCJuYW1lIjoiRGVmYXVsdEFwcGxpY2F0aW9uIiwiaWQiOjMwMjgyLCJ1dWlkIjoiNGY2YTJiODEtZjk5Ni00MzY1LThhNWQtYTg4ZmQ2YTBkM2U4In0sImlzcyI6Imh0dHBzOlwvXC9zYW5kYm94LmJ1bmkua2NiZ3JvdXAuY29tXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiVW5saW1pdGVkIjp7InRpZXJRdW90YVR5cGUiOiJyZXF1ZXN0Q291bnQiLCJncmFwaFFMTWF4Q29tcGxleGl0eSI6MCwiZ3JhcGhRTE1heERlcHRoIjowLCJzdG9wT25RdW90YVJlYWNoIjp0cnVlLCJzcGlrZUFycmVzdExpbWl0IjowLCJzcGlrZUFycmVzdFVuaXQiOm51bGx9fSwia2V5dHlwZSI6IlNBTkRCT1giLCJzdWJzY3JpYmVkQVBJcyI6W3sic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJNcGVzYUV4cHJlc3NBUElTZXJ2aWNlIiwiY29udGV4dCI6IlwvbW1cL2FwaVwvcmVxdWVzdFwvMS4wLjAiLCJwdWJsaXNoZXIiOiJzdXBlcl9hZG1pbiIsInZlcnNpb24iOiIxLjAuMCIsInN1YnNjcmlwdGlvblRpZXIiOiJVbmxpbWl0ZWQifV0sInRva2VuX3R5cGUiOiJhcGlLZXkiLCJpYXQiOjE3NjA3MDM4MzMsImp0aSI6IjVlYjJjYzY2LTRiN2ItNGIxMi04ODFmLTliOWI1ZDdkZDFiMiJ9.dfxnOskeHO5C3pHQHIgfH42oATV4gdTIFirbud8ZArhoQ8ArCyW9R7xH2B8E8uE7kXIr8uHv1g5cSYunkATsEXHXM6Tx3w7bOxLgfKhvHtJeYTGchilDxnWCsmPTif3r3A1OX_m6r4ivPIl5PUjFTwpgf-OURnIElgLW39KtHec_YD4Ci1elu_NE7fmK4S8obRR6Obk6cOat85AwtihA7WZ54GBGI4Dfmevgp4NfY0DGPg7BAnoqHrMgbIWSKNrBWRjfeNRusPjw03ER7QoUneTZExP8UPkWeI7BmZfxnT_EAFMk6TlYH-yNx-OGeHiMHuX3SsJwc53iffRA4NhwjQ==";

class MpesaIntegrationTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.accessToken = null;
  }

  // Test the app's M-Pesa endpoints
  async testAppEndpoints() {
    console.log('🧪 Testing App M-Pesa Endpoints...\n');

    try {
      // Test 1: Check if server is running
      console.log('1️⃣ Testing server connectivity...');
      const healthResponse = await fetch(`${this.baseURL}/api/health`);
      if (healthResponse.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('⚠️  Server health check failed, but continuing...');
      }

      // Test 2: Test rent payment endpoint
      console.log('\n2️⃣ Testing rent payment endpoint...');
      const rentPaymentData = {
        leaseId: 'test-lease-123',
        amount: 1000,
        phoneNumber: '254708374149'
      };

      const rentResponse = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rentPaymentData)
      });

      if (rentResponse.ok) {
        const rentData = await rentResponse.json();
        console.log('✅ Rent payment endpoint working:', rentData);
      } else {
        const errorData = await rentResponse.json();
        console.log('❌ Rent payment endpoint failed:', errorData);
      }

      // Test 3: Test utility payment endpoint
      console.log('\n3️⃣ Testing utility payment endpoint...');
      const utilityPaymentData = {
        billId: 'test-bill-123',
        amount: 500,
        phoneNumber: '254708374149'
      };

      const utilityResponse = await fetch(`${this.baseURL}/api/mpesa/utility-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(utilityPaymentData)
      });

      if (utilityResponse.ok) {
        const utilityData = await utilityResponse.json();
        console.log('✅ Utility payment endpoint working:', utilityData);
      } else {
        const errorData = await utilityResponse.json();
        console.log('❌ Utility payment endpoint failed:', errorData);
      }

    } catch (error) {
      console.error('❌ Error testing app endpoints:', error.message);
    }
  }

  // Test direct M-Pesa API with different approaches
  async testDirectMpesaAPI() {
    console.log('\n🔍 Testing Direct M-Pesa API...\n');

    const endpoints = [
      'https://sandbox.buni.kcbgroup.com/oauth2/v1/generate?grant_type=client_credentials',
      'https://sandbox.buni.kcbgroup.com/oauth2/token',
      'https://sandbox.buni.kcbgroup.com/mm/api/request/v1/processrequest'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: endpoint.includes('token') ? 'POST' : 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': endpoint.includes('token') ? 'application/x-www-form-urlencoded' : 'application/json'
          },
          body: endpoint.includes('token') ? 'grant_type=client_credentials' : undefined
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Success:', JSON.stringify(data, null, 2));
        } else {
          const errorText = await response.text();
          console.log('❌ Error:', errorText);
        }
      } catch (error) {
        console.log('❌ Network Error:', error.message);
      }
      console.log('---');
    }
  }

  // Test with different authentication methods
  async testAuthenticationMethods() {
    console.log('\n🔐 Testing Different Authentication Methods...\n');

    const methods = [
      {
        name: 'Bearer Token',
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      },
      {
        name: 'API Key Header',
        headers: { 'X-API-Key': API_KEY }
      },
      {
        name: 'Custom Header',
        headers: { 'X-Auth-Token': API_KEY }
      }
    ];

    for (const method of methods) {
      try {
        console.log(`Testing ${method.name}...`);
        
        const response = await fetch('https://sandbox.buni.kcbgroup.com/oauth2/v1/generate?grant_type=client_credentials', {
          method: 'GET',
          headers: {
            ...method.headers,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Success with', method.name);
          this.accessToken = data.access_token;
          break;
        } else {
          const errorText = await response.text();
          console.log('❌ Failed with', method.name, ':', errorText.substring(0, 100));
        }
      } catch (error) {
        console.log('❌ Network Error with', method.name, ':', error.message);
      }
      console.log('---');
    }
  }

  // Test STK Push with working authentication
  async testSTKPush() {
    if (!this.accessToken) {
      console.log('⚠️  No access token available for STK Push test');
      return;
    }

    console.log('\n📱 Testing STK Push...\n');

    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const businessShortCode = '174379';
      const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
      const passwordString = `${businessShortCode}${passkey}${timestamp}`;
      const password = Buffer.from(passwordString).toString('base64');

      const stkPushRequest = {
        BusinessShortCode: businessShortCode,
        TransactionType: 'CustomerPayBillOnline',
        Amount: 1,
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
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPushRequest)
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ STK Push initiated successfully:', JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log('❌ STK Push failed:', errorText);
      }

    } catch (error) {
      console.error('❌ Error testing STK Push:', error);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive M-Pesa Integration Tests...\n');
    
    await this.testDirectMpesaAPI();
    await this.testAuthenticationMethods();
    await this.testSTKPush();
    await this.testAppEndpoints();

    console.log('\n📋 Test Summary:');
    console.log('- API Key appears to be for Buni/KCB M-Pesa service');
    console.log('- Token shows: Apollo.sankii@carbon.super');
    console.log('- Tier: Unlimited (Sandbox)');
    console.log('- Subscribed to: MpesaExpressAPIService');
    console.log('\n💡 Recommendations:');
    console.log('1. Check if the API key has expired');
    console.log('2. Verify the correct authentication method for Buni/KCB');
    console.log('3. Update your app to use the correct M-Pesa service endpoints');
    console.log('4. Test with a fresh API key if needed');
  }
}

// Run the tests
const tester = new MpesaIntegrationTester();
tester.runAllTests();


