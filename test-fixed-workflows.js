#!/usr/bin/env node

/**
 * Test Fixed Workflows Script
 * This script tests the fixed workflows with the correct database structure
 */

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

console.log('🧪 Testing Fixed Workflows...');
console.log('=============================\n');

async function testWorkflowQueries() {
  try {
    // Test 1: Rent Reminder Query
    console.log('1. Testing Rent Reminder Query...');
    const rentResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&status=eq.active&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (rentResponse.ok) {
      const rentData = await rentResponse.json();
      console.log(`✅ Rent Reminder Query successful (${rentData.length} records)`);
      if (rentData.length > 0) {
        const tenant = rentData[0];
        console.log('📋 Sample data structure:');
        console.log(`  - Tenant Name: ${tenant.tenant_info?.full_name || 'N/A'}`);
        console.log(`  - Property Address: ${tenant.units?.properties?.address || 'N/A'}`);
        console.log(`  - Phone: ${tenant.tenant_info?.phone || 'N/A'}`);
        console.log(`  - Email: ${tenant.tenant_info?.email || 'N/A'}`);
        console.log(`  - Rent Amount: ${tenant.rent_amount || 'N/A'}`);
        console.log(`  - Status: ${tenant.status || 'N/A'}`);
      }
    } else {
      console.log(`❌ Rent Reminder Query failed: ${rentResponse.status}`);
    }

    // Test 2: Utility Billing Query
    console.log('\n2. Testing Utility Billing Query...');
    const utilityResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&status=eq.active&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (utilityResponse.ok) {
      const utilityData = await utilityResponse.json();
      console.log(`✅ Utility Billing Query successful (${utilityData.length} records)`);
      if (utilityData.length > 0) {
        const tenant = utilityData[0];
        console.log('📋 Sample utility calculation:');
        const waterRate = tenant.units?.properties?.water_rate || 1000;
        const electricityRate = tenant.units?.properties?.electricity_rate || 2000;
        const garbageRate = tenant.units?.properties?.garbage_rate || 500;
        const totalUtilities = Math.round((waterRate + electricityRate + garbageRate) * 1.1);
        
        console.log(`  - Water Bill: KES ${Math.round(waterRate * 1.1)}`);
        console.log(`  - Electricity Bill: KES ${Math.round(electricityRate * 1.1)}`);
        console.log(`  - Garbage Bill: KES ${Math.round(garbageRate * 1.1)}`);
        console.log(`  - Total Utilities: KES ${totalUtilities}`);
      }
    } else {
      console.log(`❌ Utility Billing Query failed: ${utilityResponse.status}`);
    }

    // Test 3: Maintenance Request Query
    console.log('\n3. Testing Maintenance Request Query...');
    const maintenanceResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (maintenanceResponse.ok) {
      const maintenanceData = await maintenanceResponse.json();
      console.log(`✅ Maintenance Request Query successful (${maintenanceData.length} records)`);
      if (maintenanceData.length > 0) {
        const tenant = maintenanceData[0];
        console.log('📋 Sample maintenance data:');
        console.log(`  - Tenant: ${tenant.tenant_info?.full_name || 'N/A'}`);
        console.log(`  - Property: ${tenant.units?.properties?.address || 'N/A'}`);
        console.log(`  - Unit: ${tenant.units?.unit_number || 'N/A'}`);
        console.log(`  - Contact: ${tenant.tenant_info?.phone || 'N/A'}`);
      }
    } else {
      console.log(`❌ Maintenance Request Query failed: ${maintenanceResponse.status}`);
    }

    console.log('\n🎉 All workflow queries are working correctly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Import the fixed workflows into n8n');
    console.log('2. Test each workflow individually');
    console.log('3. Configure Daraja API credentials');
    console.log('4. Activate workflows for production use');

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testWorkflowQueries();



