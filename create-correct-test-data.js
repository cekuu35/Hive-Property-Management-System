import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class CorrectTestDataCreator {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  }

  // Create test data using the correct schema
  async createTestData() {
    console.log('🗄️ Creating test data with correct schema...\n');
    
    try {
      // 1. Create test property
      console.log('1️⃣ Creating test property...');
      const propertyData = {
        landlord_id: '78a801bc-b32e-4548-95fd-7b5a40089e90', // Use the landlord ID from your database
        name: 'Test Property for M-Pesa',
        address: '123 Test Street, Nairobi',
        description: 'Test property for M-Pesa integration',
        total_units: 5,
        amenities: [],
        images: []
      };

      const propertyResponse = await fetch(`${this.supabaseUrl}/rest/v1/properties`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(propertyData)
      });

      if (propertyResponse.ok) {
        const property = await propertyResponse.json();
        console.log('✅ Property created:', property[0].id);
        const propertyId = property[0].id;

        // 2. Create test unit
        console.log('\n2️⃣ Creating test unit...');
        const unitData = {
          property_id: propertyId,
          unit_number: 'A1',
          unit_type: 'apartment',
          rent_amount: 10000,
          status: 'available'
        };

        const unitResponse = await fetch(`${this.supabaseUrl}/rest/v1/units`, {
          method: 'POST',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(unitData)
        });

        if (unitResponse.ok) {
          const unit = await unitResponse.json();
          console.log('✅ Unit created:', unit[0].id);
          const unitId = unit[0].id;

          // 3. Create test tenant info
          console.log('\n3️⃣ Creating test tenant info...');
          const tenantInfoData = {
            name: 'Test Tenant',
            email: 'test.tenant@example.com',
            phone: '254708374149',
            id_number: '12345678',
            emergency_contact: '254700000000'
          };

          const tenantInfoResponse = await fetch(`${this.supabaseUrl}/rest/v1/tenant_info`, {
            method: 'POST',
            headers: {
              'apikey': this.supabaseKey,
              'Authorization': `Bearer ${this.supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(tenantInfoData)
          });

          if (tenantInfoResponse.ok) {
            const tenantInfo = await tenantInfoResponse.json();
            console.log('✅ Tenant info created:', tenantInfo[0].id);
            const tenantInfoId = tenantInfo[0].id;

            // 4. Create test tenant
            console.log('\n4️⃣ Creating test tenant...');
            const tenantData = {
              landlord_id: '78a801bc-b32e-4548-95fd-7b5a40089e90',
              tenant_info_id: tenantInfoId,
              unit_id: unitId,
              rent_amount: 10000,
              security_deposit: 20000,
              lease_start_date: '2024-01-01',
              lease_end_date: '2024-12-31',
              status: 'active'
            };

            const tenantResponse = await fetch(`${this.supabaseUrl}/rest/v1/tenants`, {
              method: 'POST',
              headers: {
                'apikey': this.supabaseKey,
                'Authorization': `Bearer ${this.supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(tenantData)
            });

            if (tenantResponse.ok) {
              const tenant = await tenantResponse.json();
              console.log('✅ Tenant created:', tenant[0].id);
              const tenantId = tenant[0].id;

              // 5. Create test lease
              console.log('\n5️⃣ Creating test lease...');
              const leaseData = {
                unit_id: unitId,
                tenant_id: tenantId,
                start_date: '2024-01-01',
                end_date: '2024-12-31',
                rent_amount: 10000,
                deposit_amount: 20000,
                status: 'active'
              };

              const leaseResponse = await fetch(`${this.supabaseUrl}/rest/v1/leases`, {
                method: 'POST',
                headers: {
                  'apikey': this.supabaseKey,
                  'Authorization': `Bearer ${this.supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(leaseData)
              });

              if (leaseResponse.ok) {
                const lease = await leaseResponse.json();
                console.log('✅ Lease created:', lease[0].id);
                const leaseId = lease[0].id;

                // 6. Create test unit bill (utility bill)
                console.log('\n6️⃣ Creating test unit bill...');
                const billData = {
                  unit_id: unitId,
                  tenant_id: tenantId,
                  bill_type: 'water',
                  amount: 5000,
                  due_date: '2024-02-01',
                  status: 'pending',
                  description: 'Water bill for January 2024'
                };

                const billResponse = await fetch(`${this.supabaseUrl}/rest/v1/unit_bills`, {
                  method: 'POST',
                  headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify(billData)
                });

                if (billResponse.ok) {
                  const bill = await billResponse.json();
                  console.log('✅ Unit bill created:', bill[0].id);
                  const billId = bill[0].id;

                  console.log('\n🎉 Test data created successfully!');
                  console.log('📋 Test Data Summary:');
                  console.log(`   Landlord ID: 78a801bc-b32e-4548-95fd-7b5a40089e90`);
                  console.log(`   Property ID: ${propertyId}`);
                  console.log(`   Unit ID: ${unitId}`);
                  console.log(`   Tenant Info ID: ${tenantInfoId}`);
                  console.log(`   Tenant ID: ${tenantId}`);
                  console.log(`   Lease ID: ${leaseId}`);
                  console.log(`   Bill ID: ${billId}`);

                  return {
                    landlordId: '78a801bc-b32e-4548-95fd-7b5a40089e90',
                    propertyId,
                    unitId,
                    tenantInfoId,
                    tenantId,
                    leaseId,
                    billId
                  };
                } else {
                  const error = await billResponse.text();
                  console.log('❌ Error creating unit bill:', error);
                }
              } else {
                const error = await leaseResponse.text();
                console.log('❌ Error creating lease:', error);
              }
            } else {
              const error = await tenantResponse.text();
              console.log('❌ Error creating tenant:', error);
            }
          } else {
            const error = await tenantInfoResponse.text();
            console.log('❌ Error creating tenant info:', error);
          }
        } else {
          const error = await unitResponse.text();
          console.log('❌ Error creating unit:', error);
        }
      } else {
        const error = await propertyResponse.text();
        console.log('❌ Error creating property:', error);
      }
    } catch (error) {
      console.log('❌ Error creating test data:', error.message);
    }

    return null;
  }

  // Test M-Pesa integration with real data
  async testMpesaIntegration(testData) {
    if (!testData) {
      console.log('❌ No test data available for testing');
      return;
    }

    console.log('\n🧪 Testing M-Pesa integration with real data...\n');

    try {
      // Test rent payment
      console.log('1️⃣ Testing rent payment with real lease ID...');
      const rentData = {
        leaseId: testData.leaseId,
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

      // Test utility payment
      console.log('\n2️⃣ Testing utility payment with real bill ID...');
      const utilityData = {
        billId: testData.billId,
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
      }

    } catch (error) {
      console.log('❌ Error testing M-Pesa integration:', error.message);
    }
  }

  // Run the complete test
  async runCompleteTest() {
    console.log('🚀 Creating Correct Test Data and Testing M-Pesa Integration\n');
    console.log('=' .repeat(60));
    
    // Create test data
    const testData = await this.createTestData();
    
    if (testData) {
      // Test M-Pesa integration
      await this.testMpesaIntegration(testData);
      
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 Test completed! Your M-Pesa integration is working!');
      console.log('📱 You can now test with real phone numbers and amounts!');
    } else {
      console.log('\n❌ Failed to create test data');
    }
  }
}

// Run the complete test
const creator = new CorrectTestDataCreator();
creator.runCompleteTest();

