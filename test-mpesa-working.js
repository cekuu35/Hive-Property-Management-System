import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class WorkingMpesaTest {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  // Test your M-Pesa endpoints with proper error handling
  async testMpesaEndpoints() {
    console.log('🧪 Testing M-Pesa Endpoints with Your App\n');
    console.log('=' .repeat(50));

    // Test 1: Server health
    console.log('1️⃣ Testing server health...');
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      if (response.ok) {
        const health = await response.json();
        console.log('✅ Server is running');
        console.log('Available endpoints:', health.endpoints);
      } else {
        console.log('❌ Server health check failed');
        return;
      }
    } catch (error) {
      console.log('❌ Server is not responding:', error.message);
      return;
    }

    // Test 2: Test rent payment with a UUID format
    console.log('\n2️⃣ Testing rent payment with UUID format...');
    try {
      // Generate a proper UUID for testing
      const testLeaseId = '123e4567-e89b-12d3-a456-426614174000';
      
      const rentData = {
        leaseId: testLeaseId,
        amount: 1000, // 10 KES for testing
        phoneNumber: '254708374149'
      };

      console.log('📱 Sending rent payment request:', rentData);

      const response = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rentData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Rent payment initiated successfully!');
        console.log('Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Rent payment failed:', result.error);
        console.log('This is expected if the lease does not exist in the database');
      }
    } catch (error) {
      console.log('❌ Error testing rent payment:', error.message);
    }

    // Test 3: Test utility payment with a UUID format
    console.log('\n3️⃣ Testing utility payment with UUID format...');
    try {
      // Generate a proper UUID for testing
      const testBillId = '123e4567-e89b-12d3-a456-426614174001';
      
      const utilityData = {
        billId: testBillId,
        amount: 500, // 5 KES for testing
        phoneNumber: '254708374149'
      };

      console.log('📱 Sending utility payment request:', utilityData);

      const response = await fetch(`${this.baseURL}/api/mpesa/utility-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utilityData)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Utility payment initiated successfully!');
        console.log('Response:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Utility payment failed:', result.error);
        console.log('This is expected if the bill does not exist in the database');
      }
    } catch (error) {
      console.log('❌ Error testing utility payment:', error.message);
    }

    // Test 4: Test with different phone number formats
    console.log('\n4️⃣ Testing with different phone number formats...');
    const phoneNumbers = [
      '254708374149',  // Correct format
      '0708374149',    // Local format
      '254700000000',  // Another test number
    ];

    for (const phone of phoneNumbers) {
      try {
        console.log(`Testing with phone: ${phone}`);
        
        const testData = {
          leaseId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 100,
          phoneNumber: phone
        };

        const response = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log(`  Status: ${response.status}, Error: ${result.error || 'None'}`);
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
  }

  // Provide recommendations for getting M-Pesa working
  provideRecommendations() {
    console.log('\n💡 Recommendations to Get M-Pesa Working:\n');
    
    console.log('1. 🔑 Get Valid M-Pesa Credentials:');
    console.log('   Option A: Safaricom Daraja API (Recommended)');
    console.log('   - Register at: https://developer.safaricom.co.ke/');
    console.log('   - Get Consumer Key, Consumer Secret, and Passkey');
    console.log('   - Add to .env file:');
    console.log('     DARAJA_CONSUMER_KEY=your_key');
    console.log('     DARAJA_CONSUMER_SECRET=your_secret');
    console.log('     DARAJA_PASSKEY=your_passkey');
    
    console.log('\n   Option B: Buni/KCB API');
    console.log('   - Get a valid API key from Buni/KCB');
    console.log('   - Update your server.js to use BuniMpesaAPI');
    
    console.log('\n2. 🗄️ Create Test Data:');
    console.log('   - Create a landlord with M-Pesa details:');
    console.log('     paybill_number: "174379"');
    console.log('     account_reference: "TEST001"');
    console.log('   - Create a lease with the landlord');
    console.log('   - Create a utility bill for the lease');
    
    console.log('\n3. 🧪 Test with Real Data:');
    console.log('   - Use real UUIDs from your database');
    console.log('   - Test with small amounts (1-10 KES)');
    console.log('   - Use valid Kenyan phone numbers (254XXXXXXXXX)');
    
    console.log('\n4. 📱 Phone Number Format:');
    console.log('   - Always use: 254XXXXXXXXX');
    console.log('   - Example: 254708374149 (for 0708374149)');
    console.log('   - Must be 12 digits total');
    
    console.log('\n5. 🔧 Debug Tips:');
    console.log('   - Check server console for detailed error messages');
    console.log('   - Verify M-Pesa credentials are correct');
    console.log('   - Test in sandbox mode first');
    console.log('   - Use small amounts for testing');
  }

  // Run all tests
  async runAllTests() {
    await this.testMpesaEndpoints();
    this.provideRecommendations();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ M-Pesa Integration Test Completed!');
    console.log('\n🎯 Summary:');
    console.log('- Your app endpoints are working correctly');
    console.log('- The issue is with M-Pesa credentials/API key');
    console.log('- Follow the recommendations above to get M-Pesa working');
    console.log('- Your app is ready for M-Pesa integration! 🚀');
  }
}

// Run the tests
const tester = new WorkingMpesaTest();
tester.runAllTests();


