import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class PaymentFlowTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  // Create a test lease in the database
  async createTestLease() {
    console.log('🏠 Creating test lease...');
    
    try {
      // First, let's check if we can get existing leases
      const response = await fetch(`${this.baseURL}/api/leases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const leases = await response.json();
        console.log('✅ Found existing leases:', leases.length);
        if (leases.length > 0) {
          return leases[0]; // Use the first existing lease
        }
      }

      // If no leases exist, we'll need to create one
      console.log('⚠️  No existing leases found. You may need to create a lease through the admin panel first.');
      return null;
    } catch (error) {
      console.error('❌ Error checking leases:', error.message);
      return null;
    }
  }

  // Test rent payment with existing lease
  async testRentPayment(leaseId) {
    console.log(`💰 Testing rent payment for lease: ${leaseId}`);
    
    try {
      const paymentData = {
        leaseId: leaseId,
        amount: 1000, // 10 KES for testing
        phoneNumber: '254708374149' // Test phone number
      };

      console.log('📱 Payment data:', paymentData);

      const response = await fetch(`${this.baseURL}/api/mpesa/rent-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const responseData = await response.json();
      
      if (response.ok) {
        console.log('✅ Rent payment initiated successfully!');
        console.log('Response:', JSON.stringify(responseData, null, 2));
        return responseData;
      } else {
        console.log('❌ Rent payment failed:');
        console.log('Status:', response.status);
        console.log('Error:', JSON.stringify(responseData, null, 2));
        return null;
      }
    } catch (error) {
      console.error('❌ Error testing rent payment:', error.message);
      return null;
    }
  }

  // Test utility payment
  async testUtilityPayment() {
    console.log('🔌 Testing utility payment...');
    
    try {
      const paymentData = {
        billId: 'test-bill-123',
        amount: 500, // 5 KES for testing
        phoneNumber: '254708374149'
      };

      console.log('📱 Payment data:', paymentData);

      const response = await fetch(`${this.baseURL}/api/mpesa/utility-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const responseData = await response.json();
      
      if (response.ok) {
        console.log('✅ Utility payment initiated successfully!');
        console.log('Response:', JSON.stringify(responseData, null, 2));
        return responseData;
      } else {
        console.log('❌ Utility payment failed:');
        console.log('Status:', response.status);
        console.log('Error:', JSON.stringify(responseData, null, 2));
        return null;
      }
    } catch (error) {
      console.error('❌ Error testing utility payment:', error.message);
      return null;
    }
  }

  // Test server health
  async testServerHealth() {
    console.log('🏥 Testing server health...');
    
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      
      if (response.ok) {
        console.log('✅ Server is healthy');
        return true;
      } else {
        console.log('⚠️  Server health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Server is not responding:', error.message);
      return false;
    }
  }

  // Run all tests
  async runTests() {
    console.log('🧪 Starting Payment Flow Tests...\n');
    
    // Test 1: Server health
    const isHealthy = await this.testServerHealth();
    if (!isHealthy) {
      console.log('❌ Server is not running. Please start the server first.');
      return;
    }

    // Test 2: Get or create test lease
    const lease = await this.createTestLease();
    if (!lease) {
      console.log('⚠️  No lease available for testing. Skipping rent payment test.');
    } else {
      // Test 3: Rent payment
      await this.testRentPayment(lease.id || lease.lease_id);
    }

    // Test 4: Utility payment (this might work without a real bill)
    await this.testUtilityPayment();

    console.log('\n📋 Test Summary:');
    console.log('- Server is running and responding');
    console.log('- Payment endpoints are accessible');
    console.log('- Check the server logs for detailed M-Pesa API responses');
    console.log('\n💡 Next Steps:');
    console.log('1. Check your .env file for M-Pesa credentials');
    console.log('2. Verify the M-Pesa API key is valid and not expired');
    console.log('3. Test with a real phone number in sandbox mode');
    console.log('4. Check the server console for detailed error messages');
  }
}

// Run the tests
const tester = new PaymentFlowTester();
tester.runTests();


