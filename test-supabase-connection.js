#!/usr/bin/env node

/**
 * Test Supabase Connection Script
 * This script tests the Supabase connection and checks the data structure
 */

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

console.log('🔍 Testing Supabase Connection...');
console.log('=================================\n');

async function testSupabaseConnection() {
  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Basic connection successful');
    } else {
      console.log(`❌ Basic connection failed: ${response.status}`);
      return;
    }

    // Test 2: Check tenants table
    console.log('\n2. Testing tenants table...');
    const tenantsResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (tenantsResponse.ok) {
      const tenants = await tenantsResponse.json();
      console.log(`✅ Tenants table accessible (${tenants.length} records)`);
      console.log('📋 Sample tenant structure:');
      if (tenants.length > 0) {
        console.log(JSON.stringify(tenants[0], null, 2));
      }
    } else {
      console.log(`❌ Tenants table failed: ${tenantsResponse.status}`);
      const error = await tenantsResponse.text();
      console.log(`Error: ${error}`);
    }

    // Test 3: Check properties table
    console.log('\n3. Testing properties table...');
    const propertiesResponse = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (propertiesResponse.ok) {
      const properties = await propertiesResponse.json();
      console.log(`✅ Properties table accessible (${properties.length} records)`);
      console.log('📋 Sample property structure:');
      if (properties.length > 0) {
        console.log(JSON.stringify(properties[0], null, 2));
      }
    } else {
      console.log(`❌ Properties table failed: ${propertiesResponse.status}`);
      const error = await propertiesResponse.text();
      console.log(`Error: ${error}`);
    }

    // Test 4: Check tenants with properties join
    console.log('\n4. Testing tenants with properties join...');
    const joinResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*,properties(*)&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (joinResponse.ok) {
      const joinData = await joinResponse.json();
      console.log(`✅ Join query successful (${joinData.length} records)`);
      console.log('📋 Sample joined data structure:');
      if (joinData.length > 0) {
        console.log(JSON.stringify(joinData[0], null, 2));
      }
    } else {
      console.log(`❌ Join query failed: ${joinResponse.status}`);
      const error = await joinResponse.text();
      console.log(`Error: ${error}`);
    }

  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
  }
}

testSupabaseConnection();



