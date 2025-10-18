import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class KCBBuniTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.kcbBaseURL = 'https://sandbox.buni.kcbgroup.com';
  }

  // Test KCB Buni API with your credentials
  async testKCBBuniAPI() {
    console.log('🔑 Testing KCB Buni API with your credentials...\n');
    
    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    
    console.log('📋 Using KCB Buni credentials:');
    console.log('- Consumer Key:', consumerKey);
    console.log('- Consumer Secret:', consumerSecret ? '***' + consumerSecret.slice(-4) : 'Not set');
    
    try {
      // Try different authentication methods for KCB Buni
      const authMethods = [
        {
          name: 'Basic Auth',
          auth: Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64'),
          headers: { 'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}` }
        },
        {
          name: 'Bearer Token',
          auth: consumerKey,
          headers: { 'Authorization': `Bearer ${consumerKey}` }
        }
      ];

      for (const method of authMethods) {
        try {
          console.log(`\nTrying ${method.name}...`);
          
          const response = await fetch(`${this.kcbBaseURL}/oauth2/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: {
              ...method.headers,
              'Content-Type': 'application/json'
            }
          });

          console.log(`Status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ KCB Buni API connection successful!');
            console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
            console.log('Token expires in:', data.expires_in, 'seconds');
            return data.access_token;
          } else {
            const errorText = await response.text();
            console.log(`❌ ${method.name} failed: ${errorText.substring(0, 200)}`);
          }
        } catch (error) {
          console.log(`❌ ${method.name} error: ${error.message}`);
        }
      }

      // Try alternative endpoints
      const altEndpoints = [
        `${this.kcbBaseURL}/oauth2/token`,
        `${this.kcbBaseURL}/oauth/v1/generate?grant_type=client_credentials`,
        `${this.kcbBaseURL}/api/oauth/token`
      ];

      for (const endpoint of altEndpoints) {
        try {
          console.log(`\nTrying alternative endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: endpoint.includes('token') ? 'POST' : 'GET',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
              'Content-Type': 'application/json'
            },
            body: endpoint.includes('token') ? 'grant_type=client_credentials' : undefined
          });

          console.log(`Status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ KCB Buni API connection successful!');
            console.log('Access token obtained:', data.access_token ? 'Yes' : 'No');
            console.log('Token expires in:', data.expires_in, 'seconds');
            return data.access_token;
          } else {
            const errorText = await response.text();
            console.log(`❌ ${endpoint} failed: ${errorText.substring(0, 200)}`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint} error: ${error.message}`);
        }
      }

      console.log('❌ All KCB Buni authentication methods failed');
      return null;

    } catch (error) {
      console.log('❌ Error testing KCB Buni API:', error.message);
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
    console.log('\n💡 Next Steps for KCB Buni M-Pesa Integration:\n');
    console.log('=' .repeat(60));
    
    console.log('\n1. 🔑 Verify Your KCB Buni Credentials:');
    console.log('   - Make sure your credentials are active');
    console.log('   - Check if they need to be activated by KCB');
    console.log('   - Verify you\'re using the correct API endpoints');
    
    console.log('\n2. 🗄️ Create Test Data:');
    console.log('   - Create a landlord with M-Pesa details in your database');
    console.log('   - Create a lease for the landlord');
    console.log('   - Create a utility bill for the lease');
    
    console.log('\n3. 🧪 Test the Integration:');
    console.log('   - Use real UUIDs from your database');
    console.log('   - Test with Kenyan phone numbers (254XXXXXXXXX)');
    console.log('   - Use small amounts for testing (1-10 KES)');
    
    console.log('\n4. 📱 Phone Number Format:');
    console.log('   - Always use: 254XXXXXXXXX');
    console.log('   - Example: 254708374149 (for 0708374149)');
    console.log('   - Must be 12 digits total');
    
    console.log('\n5. 🔧 If Credentials Don\'t Work:');
    console.log('   - Contact KCB support for API activation');
    console.log('   - Verify you\'re using the correct service');
    console.log('   - Check if there are additional setup steps');
    
    console.log('\n6. 🚀 Alternative: Use Safaricom Daraja API');
    console.log('   - Register at https://developer.safaricom.co.ke/');
    console.log('   - Get Consumer Key, Consumer Secret, and Passkey');
    console.log('   - This is the standard M-Pesa API');
    
    console.log('\n' + '=' .repeat(60));
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Testing KCB Buni M-Pesa Integration\n');
    console.log('=' .repeat(50));
    
    // Test 1: KCB Buni API connection
    const accessToken = await this.testKCBBuniAPI();
    
    // Test 2: App endpoints
    await this.testAppEndpoints();
    
    // Test 3: Next steps
    this.provideNextSteps();
    
    console.log('\n' + '=' .repeat(50));
    
    if (accessToken) {
      console.log('🎉 SUCCESS! Your KCB Buni credentials are working!');
      console.log('Your app is now configured for KCB Buni M-Pesa integration! 🚀');
    } else {
      console.log('⚠️  KCB Buni API connection failed');
      console.log('Please check your credentials or consider using Safaricom Daraja API');
    }
  }
}

// Run the tests
const tester = new KCBBuniTester();
tester.runAllTests();


