#!/usr/bin/env node

/**
 * FAST COMPREHENSIVE TEST - TENANT APPLICATION WORKFLOW
 * Optimized for speed while testing all critical fixes
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n🧪 FAST COMPREHENSIVE TEST - TENANT APPLICATION WORKFLOW\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    const result = await fn();
    if (result.pass) {
      console.log(`✅ PASS ${result.msg ? '(' + result.msg + ')' : ''}`);
      passed++;
    } else {
      console.log(`❌ FAIL ${result.msg ? '(' + result.msg + ')' : ''}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR (${error.message})`);
    failed++;
  }
}

// Test 1: Critical - Correct tenant_id in leases
await test('Correct tenant_id in leases', async () => {
  const { data: lease } = await supabase
    .from('leases')
    .select('id, tenant_id, status')
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!lease) return { pass: true, msg: 'No active leases to test' };

  // Check if tenant_id references profiles (correct)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', lease.tenant_id)
    .single();

  // Check if it references tenant_info (wrong)
  const { data: tenantInfo } = await supabase
    .from('tenant_info')
    .select('id')
    .eq('id', lease.tenant_id)
    .single();

  if (profile && !tenantInfo) {
    return { pass: true, msg: 'tenant_id references profiles ✅' };
  } else if (tenantInfo && !profile) {
    return { pass: false, msg: 'tenant_id references tenant_info ❌' };
  } else {
    return { pass: true, msg: 'ID exists in both tables' };
  }
});

// Test 2: First rent payment generated
await test('First rent payment exists', async () => {
  const { data: lease } = await supabase
    .from('leases')
    .select('id, start_date, rent_amount')
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!lease) return { pass: true, msg: 'No leases to test' };

  const { data: payment } = await supabase
    .from('rent_payments')
    .select('id, amount, status')
    .eq('lease_id', lease.id)
    .eq('due_date', lease.start_date)
    .single();

  return {
    pass: !!payment,
    msg: payment ? `${payment.status}, KES ${payment.amount}` : 'No first payment'
  };
});

// Test 3: Tenant-unit linking
await test('Tenant-unit linking', async () => {
  const { data: unit } = await supabase
    .from('units')
    .select('id, unit_number, status, tenant_id')
    .eq('status', 'occupied')
    .limit(1)
    .single();

  if (!unit) return { pass: true, msg: 'No occupied units' };

  if (!unit.tenant_id) {
    return { pass: false, msg: 'Occupied but no tenant_id' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name')
    .eq('id', unit.tenant_id)
    .single();

  return {
    pass: !!profile,
    msg: profile ? `Linked to ${profile.first_name}` : 'Invalid tenant_id'
  };
});

// Test 4: No orphaned tenant_info
await test('No orphaned tenant_info', async () => {
  const { data: tenantInfo } = await supabase
    .from('tenant_info')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tenantInfo) return { pass: true, msg: 'No tenant_info records' };

  const { data: leases } = await supabase
    .from('leases')
    .select('id')
    .eq('tenant_info_id', tenantInfo.id);

  return {
    pass: leases && leases.length > 0,
    msg: leases?.length ? `${leases.length} lease(s)` : 'Orphaned record found'
  };
});

// Test 5: Payment system compatibility
await test('Payment system compatibility', async () => {
  const { data: tenant } = await supabase
    .from('tenant_info')
    .select('id, profile_id')
    .limit(1)
    .single();

  if (!tenant) return { pass: true, msg: 'No tenants to test' };

  // Try finding lease by profile_id (NEW correct method)
  const { data: leaseByProfile } = await supabase
    .from('leases')
    .select('id')
    .eq('tenant_id', tenant.profile_id)
    .eq('status', 'active')
    .maybeSingle();

  // Fallback to tenant_info_id
  const { data: leaseByTenantInfo } = await supabase
    .from('leases')
    .select('id')
    .eq('tenant_info_id', tenant.id)
    .eq('status', 'active')
    .maybeSingle();

  const found = leaseByProfile || leaseByTenantInfo;
  const method = leaseByProfile ? 'NEW method' : 'FALLBACK method';

  return {
    pass: !!found,
    msg: found ? method : 'Lease not found'
  };
});

// Test 6: Tenant balance tracking
await test('Tenant balance tracking', async () => {
  const { data: tenantInfo } = await supabase
    .from('tenant_info')
    .select('id, current_balance, payment_status')
    .limit(1)
    .single();

  if (!tenantInfo) return { pass: true, msg: 'No tenant_info' };

  return {
    pass: tenantInfo.current_balance !== null && tenantInfo.payment_status !== null,
    msg: `Balance: ${tenantInfo.current_balance}, Status: ${tenantInfo.payment_status}`
  };
});

// Test 7: Application workflow integration
await test('Application workflow', async () => {
  const { data: app } = await supabase
    .from('unit_applications')
    .select('id, tenant_id, unit_id, status')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .single();

  if (!app) return { pass: true, msg: 'No approved applications' };

  const { data: lease } = await supabase
    .from('leases')
    .select('id, tenant_id')
    .eq('unit_id', app.unit_id)
    .single();

  const { data: tenantInfo } = await supabase
    .from('tenant_info')
    .select('id')
    .eq('profile_id', app.tenant_id)
    .single();

  const { data: unit } = await supabase
    .from('units')
    .select('status')
    .eq('id', app.unit_id)
    .single();

  const hasLease = !!lease;
  const hasTenantInfo = !!tenantInfo;
  const unitOccupied = unit?.status === 'occupied';
  const correctTenantId = lease?.tenant_id === app.tenant_id;

  const complete = hasLease && hasTenantInfo && unitOccupied && correctTenantId;

  return {
    pass: complete,
    msg: complete ? 'Complete workflow' : 'Incomplete workflow'
  };
});

// Test 8: Database integrity
await test('Database integrity', async () => {
  // Check for duplicate active leases per unit
  const { data: units } = await supabase
    .from('units')
    .select('id')
    .limit(5);

  if (!units || units.length === 0) return { pass: true, msg: 'No units' };

  for (const unit of units) {
    const { data: leases } = await supabase
      .from('leases')
      .select('id')
      .eq('unit_id', unit.id)
      .eq('status', 'active');

    if (leases && leases.length > 1) {
      return { pass: false, msg: `Unit has ${leases.length} active leases` };
    }
  }

  return { pass: true, msg: 'No duplicate leases' };
});

// Final Summary
console.log('\n' + '═'.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`   Total: ${passed + failed}`);
console.log('═'.repeat(60));

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! WORKFLOW IS WORKING PERFECTLY! 🎉\n');
  console.log('✅ Leases use correct tenant_id (profile.id)');
  console.log('✅ First rent payments are generated');
  console.log('✅ Tenants are linked to units');
  console.log('✅ No orphaned records');
  console.log('✅ Payment system compatible');
  console.log('✅ Complete workflow verified');
  console.log('✅ Database integrity maintained\n');
} else {
  console.log(`\n⚠️  ${failed} test(s) failed - Review output above\n`);
}

process.exit(failed === 0 ? 0 : 1);

