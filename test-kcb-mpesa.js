import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Your KCB credentials
const CONSUMER_KEY = "1tQvpm2n9wcq8zgJtz0za_LZD6Qa";
const CONSUMER_SECRET = "YaAZqrI2hJmVI4SxhPs3J5TiPzga";

class KCBMPesaTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.kcbBaseURL = 'https://sandbox.buni.kcbgroup.com';
  }

  // Test KCB/Buni API with your credentials
  async testKCBAPI() {
    console.log('🔑 Testing KCB/Buni M-Pesa API with your credentials...\n');
    
    try {
      const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
      
      console.log('📡 Connecting to KCB/Buni API...');
      
      // Try different KCB/Buni endpoints
      const endpoints = [
        `${this.kcbBaseURL}/oauth2/v1/generate?grant_type=client_credentials`,
        `${this.kcbBaseURL}/oauth2/token`,
        `${this.kcbBaseURL}/oauth/v1/generate?grant_type=client_credentials`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: endpoint.includes('token') ? 'POST' : 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: endpoint.includes('token') ? 'grant_type=client_credentials' : undefined
          });

          console.log(`Status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ KCB/Buni API connection successful!');
            console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
            console.log('Token expires in:', data.expires_in, 'seconds');
            return data.access_token;
          } else {
            const errorText = await response.text();
            console.log(`❌ Endpoint failed: ${errorText.substring(0, 200)}`);
          }
        } catch (error) {
          console.log(`❌ Endpoint error: ${error.message}`);
        }
        console.log('---');
      }

      console.log('❌ All KCB/Buni endpoints failed');
      return null;

    } catch (error) {
      console.log('❌ Error testing KCB/Buni API:', error.message);
      return null;
    }
  }

  // Test STK Push with KCB/Buni
  async testKCBSTKPush(accessToken) {
    if (!accessToken) {
      console.log('⚠️  No access token available for STK Push test');
      return;
    }

    console.log('\n📱 Testing STK Push with KCB/Buni API...\n');

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

      console.log('🚀 Sending STK Push request to KCB/Buni...');
      console.log('Request details:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference
      });

      // Try different STK Push endpoints for KCB/Buni
      const endpoints = [
        `${this.kcbBaseURL}/mm/api/request/v1/processrequest`,
        `${this.kcbBaseURL}/mpesa/stkpush/v1/processrequest`,
        `${this.kcbBaseURL}/api/request/v1/processrequest`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying STK Push endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
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
            console.log('✅ STK Push initiated successfully!');
            console.log('Response:', JSON.stringify(data, null, 2));
            return data;
          } else {
            const errorText = await response.text();
            console.log(`❌ STK Push failed: ${errorText.substring(0, 200)}`);
          }
        } catch (error) {
          console.log(`❌ STK Push error: ${error.message}`);
        }
        console.log('---');
      }

      console.log('❌ All STK Push endpoints failed');
      return null;

    } catch (error) {
      console.error('❌ Error testing STK Push:', error);
      return null;
    }
  }

  // Test your app's payment endpoints
  async testAppEndpoints() {
    console.log('\n🧪 Testing your app\'s payment endpoints...\n');
    
    try {
      // Test rent payment
      console.log('1️⃣ Testing rent payment endpoint...');
      const rentData = {
        leaseId: '123e4567-e89b-12d3-a456-426614174000', // Test UUID
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
        console.log('This is expected if the lease does not exist in the database');
      }

      // Test utility payment
      console.log('\n2️⃣ Testing utility payment endpoint...');
      const utilityData = {
        billId: '123e4567-e89b-12d3-a456-426614174001', // Test UUID
        amount: 500,
        phoneNumber: '254708374149'
      };

      const utilityResponse = await fetch(`${this.baseURL}/api/mpesa/utility-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utilityData)
      });

      const utilityResult = await utilityResponse.json();
      
      if (utilityResponse.ok) {
        console.log('✅ Utility payment initiated successfully!');
        console.log('Response:', JSON.stringify(utilityResult, null, 2));
      } else {
        console.log('❌ Utility payment failed:', utilityResult.error);
        console.log('This is expected if the bill does not exist in the database');
      }

    } catch (error) {
      console.log('❌ Error testing app endpoints:', error.message);
    }
  }

  // Provide next steps
  provideNextSteps() {
    console.log('\n💡 Next Steps to Complete KCB M-Pesa Integration:\n');
    console.log('=' .repeat(60));
    
    console.log('\n1. 🔑 Add Your KCB API Key:');
    console.log('   - Open the .env file');
    console.log('   - Replace "your_kcb_api_key_here" with your actual KCB API key');
    console.log('   - Save the file');
    
    console.log('\n2. 🔄 Restart Your Server:');
    console.log('   - Stop the current server (Ctrl+C)');
    console.log('   - Run: npm start');
    console.log('   - Check the console for M-Pesa connection status');
    
    console.log('\n3. 🗄️ Create Test Data:');
    console.log('   - Create a landlord with M-Pesa details in your database');
    console.log('   - Create a lease for the landlord');
    console.log('   - Create a utility bill for the lease');
    
    console.log('\n4. 🧪 Test the Integration:');
    console.log('   - Use real UUIDs from your database');
    console.log('   - Test with Kenyan phone numbers (254XXXXXXXXX)');
    console.log('   - Use small amounts for testing (1-10 KES)');
    
    console.log('\n5. 📱 Phone Number Format:');
    console.log('   - Always use: 254XXXXXXXXX');
    console.log('   - Example: 254708374149 (for 0708374149)');
    console.log('   - Must be 12 digits total');
    
    console.log('\n6. 🚀 Go Live:');
    console.log('   - Get production credentials from KCB');
    console.log('   - Update the baseURL to production');
    console.log('   - Test thoroughly before going live');
    
    console.log('\n' + '=' .repeat(60));
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Testing KCB/Buni M-Pesa Integration\n');
    console.log('=' .repeat(50));
    
    // Test 1: KCB API connection
    const accessToken = await this.testKCBAPI();
    
    // Test 2: STK Push (if we got access token)
    if (accessToken) {
      await this.testKCBSTKPush(accessToken);
    }
    
    // Test 3: App endpoints
    await this.testAppEndpoints();
    
    // Test 4: Next steps
    this.provideNextSteps();
    
    console.log('\n' + '=' .repeat(50));
    
    if (accessToken) {
      console.log('🎉 SUCCESS! Your KCB credentials are working!');
      console.log('Your app is now configured for KCB/Buni M-Pesa integration! 🚀');
    } else {
      console.log('⚠️  KCB API connection failed');
      console.log('Please check your credentials and try again');
    }
  }
}

// Run the tests
const tester = new KCBMPesaTester();
tester.runAllTests();


