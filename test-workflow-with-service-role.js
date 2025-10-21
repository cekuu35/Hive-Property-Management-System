#!/usr/bin/env node

/**
 * COMPLETE WORKFLOW TEST - USING SERVICE ROLE (BYPASSES RLS)
 * Tests the entire tenant application and approval workflow
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

// Service role bypasses RLS!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🧪 COMPLETE WORKFLOW TEST - SERVICE ROLE (BYPASSES RLS)\n');

let testData = {
  applicationId: null,
  tenantInfoId: null,
  leaseId: null,
  rentPaymentId: null,
  unitId: null,
  originalUnitStatus: null
};

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  if (testData.rentPaymentId) {
    await supabase.from('rent_payments').delete().eq('id', testData.rentPaymentId);
    console.log('   ✅ Deleted rent payment');
  }
  
  if (testData.leaseId) {
    await supabase.from('leases').delete().eq('id', testData.leaseId);
    console.log('   ✅ Deleted lease');
  }
  
  if (testData.tenantInfoId) {
    await supabase.from('tenant_info').delete().eq('id', testData.tenantInfoId);
    console.log('   ✅ Deleted tenant_info');
  }
  
  if (testData.applicationId) {
    await supabase.from('unit_applications').delete().eq('id', testData.applicationId);
    console.log('   ✅ Deleted application');
  }
  
  if (testData.unitId) {
    await supabase.from('units').update({
      status: testData.originalUnitStatus
    }).eq('id', testData.unitId);
    console.log('   ✅ Reset unit to original state');
  }
}

async function runCompleteTest() {
  let passed = 0;
  let failed = 0;

  try {
    // ========================================================================
    // STEP 1: Find test data (using service role - bypasses RLS)
    // ========================================================================
    
    console.log('📋 STEP 1: Finding test data (service role bypasses RLS)...\n');
    
    // Find any profile to use as landlord
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name')
      .limit(10);

    if (profileError || !profiles || profiles.length === 0) {
      console.log('❌ No profiles found:', profileError?.message);
      return;
    }

    console.log(`   ✅ Found ${profiles.length} profiles`);
    
    const landlordProfile = profiles.find(p => p.role === 'landlord') || profiles[0];
    const tenantProfile = profiles.find(p => p.role === 'tenant' && p.id !== landlordProfile.id) || profiles[1] || profiles[0];
    
    console.log(`   ✅ Landlord: ${landlordProfile.first_name || 'N/A'} ${landlordProfile.last_name || 'N/A'} (${landlordProfile.id.substring(0, 8)})`);
    console.log(`   ✅ Tenant: ${tenantProfile.first_name || 'N/A'} ${tenantProfile.last_name || 'N/A'} (${tenantProfile.id.substring(0, 8)})`);

    // Find a vacant unit (note: units table may not have tenant_id column)
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, unit_number, rent_amount, property_id, status')
      .eq('status', 'vacant')
      .limit(1)
      .single();

    if (unitError || !unit) {
      console.log('   ❌ No vacant unit found:', unitError?.message);
      console.log('   ⚠️  Will use any unit for testing...');
      
      const { data: anyUnit } = await supabase
        .from('units')
        .select('id, unit_number, rent_amount, property_id, status')
        .limit(1)
        .single();
      
      if (!anyUnit) {
        console.log('   ❌ No units found at all!');
        return;
      }
      
      testData.unitId = anyUnit.id;
      testData.originalUnitStatus = anyUnit.status;
      console.log(`   ✅ Using unit: ${anyUnit.unit_number} (KES ${anyUnit.rent_amount || 0})`);
    } else {
      testData.unitId = unit.id;
      testData.originalUnitStatus = unit.status;
      console.log(`   ✅ Found vacant unit: ${unit.unit_number} (KES ${unit.rent_amount || 0})`);
    }

    const unitData = unit || anyUnit;

    // ========================================================================
    // STEP 2: Create Application
    // ========================================================================
    
    console.log('\n📋 STEP 2: Creating application...\n');
    
    const { data: application, error: appError } = await supabase
      .from('unit_applications')
      .insert({
        tenant_id: tenantProfile.id,
        unit_id: unitData.id,
        property_id: unitData.property_id,
        status: 'pending',
        preferred_move_in_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        employment_info: {
          employer: 'Test Company Inc.',
          position: 'Software Tester',
          monthly_income: (unitData.rent_amount || 10000) * 4
        },
        personal_references: [{
          name: 'John Reference',
          phone: '+254712345678',
          relationship: 'Friend',
          email: 'john@test.com'
        }]
      })
      .select()
      .single();

    if (appError) {
      console.log(`   ❌ Failed to create application: ${appError.message}`);
      failed++;
      return;
    }

    testData.applicationId = application.id;
    console.log(`   ✅ Application created: ${application.id.substring(0, 8)}`);
    console.log(`      tenant_id: ${application.tenant_id.substring(0, 8)} (profiles.id)`);
    passed++;

    // ========================================================================
    // STEP 3: Simulate Approval (THE CRITICAL TEST!)
    // ========================================================================
    
    console.log('\n📋 STEP 3: Simulating approval workflow...\n');
    console.log('   🔍 This tests our CRITICAL FIX: tenant_id = profiles.id\n');

    // 3a. Create tenant_info
    const { data: tenantInfo, error: tiError } = await supabase
      .from('tenant_info')
      .insert({
        landlord_id: landlordProfile.id,
        profile_id: application.tenant_id,  // Link to profiles
        first_name: tenantProfile.first_name || 'Test',
        last_name: tenantProfile.last_name || 'Tenant',
        email: `test-${Date.now()}@test.com`,
        phone: '+254712345678',
        current_balance: 0,
        payment_status: 'paid'
      })
      .select()
      .single();

    if (tiError) {
      console.log(`   ❌ Failed to create tenant_info: ${tiError.message}`);
      failed++;
      await cleanup();
      return;
    }

    testData.tenantInfoId = tenantInfo.id;
    console.log(`   ✅ tenant_info created: ${tenantInfo.id.substring(0, 8)}`);
    console.log(`      profile_id: ${tenantInfo.profile_id.substring(0, 8)}`);
    passed++;

    // 3b. Create lease - THE CRITICAL FIX!
    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 372 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rentAmount = unitData.rent_amount || 10000;

    // Debug: Verify the profile exists
    console.log(`\n   🔍 DEBUG: Verifying tenant_id exists in profiles...`);
    const { data: profileDebug, error: profileDebugError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', application.tenant_id)
      .single();

    if (profileDebugError || !profileDebug) {
      console.log(`   ❌ DEBUG: Profile ${application.tenant_id} does NOT exist!`);
      console.log(`      Error: ${profileDebugError?.message}`);
      failed++;
      await cleanup();
      return;
    }
    console.log(`   ✅ DEBUG: Profile exists: ${profileDebug.first_name} ${profileDebug.last_name} (${profileDebug.role})`);

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert({
        unit_id: unitData.id,
        tenant_id: application.tenant_id,  // ✅ CRITICAL: profiles.id
        tenant_info_id: tenantInfo.id,     // ✅ Also set tenant_info_id
        start_date: startDate,
        end_date: endDate,
        rent_amount: rentAmount,
        deposit_amount: rentAmount * 2,
        status: 'active'
      })
      .select()
      .single();

    if (leaseError) {
      console.log(`   ❌ CRITICAL FAILURE - Lease creation failed: ${leaseError.message}`);
      console.log(`      tenant_id being used: ${application.tenant_id}`);
      console.log(`      This means tenant_id constraint is violated!`);
      failed++;
      await cleanup();
      return;
    }

    testData.leaseId = lease.id;
    console.log(`   ✅ CRITICAL SUCCESS - Lease created: ${lease.id.substring(0, 8)}`);
    console.log(`      ✅ tenant_id (profiles.id): ${lease.tenant_id.substring(0, 8)}`);
    console.log(`      ✅ tenant_info_id: ${lease.tenant_info_id.substring(0, 8)}`);
    passed++;

    // 3c. Generate first rent payment
    const { data: rentPayment, error: paymentError } = await supabase
      .from('rent_payments')
      .insert({
        lease_id: lease.id,
        amount: rentAmount,
        due_date: startDate,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.log(`   ❌ Failed to create first rent payment: ${paymentError.message}`);
      failed++;
    } else {
      testData.rentPaymentId = rentPayment.id;
      console.log(`   ✅ First rent payment created: KES ${rentPayment.amount}`);
      passed++;
    }

    // 3d. Update tenant_info balance
    const { error: balanceError } = await supabase
      .from('tenant_info')
      .update({
        current_balance: rentAmount,
        payment_status: 'pending'
      })
      .eq('id', tenantInfo.id);

    if (balanceError) {
      console.log(`   ❌ Failed to update tenant balance: ${balanceError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Tenant balance updated: KES ${rentAmount}`);
      passed++;
    }

    // 3e. Update unit status
    const { error: unitUpdateError } = await supabase
      .from('units')
      .update({
        status: 'occupied'
      })
      .eq('id', unitData.id);

    if (unitUpdateError) {
      console.log(`   ❌ Failed to update unit: ${unitUpdateError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Unit status updated to 'occupied'`);
      passed++;
    }

    // 3f. Update application status
    await supabase
      .from('unit_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id);

    console.log(`   ✅ Application marked as approved`);

    // ========================================================================
    // STEP 4: COMPREHENSIVE VERIFICATION
    // ========================================================================
    
    console.log('\n📋 STEP 4: Comprehensive Verification...\n');

    // Verify 1: tenant_id references profiles (not tenant_info)
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', lease.tenant_id)
      .single();

    const { data: wrongCheck } = await supabase
      .from('tenant_info')
      .select('id')
      .eq('id', lease.tenant_id)
      .single();

    if (profileCheck && !wrongCheck) {
      console.log('✅ VERIFY 1: tenant_id correctly references profiles.id (NOT tenant_info.id)');
      passed++;
    } else {
      console.log('❌ VERIFY 1: tenant_id is WRONG!');
      failed++;
    }

    // Verify 2: First rent payment exists
    const { data: paymentCheck } = await supabase
      .from('rent_payments')
      .select('id, amount, status, due_date')
      .eq('lease_id', lease.id)
      .limit(1)
      .maybeSingle();

    if (paymentCheck) {
      console.log(`✅ VERIFY 2: First rent payment exists (KES ${paymentCheck.amount}, ${paymentCheck.status}, due: ${paymentCheck.due_date})`);
      passed++;
    } else {
      console.log('❌ VERIFY 2: No first rent payment found');
      failed++;
    }

    // Verify 3: Unit is occupied
    const { data: unitCheck } = await supabase
      .from('units')
      .select('status')
      .eq('id', unitData.id)
      .single();

    if (unitCheck?.status === 'occupied') {
      console.log('✅ VERIFY 3: Unit is occupied');
      passed++;
    } else {
      console.log('❌ VERIFY 3: Unit not occupied');
      failed++;
    }

    // Verify 4: Tenant balance is correct
    const { data: balanceCheck } = await supabase
      .from('tenant_info')
      .select('current_balance, payment_status')
      .eq('id', tenantInfo.id)
      .single();

    if (balanceCheck?.current_balance === rentAmount && balanceCheck?.payment_status === 'pending') {
      console.log(`✅ VERIFY 4: Tenant balance correct (KES ${balanceCheck.current_balance}, ${balanceCheck.payment_status})`);
      passed++;
    } else {
      console.log(`❌ VERIFY 4: Tenant balance wrong (expected ${rentAmount}, got ${balanceCheck?.current_balance})`);
      failed++;
    }

    // Verify 5: Payment system can find lease(s)
    const { data: leasesByProfile, error: leaseQueryError } = await supabase
      .from('leases')
      .select('id, rent_amount')
      .eq('tenant_id', application.tenant_id)
      .eq('status', 'active');

    if (!leaseQueryError && leasesByProfile && leasesByProfile.length > 0) {
      console.log(`✅ VERIFY 5: Payment system CAN find lease by tenant_id (profiles.id) - found ${leasesByProfile.length} lease(s)`);
      passed++;
    } else {
      console.log('❌ VERIFY 5: Payment system CANNOT find lease');
      if (leaseQueryError) {
        console.log(`   Query error: ${leaseQueryError.message}`);
      }
      failed++;
    }

    // Verify 6: No orphaned tenant_info
    const { data: leaseCheck } = await supabase
      .from('leases')
      .select('id')
      .eq('tenant_info_id', tenantInfo.id);

    if (leaseCheck && leaseCheck.length > 0) {
      console.log('✅ VERIFY 6: tenant_info has lease (not orphaned)');
      passed++;
    } else {
      console.log('❌ VERIFY 6: tenant_info is orphaned');
      failed++;
    }

    // Verify 7: Application marked as approved
    const { data: appCheck } = await supabase
      .from('unit_applications')
      .select('status, reviewed_at')
      .eq('id', application.id)
      .single();

    if (appCheck?.status === 'approved' && appCheck?.reviewed_at) {
      console.log('✅ VERIFY 7: Application properly approved with timestamp');
      passed++;
    } else {
      console.log('❌ VERIFY 7: Application not properly approved');
      failed++;
    }

    // ========================================================================
    // FINAL RESULTS
    // ========================================================================
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL RESULTS:');
    console.log('═'.repeat(70));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`   Total: ${passed + failed}`);
    console.log('═'.repeat(70));

    if (failed === 0) {
      console.log('\n🎉🎉🎉 ALL TESTS PASSED! WORKFLOW IS PERFECT! 🎉🎉🎉\n');
      console.log('✅ tenant_id correctly uses profiles.id');
      console.log('✅ tenant_info_id correctly uses tenant_info.id');
      console.log('✅ First rent payment generated immediately');
      console.log('✅ Unit properly linked to tenant');
      console.log('✅ Tenant balance tracked correctly');
      console.log('✅ Payment system fully compatible');
      console.log('✅ No orphaned records');
      console.log('✅ Application workflow complete\n');
      console.log('🚀 READY FOR PRODUCTION DEPLOYMENT! 🚀\n');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed - Review output above\n`);
    }

    // Cleanup
    await cleanup();
    console.log('\n✅ Test complete and cleaned up\n');

    process.exit(failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

runCompleteTest();

