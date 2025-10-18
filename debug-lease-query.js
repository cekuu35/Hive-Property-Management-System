import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class LeaseQueryDebugger {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  }

  // Debug the lease query
  async debugLeaseQuery(leaseId) {
    console.log(`🔍 Debugging lease query for ID: ${leaseId}\n`);
    
    try {
      // Try the current query
      console.log('1️⃣ Trying current query...');
      const currentQuery = await fetch(`${this.supabaseUrl}/rest/v1/leases?select=id,unit_id,tenant_id,units!leases_unit_id_fkey(property_id,properties!units_property_id_fkey(landlord_id))&id=eq.${leaseId}`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Status: ${currentQuery.status}`);
      if (currentQuery.ok) {
        const data = await currentQuery.json();
        console.log('✅ Current query successful:', JSON.stringify(data, null, 2));
      } else {
        const error = await currentQuery.text();
        console.log('❌ Current query failed:', error);
      }

      // Try a simpler query
      console.log('\n2️⃣ Trying simpler query...');
      const simpleQuery = await fetch(`${this.supabaseUrl}/rest/v1/leases?select=*&id=eq.${leaseId}`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Status: ${simpleQuery.status}`);
      if (simpleQuery.ok) {
        const data = await simpleQuery.json();
        console.log('✅ Simple query successful:', JSON.stringify(data, null, 2));
        
        if (data.length > 0) {
          const lease = data[0];
          console.log(`\n📋 Lease details:`);
          console.log(`   ID: ${lease.id}`);
          console.log(`   Unit ID: ${lease.unit_id}`);
          console.log(`   Tenant ID: ${lease.tenant_id}`);
          console.log(`   Rent Amount: ${lease.rent_amount}`);
          console.log(`   Status: ${lease.status}`);
        }
      } else {
        const error = await simpleQuery.text();
        console.log('❌ Simple query failed:', error);
      }

      // Try to get unit details
      console.log('\n3️⃣ Trying to get unit details...');
      const unitQuery = await fetch(`${this.supabaseUrl}/rest/v1/units?select=*&id=eq.${leaseId}`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Status: ${unitQuery.status}`);
      if (unitQuery.ok) {
        const data = await unitQuery.json();
        console.log('✅ Unit query successful:', JSON.stringify(data, null, 2));
      } else {
        const error = await unitQuery.text();
        console.log('❌ Unit query failed:', error);
      }

    } catch (error) {
      console.log('❌ Error debugging lease query:', error.message);
    }
  }

  // Run the debug
  async runDebug() {
    console.log('🚀 Debugging Lease Query\n');
    console.log('=' .repeat(50));
    
    const leaseId = '7bfd4299-e952-4d03-ac60-44b465626895';
    await this.debugLeaseQuery(leaseId);
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Debug completed!');
  }
}

// Run the debug
const leaseDebugger = new LeaseQueryDebugger();
leaseDebugger.runDebug();
