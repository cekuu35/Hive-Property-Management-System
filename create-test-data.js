import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class TestDataCreator {
  constructor() {
    this.baseURL = 'http://localhost:3001';
  }

  // Create test landlord with M-Pesa details
  async createTestLandlord() {
    console.log('🏠 Creating test landlord...');
    
    try {
      const landlordData = {
        name: 'Test Landlord',
        email: 'test.landlord@example.com',
        phone: '254700000000',
        paybill_number: '174379',
        account_reference: 'TEST001'
      };

      const response = await fetch(`${this.baseURL}/api/landlords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(landlordData)
      });

      if (response.ok) {
        const landlord = await response.json();
        console.log('✅ Test landlord created:', landlord.id);
        return landlord;
      } else {
        const error = await response.json();
        console.log('❌ Error creating landlord:', error);
        return null;
      }
    } catch (error) {
      console.log('❌ Error creating landlord:', error.message);
      return null;
    }
  }

  // Create test property
  async createTestProperty(landlordId) {
    console.log('🏢 Creating test property...');
    
    try {
      const propertyData = {
        landlord_id: landlordId,
        name: 'Test Property',
        address: '123 Test Street, Nairobi',
        property_type: 'apartment',
        units_count: 5
      };

      const response = await fetch(`${this.baseURL}/api/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData)
      });

      if (response.ok) {
        const property = await response.json();
        console.log('✅ Test property created:', property.id);
        return property;
      } else {
        const error = await response.json();
        console.log('❌ Error creating property:', error);
        return null;
      }
    } catch (error) {
      console.log('❌ Error creating property:', error.message);
      return null;
    }
  }

  // Create test tenant
  async createTestTenant() {
    console.log('👤 Creating test tenant...');
    
    try {
      const tenantData = {
        name: 'Test Tenant',
        email: 'test.tenant@example.com',
        phone: '254708374149'
      };

      const response = await fetch(`${this.baseURL}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData)
      });

      if (response.ok) {
        const tenant = await response.json();
        console.log('✅ Test tenant created:', tenant.id);
        return tenant;
      } else {
        const error = await response.json();
        console.log('❌ Error creating tenant:', error);
        return null;
      }
    } catch (error) {
      console.log('❌ Error creating tenant:', error.message);
      return null;
    }
  }

  // Create test lease
  async createTestLease(landlordId, propertyId, tenantId) {
    console.log('📋 Creating test lease...');
    
    try {
      const leaseData = {
        landlord_id: landlordId,
        property_id: propertyId,
        tenant_id: tenantId,
        monthly_rent: 10000,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'active'
      };

      const response = await fetch(`${this.baseURL}/api/leases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaseData)
      });

      if (response.ok) {
        const lease = await response.json();
        console.log('✅ Test lease created:', lease.id);
        return lease;
      } else {
        const error = await response.json();
        console.log('❌ Error creating lease:', error);
        return null;
      }
    } catch (error) {
      console.log('❌ Error creating lease:', error.message);
      return null;
    }
  }

  // Create test utility bill
  async createTestUtilityBill(leaseId) {
    console.log('💡 Creating test utility bill...');
    
    try {
      const billData = {
        lease_id: leaseId,
        utilities_id: '1', // Assuming utilities table has ID 1
        amount: 5000,
        due_date: '2024-02-01',
        status: 'pending'
      };

      const response = await fetch(`${this.baseURL}/api/utility-bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      if (response.ok) {
        const bill = await response.json();
        console.log('✅ Test utility bill created:', bill.id);
        return bill;
      } else {
        const error = await response.json();
        console.log('❌ Error creating utility bill:', error);
        return null;
      }
    } catch (error) {
      console.log('❌ Error creating utility bill:', error.message);
      return null;
    }
  }

  // Test payment with real data
  async testPaymentWithRealData(leaseId, billId) {
    console.log('\n💰 Testing payments with real data...\n');

    // Test rent payment
    console.log('1️⃣ Testing rent payment...');
    try {
      const rentData = {
        leaseId: leaseId,
        amount: 1000, // 10 KES for testing
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
    } catch (error) {
      console.log('❌ Error testing rent payment:', error.message);
    }

    // Test utility payment
    console.log('\n2️⃣ Testing utility payment...');
    try {
      const utilityData = {
        billId: billId,
        amount: 500, // 5 KES for testing
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
      }
    } catch (error) {
      console.log('❌ Error testing utility payment:', error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Creating Test Data for M-Pesa Integration\n');
    console.log('=' .repeat(50));
    
    try {
      // Create test data
      const landlord = await this.createTestLandlord();
      if (!landlord) {
        console.log('❌ Failed to create landlord. Stopping.');
        return;
      }

      const property = await this.createTestProperty(landlord.id);
      if (!property) {
        console.log('❌ Failed to create property. Stopping.');
        return;
      }

      const tenant = await this.createTestTenant();
      if (!tenant) {
        console.log('❌ Failed to create tenant. Stopping.');
        return;
      }

      const lease = await this.createTestLease(landlord.id, property.id, tenant.id);
      if (!lease) {
        console.log('❌ Failed to create lease. Stopping.');
        return;
      }

      const bill = await this.createTestUtilityBill(lease.id);
      if (!bill) {
        console.log('⚠️  Failed to create utility bill, but continuing...');
      }

      // Test payments
      await this.testPaymentWithRealData(lease.id, bill?.id);

      console.log('\n' + '=' .repeat(50));
      console.log('✅ Test data creation completed!');
      console.log('\n📋 Created:');
      console.log('- Landlord ID:', landlord.id);
      console.log('- Property ID:', property.id);
      console.log('- Tenant ID:', tenant.id);
      console.log('- Lease ID:', lease.id);
      if (bill) console.log('- Utility Bill ID:', bill.id);
      
      console.log('\n💡 You can now test payments using these real IDs!');

    } catch (error) {
      console.error('❌ Error in test data creation:', error);
    }
  }
}

// Run the tests
const creator = new TestDataCreator();
creator.runAllTests();


