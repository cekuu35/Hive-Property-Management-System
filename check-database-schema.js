import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DatabaseSchemaChecker {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  }

  // Check the properties table schema
  async checkPropertiesSchema() {
    console.log('🔍 Checking properties table schema...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/properties?select=*&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Properties table accessible');
        console.log('Sample data:', JSON.stringify(data, null, 2));
      } else {
        const error = await response.text();
        console.log('❌ Error accessing properties table:', error);
      }
    } catch (error) {
      console.log('❌ Error checking properties schema:', error.message);
    }
  }

  // Check the leases table schema
  async checkLeasesSchema() {
    console.log('\n🔍 Checking leases table schema...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/leases?select=*&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Leases table accessible');
        console.log('Sample data:', JSON.stringify(data, null, 2));
      } else {
        const error = await response.text();
        console.log('❌ Error accessing leases table:', error);
      }
    } catch (error) {
      console.log('❌ Error checking leases schema:', error.message);
    }
  }

  // Check the tenants table schema
  async checkTenantsSchema() {
    console.log('\n🔍 Checking tenants table schema...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/tenants?select=*&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Tenants table accessible');
        console.log('Sample data:', JSON.stringify(data, null, 2));
      } else {
        const error = await response.text();
        console.log('❌ Error accessing tenants table:', error);
      }
    } catch (error) {
      console.log('❌ Error checking tenants schema:', error.message);
    }
  }

  // Check the utility_bills table schema
  async checkUtilityBillsSchema() {
    console.log('\n🔍 Checking utility_bills table schema...\n');
    
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/utility_bills?select=*&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Utility bills table accessible');
        console.log('Sample data:', JSON.stringify(data, null, 2));
      } else {
        const error = await response.text();
        console.log('❌ Error accessing utility_bills table:', error);
      }
    } catch (error) {
      console.log('❌ Error checking utility_bills schema:', error.message);
    }
  }

  // Run all schema checks
  async runAllChecks() {
    console.log('🚀 Checking Database Schema\n');
    console.log('=' .repeat(50));
    
    await this.checkPropertiesSchema();
    await this.checkLeasesSchema();
    await this.checkTenantsSchema();
    await this.checkUtilityBillsSchema();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Database schema check completed!');
  }
}

// Run the schema check
const checker = new DatabaseSchemaChecker();
checker.runAllChecks();

