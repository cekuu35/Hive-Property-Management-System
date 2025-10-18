#!/usr/bin/env node

/**
 * Check Database Structure Script
 * This script checks the actual database structure to fix the workflows
 */

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

console.log('🔍 Checking Database Structure...');
console.log('=================================\n');

async function checkDatabaseStructure() {
  try {
    // Check units table
    console.log('1. Checking units table...');
    const unitsResponse = await fetch(`${SUPABASE_URL}/rest/v1/units?select=*&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (unitsResponse.ok) {
      const units = await unitsResponse.json();
      console.log(`✅ Units table accessible (${units.length} records)`);
      if (units.length > 0) {
        console.log('📋 Units structure:');
        console.log(JSON.stringify(units[0], null, 2));
      }
    } else {
      console.log(`❌ Units table failed: ${unitsResponse.status}`);
    }

    // Check tenant_info table
    console.log('\n2. Checking tenant_info table...');
    const tenantInfoResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenant_info?select=*&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (tenantInfoResponse.ok) {
      const tenantInfo = await tenantInfoResponse.json();
      console.log(`✅ Tenant Info table accessible (${tenantInfo.length} records)`);
      if (tenantInfo.length > 0) {
        console.log('📋 Tenant Info structure:');
        console.log(JSON.stringify(tenantInfo[0], null, 2));
      }
    } else {
      console.log(`❌ Tenant Info table failed: ${tenantInfoResponse.status}`);
    }

    // Check tenants with units join
    console.log('\n3. Checking tenants with units join...');
    const tenantsUnitsResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*,units(*)&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (tenantsUnitsResponse.ok) {
      const tenantsUnits = await tenantsUnitsResponse.json();
      console.log(`✅ Tenants with units join successful (${tenantsUnits.length} records)`);
      if (tenantsUnits.length > 0) {
        console.log('📋 Tenants with units structure:');
        console.log(JSON.stringify(tenantsUnits[0], null, 2));
      }
    } else {
      console.log(`❌ Tenants with units join failed: ${tenantsUnitsResponse.status}`);
    }

    // Check tenants with tenant_info join
    console.log('\n4. Checking tenants with tenant_info join...');
    const tenantsInfoResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*,tenant_info(*)&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (tenantsInfoResponse.ok) {
      const tenantsInfo = await tenantsInfoResponse.json();
      console.log(`✅ Tenants with tenant_info join successful (${tenantsInfo.length} records)`);
      if (tenantsInfo.length > 0) {
        console.log('📋 Tenants with tenant_info structure:');
        console.log(JSON.stringify(tenantsInfo[0], null, 2));
      }
    } else {
      console.log(`❌ Tenants with tenant_info join failed: ${tenantsInfoResponse.status}`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

checkDatabaseStructure();



