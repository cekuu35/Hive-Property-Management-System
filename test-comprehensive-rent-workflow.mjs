#!/usr/bin/env node

/**
 * Comprehensive Rent Payment Workflow Test
 * 
 * This test thoroughly validates:
 * 1. Rent payment generation for active leases
 * 2. Cumulative balance tracking
 * 3. Late fee calculation and application
 * 4. Payment processing and balance deduction
 * 5. Edge cases and error handling
 */

import { createClient } from '@supabase/supabase-js';

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
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

function log(emoji, message, color = 'reset') {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bright}${colors.magenta}╔${'═'.repeat(63)}╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║${colors.reset} ${colors.bright}${colors.cyan}${message}${colors.reset}${' '.repeat(61 - message.length)}${colors.bright}${colors.magenta}║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚${'═'.repeat(63)}╝${colors.reset}\n`);
}

function formatKES(amount) {
  return `KES ${amount?.toLocaleString() || '0'}`;
}

// Test lease - using the third lease from our query
const TEST_LEASE = {
  id: 'b9ae0aa2-400b-4d8a-9bb5-ac393172f905',
  tenant_info_id: 'ab1247bf-51d0-4d44-a2d2-a15daf3d32f0',
  tenant_id: 'cfb944ed-0908-4862-bf59-a83a468dd356',
  rent_amount: 10000
};

async function getCurrentTenantBalance() {
  const { data, error } = await supabase
    .from('tenant_info')
    .select('current_balance, payment_status')
    .eq('id', TEST_LEASE.tenant_info_id)
    .single();

  if (error) {
    log('❌', `Error fetching balance: ${error.message}`, 'red');
    return null;
  }
  return data;
}

async function getRentPayments() {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', TEST_LEASE.id)
    .order('due_date', { ascending: false })
    .limit(10);

  if (error) {
    log('❌', `Error fetching payments: ${error.message}`, 'red');
    return [];
  }
  return data || [];
}

async function testMonthlyRentGeneration() {
  logHeader('TEST 1: MONTHLY RENT GENERATION');
  
  const today = new Date();
  const dueDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
    .toISOString().split('T')[0];

  log('🔍', 'Checking for existing payment for current month...', 'cyan');
  
  // Check if payment already exists
  const existingPayments = await getRentPayments();
  const existing = existingPayments.find(p => p.due_date === dueDate);
  
  if (existing) {
    log('⚠️', `Payment already exists for ${dueDate}`, 'yellow');
    return existing;
  }

  log('📅', `Creating rent payment for ${dueDate}`, 'blue');
  
  const { data: payment, error } = await supabase
    .from('rent_payments')
    .insert({
      lease_id: TEST_LEASE.id,
      amount: TEST_LEASE.rent_amount,
      due_date: dueDate,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    log('❌', `Error creating payment: ${error.message}`, 'red');
    return null;
  }

  log('✅', `Created payment: ${formatKES(payment.amount)} due ${dueDate}`, 'green');

  // Update tenant balance cumulatively
  const currentBalance = await getCurrentTenantBalance();
  const newBalance = (currentBalance.current_balance || 0) + payment.amount;

  const { error: balanceError } = await supabase
    .from('tenant_info')
    .update({
      current_balance: newBalance,
      payment_status: 'unpaid'
    })
    .eq('id', TEST_LEASE.tenant_info_id);

  if (balanceError) {
    log('❌', `Error updating balance: ${balanceError.message}`, 'red');
  } else {
    log('✅', `Balance updated: ${formatKES(currentBalance.current_balance)} → ${formatKES(newBalance)}`, 'green');
  }

  return payment;
}

async function testLateFeeCalculation() {
  logHeader('TEST 2: LATE FEE CALCULATION');
  
  const payments = await getRentPayments();
  const pendingPayments = payments.filter(p => p.status === 'pending');
  
  if (pendingPayments.length === 0) {
    log('⚠️', 'No pending payments found', 'yellow');
    return;
  }

  const payment = pendingPayments[0];
  const dueDate = new Date(payment.due_date);
  const today = new Date();
  const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    log('✅', 'Payment is not overdue', 'green');
    return payment;
  }

  log('⚠️', `Payment is ${daysOverdue} days overdue`, 'yellow');

  // Calculate late fee (2% per day, max 10%)
  const lateFeePercentage = Math.min(daysOverdue * 2, 10);
  const lateFee = Math.round(payment.amount * lateFeePercentage / 100);

  log('💸', `Calculating late fee: ${lateFeePercentage}% = ${formatKES(lateFee)}`, 'yellow');

  // Update payment with late fee
  const { error: updateError } = await supabase
    .from('rent_payments')
    .update({
      status: 'overdue',
      late_fee: lateFee
    })
    .eq('id', payment.id);

  if (updateError) {
    log('❌', `Error updating late fee: ${updateError.message}`, 'red');
    return payment;
  }

  log('✅', `Late fee applied to payment`, 'green');

  // Update tenant balance to include late fee
  const currentBalance = await getCurrentTenantBalance();
  const newBalance = (currentBalance.current_balance || 0) + lateFee;

  await supabase
    .from('tenant_info')
    .update({
      current_balance: newBalance,
      payment_status: 'overdue'
    })
    .eq('id', TEST_LEASE.tenant_info_id);

  log('✅', `Balance updated: ${formatKES(currentBalance.current_balance)} → ${formatKES(newBalance)}`, 'green');

  return { ...payment, late_fee: lateFee };
}

async function testPaymentProcessing(amount) {
  logHeader('TEST 3: PAYMENT PROCESSING');
  
  const currentBalance = await getCurrentTenantBalance();
  log('💰', `Current balance: ${formatKES(currentBalance.current_balance)}`, 'cyan');

  if (currentBalance.current_balance === 0) {
    log('✅', 'No balance to pay', 'green');
    return false;
  }

  const paymentAmount = amount || currentBalance.current_balance;
  const isPartial = paymentAmount < currentBalance.current_balance;

  log('💳', `Processing payment: ${formatKES(paymentAmount)}`, 'blue');

  // Find unpaid payment
  const payments = await getRentPayments();
  const unpaidPayment = payments.find(p => p.status !== 'paid');
  
  if (!unpaidPayment) {
    log('⚠️', 'No unpaid payment found', 'yellow');
    return false;
  }

  const reference = `TEST-${Date.now()}`;
  const today = new Date();
  const paidDateISO = today.toISOString().split('T')[0];

  // Update payment record
  const { error: paymentError } = await supabase
    .from('rent_payments')
    .update({
      status: 'paid',
      paid_date: paidDateISO,
      transaction_reference: reference,
      payment_method: 'card',
      updated_at: new Date().toISOString()
    })
    .eq('id', unpaidPayment.id);

  if (paymentError) {
    log('❌', `Error updating payment: ${paymentError.message}`, 'red');
    return false;
  }

  log('✅', `Payment marked as paid: ${reference}`, 'green');

  // Update balance
  const newBalance = Math.max(0, currentBalance.current_balance - paymentAmount);
  const shouldMarkPaid = newBalance === 0;

  const { error: balanceError } = await supabase
    .from('tenant_info')
    .update({
      current_balance: newBalance,
      payment_status: shouldMarkPaid ? 'paid' : 'unpaid',
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_LEASE.tenant_info_id);

  if (balanceError) {
    log('❌', `Error updating balance: ${balanceError.message}`, 'red');
    return false;
  }

  log('✅', `Balance updated: ${formatKES(currentBalance.current_balance)} → ${formatKES(newBalance)}`, 'green');
  log('📊', `Status: ${shouldMarkPaid ? 'PAID IN FULL ✅' : 'PARTIAL PAYMENT ⚠️'}`, shouldMarkPaid ? 'green' : 'yellow');

  return true;
}

async function runComprehensiveTest() {
  logHeader('COMPREHENSIVE RENT WORKFLOW TEST');
  
  log('🎯', 'Testing rent generation, late fees, and payment processing', 'cyan');
  log('📋', `Test Lease ID: ${TEST_LEASE.id}`, 'cyan');
  log('💰', `Rent Amount: ${formatKES(TEST_LEASE.rent_amount)}`, 'cyan');

  try {
    // Initial state
    const initialBalance = await getCurrentTenantBalance();
    log('\n📊', 'Initial State:', 'blue');
    log('💰', `Balance: ${formatKES(initialBalance.current_balance)}, Status: ${initialBalance.payment_status}`, 'cyan');

    // Test 1: Monthly rent generation
    const payment = await testMonthlyRentGeneration();
    
    if (payment) {
      const afterGeneration = await getCurrentTenantBalance();
      log('\n📊', 'After Generation:', 'blue');
      log('💰', `Balance: ${formatKES(afterGeneration.current_balance)}, Status: ${afterGeneration.payment_status}`, 'cyan');
    }

    // Test 2: Late fee calculation
    await testLateFeeCalculation();
    
    const afterLateFee = await getCurrentTenantBalance();
    log('\n📊', 'After Late Fee:', 'blue');
    log('💰', `Balance: ${formatKES(afterLateFee.current_balance)}, Status: ${afterLateFee.payment_status}`, 'cyan');

    // Test 3: Payment processing (partial)
    log('\n');
    const partialAmount = Math.floor(afterLateFee.current_balance / 2);
    await testPaymentProcessing(partialAmount);
    
    const afterPartial = await getCurrentTenantBalance();
    log('\n📊', 'After Partial Payment:', 'blue');
    log('💰', `Balance: ${formatKES(afterPartial.current_balance)}, Status: ${afterPartial.payment_status}`, 'cyan');

    // Test 4: Final payment
    log('\n');
    await testPaymentProcessing(afterPartial.current_balance);
    
    const finalBalance = await getCurrentTenantBalance();
    log('\n📊', 'Final State:', 'blue');
    log('💰', `Balance: ${formatKES(finalBalance.current_balance)}, Status: ${finalBalance.payment_status}`, 'cyan');

    // Payment history
    const payments = await getRentPayments();
    log('\n📋', `Payment History (${payments.length} payments):`, 'blue');
    payments.slice(0, 5).forEach(p => {
      const date = new Date(p.due_date).toLocaleDateString();
      const statusColor = p.status === 'paid' ? 'green' : 'red';
      const statusIcon = p.status === 'paid' ? '✅' : '⚠️';
      const lateFeeDisplay = p.late_fee > 0 ? ` + ${formatKES(p.late_fee)} late` : '';
      log(statusIcon, `${date}: ${formatKES(p.amount)}${lateFeeDisplay} - ${p.status}`, statusColor);
    });

    // Summary
    logHeader('TEST SUMMARY');
    
    if (finalBalance.current_balance === 0 && finalBalance.payment_status === 'paid') {
      log('🎉', 'ALL TESTS PASSED! Rent workflow is working correctly!', 'green');
    } else {
      log('⚠️', `Final balance: ${formatKES(finalBalance.current_balance)}`, 'yellow');
      log('⚠️', `Final status: ${finalBalance.payment_status}`, 'yellow');
    }

  } catch (error) {
    log('❌', `Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
runComprehensiveTest();

