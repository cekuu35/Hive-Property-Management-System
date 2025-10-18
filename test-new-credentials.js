import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// The new credentials you provided
const CONSUMER_KEY = "1tQvpm2n9wcq8zgJtz0za_LZD6Qa";
const CONSUMER_SECRET = "YaAZqrI2hJmVI4SxhPs3J5TiPzga";

class NewCredentialsTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  // Test M-Pesa API with new credentials
  async testMpesaAPI() {
    console.log('🔑 Testing M-Pesa API with new credentials...\n');
    
    try {
      const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
      
      console.log('📡 Connecting to Safaricom Daraja API...');
      
      const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ M-Pesa API connection successful!');
        console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
        console.log('Token expires in:', data.expires_in, 'seconds');
        return data.access_token;
      } else {
        const errorText = await response.text();
        console.log('❌ M-Pesa API connection failed:', response.status, response.statusText);
        console.log('Error details:', errorText);
        return null;
      }
    } catch (error) {
      console.log('❌ Error testing M-Pesa API:', error.message);
      return null;
    }
  }

  // Test STK Push with access token
  async testSTKPush(accessToken) {
    if (!accessToken) {
      console.log('⚠️  No access token available for STK Push test');
      return;
    }

    console.log('\n📱 Testing STK Push with new credentials...\n');

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

      console.log('🚀 Sending STK Push request...');
      console.log('Request details:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference
      });

      const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
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

  // Update .env file with new credentials
  updateEnvFile() {
    console.log('\n📝 Updating .env file with new credentials...\n');
    
    try {
      const fs = require('fs');
      
      // Read current .env file
      let envContent = '';
      try {
        envContent = fs.readFileSync('.env', 'utf8');
      } catch (error) {
        console.log('⚠️  .env file not found, creating new one...');
      }
      
      // Update or add M-Pesa credentials
      const lines = envContent.split('\n');
      const updatedLines = [];
      let mpesaKeysUpdated = { DARAJA_CONSUMER_KEY: false, DARAJA_CONSUMER_SECRET: false };
      
      for (const line of lines) {
        if (line.startsWith('DARAJA_CONSUMER_KEY=')) {
          updatedLines.push(`DARAJA_CONSUMER_KEY=${CONSUMER_KEY}`);
          mpesaKeysUpdated.DARAJA_CONSUMER_KEY = true;
        } else if (line.startsWith('DARAJA_CONSUMER_SECRET=')) {
          updatedLines.push(`DARAJA_CONSUMER_SECRET=${CONSUMER_SECRET}`);
          mpesaKeysUpdated.DARAJA_CONSUMER_SECRET = true;
        } else {
          updatedLines.push(line);
        }
      }
      
      // Add missing credentials
      if (!mpesaKeysUpdated.DARAJA_CONSUMER_KEY) {
        updatedLines.push(`DARAJA_CONSUMER_KEY=${CONSUMER_KEY}`);
      }
      if (!mpesaKeysUpdated.DARAJA_CONSUMER_SECRET) {
        updatedLines.push(`DARAJA_CONSUMER_SECRET=${CONSUMER_SECRET}`);
      }
      
      // Add other required M-Pesa settings if not present
      if (!envContent.includes('DARAJA_PASSKEY=')) {
        updatedLines.push('DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919');
      }
      if (!envContent.includes('DARAJA_ENV=')) {
        updatedLines.push('DARAJA_ENV=sandbox');
      }
      if (!envContent.includes('DARAJA_CALLBACK_URL=')) {
        updatedLines.push('DARAJA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback');
      }
      
      // Write updated .env file
      fs.writeFileSync('.env', updatedLines.join('\n'));
      console.log('✅ .env file updated with new M-Pesa credentials');
      
    } catch (error) {
      console.log('❌ Error updating .env file:', error.message);
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
    console.log('🚀 Testing New M-Pesa Credentials\n');
    console.log('=' .repeat(50));
    
    // Test 1: Update .env file
    this.updateEnvFile();
    
    // Test 2: Test M-Pesa API
    const accessToken = await this.testMpesaAPI();
    
    // Test 3: Test STK Push
    if (accessToken) {
      await this.testSTKPush(accessToken);
    }
    
    // Test 4: Test app endpoints
    await this.testAppEndpoints();
    
    console.log('\n' + '=' .repeat(50));
    
    if (accessToken) {
      console.log('🎉 SUCCESS! Your new M-Pesa credentials are working!');
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
const tester = new NewCredentialsTester();
tester.runAllTests();


