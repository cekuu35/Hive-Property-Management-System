import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, message, color = 'reset') {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

// Test data - replace with your actual test tenant
const TEST_TENANT = {
  profileId: 'cfb944ed-0908-4862-bf59-a83a468dd356', // Your test tenant's profile_id
  tenantInfoId: null, // Will be fetched
  leaseId: null // Will be fetched
};

// Test scenarios
const SCENARIOS = {
  ON_TIME: 'On-Time Payment',
  LATE_FULL: 'Late Full Payment',
  LATE_PARTIAL: 'Late Partial Payment'
};

let currentScenario = null;
let initialBalance = null;
let testLease = null;

// Utility functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatKES(amount) {
  return `KES ${amount?.toLocaleString() || '0'}`;
}

async function fetchTenantInfo() {
  log('🔍', 'Fetching tenant info...', 'cyan');
  
  const { data, error } = await supabase
    .from('tenant_info')
    .select('*')
    .eq('profile_id', TEST_TENANT.profileId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    log('❌', `Error fetching tenant info: ${error.message}`, 'red');
    return null;
  }

  TEST_TENANT.tenantInfoId = data.id;
  log('✅', `Tenant info found: ID ${data.id}`, 'green');
  return data;
}

async function fetchActiveLease() {
  log('🔍', 'Fetching active lease...', 'cyan');
  
  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_info_id', TEST_TENANT.tenantInfoId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    log('❌', `Error fetching lease: ${error.message}`, 'red');
    return null;
  }

  if (!data) {
    log('⚠️', 'No active lease found', 'yellow');
    return null;
  }

  TEST_TENANT.leaseId = data.id;
  testLease = data;
  log('✅', `Active lease found: ID ${data.id}, Rent: ${formatKES(data.rent_amount)}`, 'green');
  return data;
}

async function getCurrentBalance() {
  const { data, error } = await supabase
    .from('tenant_info')
    .select('current_balance, payment_status')
    .eq('id', TEST_TENANT.tenantInfoId)
    .single();

  if (error) return null;
  return {
    balance: data.current_balance || 0,
    status: data.payment_status
  };
}

async function getRentPayments(status = null) {
  let query = supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', TEST_TENANT.leaseId)
    .order('due_date', { ascending: false })
    .limit(10);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    log('❌', `Error fetching payments: ${error.message}`, 'red');
    return [];
  }

  return data || [];
}

function printBalance(balance, status) {
  const color = balance > 0 ? 'red' : 'green';
  log('💰', `Current Balance: ${formatKES(balance)}, Status: ${status}`, color);
}

async function createRentPayment() {
  log('📅', 'Simulating Day 1 - Monthly rent generation...', 'blue');
  
  const today = new Date();
  const dueDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
    .toISOString().split('T')[0];

  // Check if payment already exists
  const existingPayments = await getRentPayments();
  const existing = existingPayments.find(p => p.due_date === dueDate);
  
  if (existing) {
    log('⏭️', `Payment already exists for ${dueDate}`, 'yellow');
    return existing;
  }

  const { data, error } = await supabase
    .from('rent_payments')
    .insert({
      lease_id: TEST_TENANT.leaseId,
      amount: testLease.rent_amount,
      due_date: dueDate,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    log('❌', `Error creating payment: ${error.message}`, 'red');
    return null;
  }

  log('✅', `Created rent payment: ${formatKES(data.amount)} due ${dueDate}`, 'green');

  // Update tenant balance
  const balance = await getCurrentBalance();
  const newBalance = (balance.balance || 0) + data.amount;
  
  await supabase
    .from('tenant_info')
    .update({
      current_balance: newBalance,
      payment_status: 'unpaid',
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_TENANT.tenantInfoId);

  log('✅', `Updated tenant balance: ${formatKES(balance.balance)} → ${formatKES(newBalance)}`, 'green');

  return data;
}

async function simulateOverdueFees() {
  log('⏰', 'Simulating Day 5 - Overdue detection...', 'blue');
  
  const pendingPayments = await getRentPayments('pending');
  const overduePayments = pendingPayments.filter(p => {
    const dueDate = new Date(p.due_date);
    const today = new Date();
    return dueDate < today;
  });

  if (overduePayments.length === 0) {
    log('✅', 'No overdue payments found', 'green');
    return;
  }

  for (const payment of overduePayments) {
    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue <= 0) continue;

    // Calculate late fee (2% per day, max 10%)
    const lateFeePercentage = Math.min(daysOverdue * 2, 10);
    const lateFee = Math.round(payment.amount * lateFeePercentage / 100);

    log('⚠️', `Payment ${daysOverdue} days overdue, calculating late fee...`, 'yellow');
    log('💸', `Late fee: ${lateFeePercentage}% = ${formatKES(lateFee)}`, 'yellow');

    // Update payment
    await supabase
      .from('rent_payments')
      .update({
        status: 'overdue',
        late_fee: lateFee,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    // Update tenant balance
    const balance = await getCurrentBalance();
    const newBalance = (balance.balance || 0) + lateFee;
    
    await supabase
      .from('tenant_info')
      .update({
        current_balance: newBalance,
        payment_status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .eq('id', TEST_TENANT.tenantInfoId);

    log('✅', `Balance updated: ${formatKES(balance.balance)} → ${formatKES(newBalance)}`, 'green');
  }
}

async function simulatePayment(amount, isPartial = false) {
  log('💳', `Simulating payment of ${formatKES(amount)}...`, 'blue');
  
  const balance = await getCurrentBalance();
  const currentBalance = balance.balance || 0;
  
  log('📊', `Current balance before payment: ${formatKES(currentBalance)}`, 'cyan');

  if (currentBalance === 0) {
    log('⚠️', 'No balance to pay!', 'yellow');
    return false;
  }

  // Find the most recent pending/overdue payment
  const pendingPayments = await getRentPayments();
  const unpaidPayments = pendingPayments.filter(p => p.status !== 'paid');
  
  if (unpaidPayments.length === 0) {
    log('⚠️', 'No unpaid payments found!', 'yellow');
    return false;
  }

  const payment = unpaidPayments[0];
  const reference = `TEST-${Date.now()}`;

  // Update payment record
  const today = new Date();
  const paidDateISO = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  
  const updatedPayment = {
    status: 'paid',
    paid_date: paidDateISO,
    transaction_reference: reference,
    payment_method: 'card', // Valid: 'mpesa', 'bank_transfer', 'card', 'cash'
    updated_at: new Date().toISOString()
  };

  const { error: paymentError } = await supabase
    .from('rent_payments')
    .update(updatedPayment)
    .eq('id', payment.id);

  if (paymentError) {
    log('❌', `Error updating payment: ${paymentError.message}`, 'red');
    return false;
  }

  log('✅', `Payment marked as paid: ${reference}`, 'green');

  // Update tenant balance - THE KEY FIX
  const newBalance = Math.max(0, currentBalance - amount);
  const shouldMarkPaid = newBalance === 0;

  const { error: balanceError } = await supabase
    .from('tenant_info')
    .update({
      current_balance: newBalance,
      payment_status: shouldMarkPaid ? 'paid' : 'unpaid',
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_TENANT.tenantInfoId);

  if (balanceError) {
    log('❌', `Error updating balance: ${balanceError.message}`, 'red');
    return false;
  }

  log('✅', `Balance updated: ${formatKES(currentBalance)} → ${formatKES(newBalance)}`, 'green');
  log('📊', `Payment Status: ${shouldMarkPaid ? 'PAID IN FULL ✅' : 'PARTIAL PAYMENT ⚠️'}`, shouldMarkPaid ? 'green' : 'yellow');

  return true;
}

// Main test runner
async function runTests() {
  log('🚀', 'Starting Rent Payment Workflow Tests', 'magenta');
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');

  try {
    // Step 1: Setup
    const tenantInfo = await fetchTenantInfo();
    if (!tenantInfo) {
      log('❌', 'Cannot proceed without tenant info', 'red');
      return;
    }

    const lease = await fetchActiveLease();
    if (!lease) {
      log('❌', 'Cannot proceed without active lease', 'red');
      return;
    }

    initialBalance = await getCurrentBalance();
    log('━', '═══════════════════════════════════════════════════════════════', 'cyan');
    log('📋', 'Initial State:', 'blue');
    printBalance(initialBalance.balance, initialBalance.status);
    log('━', '═══════════════════════════════════════════════════════════════', 'cyan');

    // Ask user which test to run
    console.log('\n');
    log('🎯', 'Available Test Scenarios:', 'cyan');
    console.log('1. On-Time Payment (pay on Day 1, no late fees)');
    console.log('2. Late Full Payment (pay on Day 5, with late fees)');
    console.log('3. Late Partial Payment (pay part of amount on Day 5)');
    console.log('4. Run All Tests');
    console.log('\n');

    // For now, run all tests
    const tests = ['1', '2', '3', '4'];
    const choice = '4'; // Can be made interactive later

    if (choice === '1' || choice === '4') {
      await runOnTimeTest();
    }

    if (choice === '2' || choice === '4') {
      await runLateFullTest();
    }

    if (choice === '3' || choice === '4') {
      await runLatePartialTest();
    }

    log('━', '═══════════════════════════════════════════════════════════════', 'cyan');
    log('✅', 'All Tests Completed!', 'green');
    log('━', '═══════════════════════════════════════════════════════════════', 'cyan');

    // Final state
    const finalBalance = await getCurrentBalance();
    log('📊', 'Final State:', 'blue');
    printBalance(finalBalance.balance, finalBalance.status);

  } catch (error) {
    log('❌', `Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

async function runOnTimeTest() {
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');
  log('📋', 'TEST 1: ON-TIME PAYMENT', 'magenta');
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');

  currentScenario = SCENARIOS.ON_TIME;

  // Step 1: Create rent payment
  const payment = await createRentPayment();
  if (!payment) return;

  const balanceAfterRent = await getCurrentBalance();
  log('📊', 'After rent generation:', 'cyan');
  printBalance(balanceAfterRent.balance, balanceAfterRent.status);

  // Step 2: Pay immediately (on-time)
  const paymentAmount = payment.amount;
  const success = await simulatePayment(paymentAmount, false);

  if (success) {
    const finalBalance = await getCurrentBalance();
    log('📊', 'Final balance:', 'cyan');
    printBalance(finalBalance.balance, finalBalance.status);

    // Verification
    if (finalBalance.balance === 0 && finalBalance.status === 'paid') {
      log('✅', 'TEST PASSED: On-time payment correctly zeroed balance', 'green');
    } else {
      log('❌', 'TEST FAILED: Balance or status incorrect', 'red');
    }
  }

  console.log('\n');
}

async function runLateFullTest() {
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');
  log('📋', 'TEST 2: LATE FULL PAYMENT', 'magenta');
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');

  currentScenario = SCENARIOS.LATE_FULL;

  // Step 1: Create rent payment
  const payment = await createRentPayment();
  if (!payment) return;

  let balanceAfterRent = await getCurrentBalance();
  log('📊', 'After rent generation:', 'cyan');
  printBalance(balanceAfterRent.balance, balanceAfterRent.status);

  // Step 2: Simulate overdue fees
  await sleep(1000); // Simulate 5 days passing
  await simulateOverdueFees();

  const balanceAfterLateFee = await getCurrentBalance();
  log('📊', 'After late fees:', 'cyan');
  printBalance(balanceAfterLateFee.balance, balanceAfterLateFee.status);

  // Step 3: Pay full amount including late fees
  const fullAmount = balanceAfterLateFee.balance;
  const success = await simulatePayment(fullAmount, false);

  if (success) {
    const finalBalance = await getCurrentBalance();
    log('📊', 'Final balance:', 'cyan');
    printBalance(finalBalance.balance, finalBalance.status);

    // Verification
    if (finalBalance.balance === 0 && finalBalance.status === 'paid') {
      log('✅', 'TEST PASSED: Late payment with fees correctly zeroed balance', 'green');
    } else {
      log('❌', 'TEST FAILED: Balance or status incorrect', 'red');
    }
  }

  console.log('\n');
}

async function runLatePartialTest() {
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');
  log('📋', 'TEST 3: LATE PARTIAL PAYMENT', 'magenta');
  log('━', '═══════════════════════════════════════════════════════════════', 'cyan');

  currentScenario = SCENARIOS.LATE_PARTIAL;

  // Step 1: Create rent payment
  const payment = await createRentPayment();
  if (!payment) return;

  let balanceAfterRent = await getCurrentBalance();
  log('📊', 'After rent generation:', 'cyan');
  printBalance(balanceAfterRent.balance, balanceAfterRent.status);

  // Step 2: Simulate overdue fees
  await sleep(1000); // Simulate 5 days passing
  await simulateOverdueFees();

  const balanceAfterLateFee = await getCurrentBalance();
  log('📊', 'After late fees:', 'cyan');
  printBalance(balanceAfterLateFee.balance, balanceAfterLateFee.status);

  // Step 3: Pay partial amount (50%)
  const partialAmount = Math.floor(balanceAfterLateFee.balance / 2);
  const success = await simulatePayment(partialAmount, true);

  if (success) {
    const finalBalance = await getCurrentBalance();
    log('📊', 'Final balance:', 'cyan');
    printBalance(finalBalance.balance, finalBalance.status);

    // Verification
    const expectedBalance = balanceAfterLateFee.balance - partialAmount;
    if (finalBalance.balance === expectedBalance && finalBalance.status === 'unpaid') {
      log('✅', 'TEST PASSED: Partial payment correctly reduced balance', 'green');
    } else {
      log('❌', `TEST FAILED: Expected ${formatKES(expectedBalance)}, got ${formatKES(finalBalance.balance)}`, 'red');
    }
  }

  console.log('\n');
}

// Run the tests
runTests();

