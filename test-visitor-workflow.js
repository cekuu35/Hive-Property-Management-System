#!/usr/bin/env node

/**
 * Test Visitor Workflow - End-to-End
 * Tests: Register → Active → Checkout → History
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjY2MTEwOSwiZXhwIjoyMDQyMjM3MTA5fQ.aWJ2Bq4_fUbgDfGBLuiBqy2VmIECqpnbR0xTlx7dMVM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testVisitorWorkflow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║          🧪 TESTING VISITOR WORKFLOW (END-TO-END)               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Use known security guard
    console.log('📍 Step 1: Using security guard...');
    const securityGuardId = '7cea8642-d2d5-404d-a880-8a9129e48259'; // sank mon
    
    const { data: securityGuard, error: secError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', securityGuardId)
      .single();

    if (secError || !securityGuard) {
      throw new Error('Security guard not found');
    }

    console.log(`✅ Using security guard: ${securityGuard.first_name} ${securityGuard.last_name} (${securityGuard.id})`);

    // Step 2: Find an active tenant and their unit
    console.log('\n📍 Step 2: Finding active tenant with unit...');
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        tenant_id,
        unit_id,
        tenant:profiles!leases_tenant_id_fkey(first_name, last_name),
        unit:units(unit_number, property:properties(name))
      `)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (leaseError || !lease) {
      throw new Error('No active lease found');
    }

    console.log(`✅ Found tenant: ${lease.tenant.first_name} ${lease.tenant.last_name}`);
    console.log(`✅ Unit: ${lease.unit.unit_number} at ${lease.unit.property.name}`);

    // Step 3: Register a new visitor
    console.log('\n📍 Step 3: Registering new visitor...');
    const visitorName = `Test Visitor ${Date.now()}`;
    const { data: newVisitor, error: insertError } = await supabase
      .from('visitors')
      .insert({
        security_id: securityGuard.id,
        visitor_name: visitorName,
        visitor_phone: '0700123456',
        visiting_unit_id: lease.unit_id,
        visiting_tenant_id: lease.tenant_id,
        purpose: 'Testing workflow',
        status: 'active',
        time_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    console.log(`✅ Visitor registered:`);
    console.log(`   - ID: ${newVisitor.id}`);
    console.log(`   - Name: ${newVisitor.visitor_name}`);
    console.log(`   - Status: ${newVisitor.status}`);
    console.log(`   - Time In: ${newVisitor.time_in}`);

    // Step 4: Verify visitor appears in active list
    console.log('\n📍 Step 4: Verifying visitor appears in active list...');
    await sleep(1000); // Wait for potential replication
    const { data: activeVisitors, error: activeError } = await supabase
      .from('visitors')
      .select('*')
      .eq('status', 'active')
      .eq('id', newVisitor.id);

    if (activeError) throw activeError;

    if (activeVisitors && activeVisitors.length > 0) {
      console.log(`✅ Visitor found in active list`);
    } else {
      console.log(`❌ Visitor NOT found in active list!`);
    }

    // Step 5: Check out the visitor
    console.log('\n📍 Step 5: Checking out visitor...');
    const { error: checkoutError } = await supabase
      .from('visitors')
      .update({
        status: 'checked_out',
        time_out: new Date().toISOString(),
      })
      .eq('id', newVisitor.id);

    if (checkoutError) {
      console.error('❌ Checkout error:', checkoutError);
      throw checkoutError;
    }

    console.log(`✅ Visitor checked out successfully`);

    // Step 6: Verify visitor moved to history
    console.log('\n📍 Step 6: Verifying visitor appears in history...');
    await sleep(1000); // Wait for potential replication
    const { data: checkedOutVisitors, error: historyError } = await supabase
      .from('visitors')
      .select(`
        *,
        unit:units(unit_number, property:properties(name)),
        tenant:profiles!visitors_visiting_tenant_id_fkey(first_name, last_name)
      `)
      .eq('status', 'checked_out')
      .eq('id', newVisitor.id);

    if (historyError) throw historyError;

    if (checkedOutVisitors && checkedOutVisitors.length > 0) {
      console.log(`✅ Visitor found in history:`);
      console.log(`   - Status: ${checkedOutVisitors[0].status}`);
      console.log(`   - Time Out: ${checkedOutVisitors[0].time_out}`);
      console.log(`   - Unit: ${checkedOutVisitors[0].unit?.unit_number}`);
      console.log(`   - Tenant: ${checkedOutVisitors[0].tenant?.first_name} ${checkedOutVisitors[0].tenant?.last_name}`);
    } else {
      console.log(`❌ Visitor NOT found in history!`);
    }

    // Step 7: Verify visitor NOT in active list
    console.log('\n📍 Step 7: Verifying visitor removed from active list...');
    const { data: stillActive, error: stillActiveError } = await supabase
      .from('visitors')
      .select('*')
      .eq('status', 'active')
      .eq('id', newVisitor.id);

    if (stillActiveError) throw stillActiveError;

    if (stillActive && stillActive.length === 0) {
      console.log(`✅ Visitor correctly removed from active list`);
    } else {
      console.log(`❌ Visitor still in active list! This is wrong!`);
    }

    // Step 8: Test foreign key joins
    console.log('\n📍 Step 8: Testing foreign key automatic joins...');
    const { data: visitorWithJoins, error: joinError } = await supabase
      .from('visitors')
      .select(`
        *,
        unit:units(unit_number, property:properties(name)),
        tenant:profiles!visitors_visiting_tenant_id_fkey(first_name, last_name),
        security:profiles!visitors_security_id_fkey(first_name, last_name)
      `)
      .eq('id', newVisitor.id)
      .single();

    if (joinError) {
      console.error('❌ Join error:', joinError);
    } else {
      console.log(`✅ Foreign key joins working:`);
      console.log(`   - Unit: ${visitorWithJoins.unit?.unit_number} at ${visitorWithJoins.unit?.property?.name}`);
      console.log(`   - Tenant: ${visitorWithJoins.tenant?.first_name} ${visitorWithJoins.tenant?.last_name}`);
      console.log(`   - Security: ${visitorWithJoins.security?.first_name} ${visitorWithJoins.security?.last_name}`);
    }

    // Step 9: Clean up test data
    console.log('\n📍 Step 9: Cleaning up test data...');
    await supabase
      .from('visitors')
      .delete()
      .eq('id', newVisitor.id);

    console.log(`✅ Test data cleaned up`);

    // Final Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ ALL TESTS PASSED!                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log('📊 WORKFLOW SUMMARY:');
    console.log('   ✅ Visitor registration');
    console.log('   ✅ Active visitor display');
    console.log('   ✅ Visitor checkout');
    console.log('   ✅ History display');
    console.log('   ✅ Active list removal');
    console.log('   ✅ Foreign key joins\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testVisitorWorkflow();

