import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class UpdatedCredentialsTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.darajaBaseURL = 'https://sandbox.safaricom.co.ke';
  }

  // Test M-Pesa API with updated credentials
  async testMpesaAPI() {
    console.log('🔑 Testing M-Pesa API with updated credentials...\n');
    
    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    
    console.log('📋 Using credentials:');
    console.log('- Consumer Key:', consumerKey);
    console.log('- Consumer Secret:', consumerSecret ? '***' + consumerSecret.slice(-4) : 'Not set');
    
    try {
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      console.log('\n📡 Connecting to Safaricom Daraja API...');
      
      const response = await fetch(`${this.darajaBaseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ M-Pesa API connection successful!');
        console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
        console.log('Token expires in:', data.expires_in, 'seconds');
        return data.access_token;
      } else {
        const errorText = await response.text();
        console.log('❌ M-Pesa API connection failed:', errorText);
        return null;
      }

    } catch (error) {
      console.log('❌ Error testing M-Pesa API:', error.message);
      return null;
    }
  }

  // Test STK Push
  async testSTKPush(accessToken) {
    if (!accessToken) {
      console.log('⚠️  No access token available for STK Push test');
      return;
    }

    console.log('\n📱 Testing STK Push...\n');

    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const businessShortCode = '174379';
      const passkey = process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
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

      console.log('🚀 Sending STK Push request...');
      console.log('Request details:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference
      });

      const response = await fetch(`${this.darajaBaseURL}/mpesa/stkpush/v1/processrequest`, {
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
        console.log('❌ STK Push failed:', errorText);
        return null;
      }

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

  // Run all tests
  async runAllTests() {
    console.log('🚀 Testing Updated M-Pesa Credentials\n');
    console.log('=' .repeat(50));
    
    // Test 1: M-Pesa API connection
    const accessToken = await this.testMpesaAPI();
    
    // Test 2: STK Push (if we got access token)
    if (accessToken) {
      await this.testSTKPush(accessToken);
    }
    
    // Test 3: App endpoints
    await this.testAppEndpoints();
    
    console.log('\n' + '=' .repeat(50));
    
    if (accessToken) {
      console.log('🎉 SUCCESS! Your M-Pesa credentials are working!');
      console.log('\n💡 Next steps:');
      console.log('1. Restart your server: npm start');
      console.log('2. Create test data in your database');
      console.log('3. Test with real phone numbers');
      console.log('4. Your M-Pesa integration is ready! 🚀');
    } else {
      console.log('❌ M-Pesa credentials test failed');
      console.log('Please check your credentials and try again');
    }
  }
}

// Run the tests
const tester = new UpdatedCredentialsTester();
tester.runAllTests();


