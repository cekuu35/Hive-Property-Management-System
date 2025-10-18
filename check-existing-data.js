import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ExistingDataChecker {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  }

  // Check existing landlords
  async checkExistingLandlords() {
    console.log('🔍 Checking existing landlords...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/landlords?select=*&limit=5`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Found landlords:');
        data.forEach((landlord, index) => {
          console.log(`   ${index + 1}. ID: ${landlord.id}`);
          console.log(`      Name: ${landlord.name}`);
          console.log(`      Email: ${landlord.email}`);
          console.log(`      Phone: ${landlord.phone}`);
          console.log('');
        });
        return data;
      } else {
        const error = await response.text();
        console.log('❌ Error accessing landlords:', error);
        return [];
      }
    } catch (error) {
      console.log('❌ Error checking landlords:', error.message);
      return [];
    }
  }

  // Check existing properties
  async checkExistingProperties() {
    console.log('🔍 Checking existing properties...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/properties?select=*&limit=5`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Found properties:');
        data.forEach((property, index) => {
          console.log(`   ${index + 1}. ID: ${property.id}`);
          console.log(`      Name: ${property.name}`);
          console.log(`      Landlord ID: ${property.landlord_id}`);
          console.log(`      Address: ${property.address}`);
          console.log('');
        });
        return data;
      } else {
        const error = await response.text();
        console.log('❌ Error accessing properties:', error);
        return [];
      }
    } catch (error) {
      console.log('❌ Error checking properties:', error.message);
      return [];
    }
  }

  // Check existing tenants
  async checkExistingTenants() {
    console.log('🔍 Checking existing tenants...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/tenants?select=*&limit=5`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Found tenants:');
        data.forEach((tenant, index) => {
          console.log(`   ${index + 1}. ID: ${tenant.id}`);
          console.log(`      Tenant Info ID: ${tenant.tenant_info_id}`);
          console.log(`      Unit ID: ${tenant.unit_id}`);
          console.log(`      Rent Amount: ${tenant.rent_amount}`);
          console.log(`      Status: ${tenant.status}`);
          console.log('');
        });
        return data;
      } else {
        const error = await response.text();
        console.log('❌ Error accessing tenants:', error);
        return [];
      }
    } catch (error) {
      console.log('❌ Error checking tenants:', error.message);
      return [];
    }
  }

  // Check existing leases
  async checkExistingLeases() {
    console.log('🔍 Checking existing leases...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/leases?select=*&limit=5`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Found leases:');
        data.forEach((lease, index) => {
          console.log(`   ${index + 1}. ID: ${lease.id}`);
          console.log(`      Unit ID: ${lease.unit_id}`);
          console.log(`      Tenant ID: ${lease.tenant_id}`);
          console.log(`      Rent Amount: ${lease.rent_amount}`);
          console.log(`      Status: ${lease.status}`);
          console.log('');
        });
        return data;
      } else {
        const error = await response.text();
        console.log('❌ Error accessing leases:', error);
        return [];
      }
    } catch (error) {
      console.log('❌ Error checking leases:', error.message);
      return [];
    }
  }

  // Run all checks
  async runAllChecks() {
    console.log('🚀 Checking Existing Data in Database\n');
    console.log('=' .repeat(50));
    
    const landlords = await this.checkExistingLandlords();
    const properties = await this.checkExistingProperties();
    const tenants = await this.checkExistingTenants();
    const leases = await this.checkExistingLeases();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Data check completed!');
    
    if (landlords.length > 0 && properties.length > 0 && tenants.length > 0 && leases.length > 0) {
      console.log('\n🎉 Perfect! You have existing data to test with!');
      console.log('📋 You can use these existing IDs for testing:');
      console.log(`   Landlord ID: ${landlords[0].id}`);
      console.log(`   Property ID: ${properties[0].id}`);
      console.log(`   Tenant ID: ${tenants[0].id}`);
      console.log(`   Lease ID: ${leases[0].id}`);
    } else {
      console.log('\n⚠️  Some data is missing. You may need to create more test data.');
    }
  }
}

// Run the data check
const checker = new ExistingDataChecker();
checker.runAllChecks();

