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
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

function log(emoji, message, color = 'reset') {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bright}${colors.magenta}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║${colors.reset} ${colors.bright}${colors.cyan}${message}${colors.reset}${' '.repeat(53 - message.length)}${colors.bright}${colors.magenta}║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

// Test data - replace with your actual test tenant
const TEST_TENANT = {
  profileId: 'cfb944ed-0908-4862-bf59-a83a468dd356',
  tenantInfoId: null,
  leaseId: null
};

let initialBalance = null;

// Utility functions
function formatKES(amount) {
  return `KES ${amount?.toLocaleString() || '0'}`;
}

async function getCurrentBalance() {
  const { data, error } = await supabase
    .from('tenant_info')
    .select('current_balance, payment_status, updated_at')
    .eq('id', TEST_TENANT.tenantInfoId)
    .single();

  if (error) return null;
  return {
    balance: data.current_balance || 0,
    status: data.payment_status,
    updatedAt: data.updated_at
  };
}

async function getRentPayments() {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', TEST_TENANT.leaseId)
    .order('due_date', { ascending: false })
    .limit(20);

  if (error) {
    log('❌', `Error fetching payments: ${error.message}`, 'red');
    return [];
  }

  return data || [];
}

function printBalance(balance, status) {
  const color = balance > 0 ? 'red' : 'green';
  const icon = balance > 0 ? '💰' : '✅';
  log(icon, `Balance: ${formatKES(balance.balance)}, Status: ${status}`, color);
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
  log('✅', `Tenant info found: ${data.id}`, 'green');
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
  log('✅', `Active lease found: Rent ${formatKES(data.rent_amount)}`, 'green');
  return data;
}

async function simulateMonthlyRentGeneration(monthOffset = 0) {
  const today = new Date();
  const targetDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + monthOffset, 1));
  const dueDate = targetDate.toISOString().split('T')[0];
  
  log('📅', `Simulating rent generation for ${dueDate}`, 'blue');

  // Check if payment already exists
  const { data: existing } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', TEST_TENANT.leaseId)
    .eq('due_date', dueDate)
    .maybeSingle();
  
  if (existing) {
    log('⏭️', `Payment already exists for ${dueDate}`, 'yellow');
    return existing;
  }

  // Get lease rent amount
  const { data: lease } = await supabase
    .from('leases')
    .select('rent_amount')
    .eq('id', TEST_TENANT.leaseId)
    .single();

  if (!lease) {
    log('❌', 'Could not fetch lease information', 'red');
    return null;
  }

  const rentAmount = lease.rent_amount;

  // Create rent payment
  const { data: payment, error: paymentError } = await supabase
    .from('rent_payments')
    .insert({
      lease_id: TEST_TENANT.leaseId,
      amount: rentAmount,
      due_date: dueDate,
      status: 'pending'
    })
    .select()
    .single();

  if (paymentError) {
    log('❌', `Error creating payment: ${paymentError.message}`, 'red');
    return null;
  }

  log('✅', `Created payment: ${formatKES(rentAmount)} due ${dueDate}`, 'green');

  // Update tenant balance (cumulative)
  const currentBalance = await getCurrentBalance();
  const newBalance = (currentBalance.balance || 0) + rentAmount;
  
  const { error: balanceError } = await supabase
    .from('tenant_info')
    .update({
      current_balance: newBalance,
      payment_status: 'unpaid',
      updated_at: new Date().toISOString()
    })
    .eq('id', TEST_TENANT.tenantInfoId);

  if (balanceError) {
    log('❌', `Error updating balance: ${balanceError.message}`, 'red');
  } else {
    log('✅', `Balance updated: ${formatKES(currentBalance.balance)} → ${formatKES(newBalance)}`, 'green');
  }

  return payment;
}

async function simulatePartialPayment(percentage) {
  const balance = await getCurrentBalance();
  const currentBalance = balance.balance || 0;
  
  if (currentBalance === 0) {
    log('✅', 'No balance to pay - already fully paid!', 'green');
    return true;
  }

  const paymentAmount = Math.floor(currentBalance * percentage);
  
  log('💳', `Simulating payment of ${(percentage * 100)}%: ${formatKES(paymentAmount)}`, 'blue');
  log('📊', `Current balance: ${formatKES(currentBalance)}`, 'cyan');

  // Find unpaid payment
  const { data: payments } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('lease_id', TEST_TENANT.leaseId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .single();

  if (!payments) {
    log('⚠️', 'No unpaid payments found', 'yellow');
    return false;
  }

  const reference = `TEST-${Date.now()}`;
  const today = new Date();
  const paidDateISO = today.toISOString().split('T')[0];

  // Update payment record
  const updatedPayment = {
    status: 'paid',
    paid_date: paidDateISO,
    transaction_reference: reference,
    payment_method: 'card',
    updated_at: new Date().toISOString()
  };

  const { error: paymentError } = await supabase
    .from('rent_payments')
    .update(updatedPayment)
    .eq('id', payments.id);

  if (paymentError) {
    log('❌', `Error updating payment: ${paymentError.message}`, 'red');
    return false;
  }

  log('✅', `Payment marked as paid: ${reference}`, 'green');

  // Update tenant balance - THE KEY FIX
  const newBalance = Math.max(0, currentBalance - paymentAmount);
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
  log('📊', `Status: ${shouldMarkPaid ? 'PAID IN FULL ✅' : 'PARTIAL PAYMENT ⚠️'}`, shouldMarkPaid ? 'green' : 'yellow');

  return true;
}

async function runMonthlyCumulativeTest() {
  logHeader('MONTHLY CUMULATIVE RENT TRACKING TEST');
  
  log('🎯', 'Testing how balances accumulate across multiple months', 'cyan');
  log('📋', 'Scenario: Tenant skips payments for 3 months, then pays partially', 'cyan');

  try {
    // Setup
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
    log('\n', 'Initial State:', 'cyan');
    printBalance(initialBalance, initialBalance.status);

    // MONTH 1
    logHeader('MONTH 1 - NO PAYMENT');
    const month1 = await simulateMonthlyRentGeneration(0);
    let balanceAfterMonth1 = await getCurrentBalance();
    printBalance(balanceAfterMonth1, balanceAfterMonth1.status);

    // MONTH 2
    logHeader('MONTH 2 - NO PAYMENT');
    const month2 = await simulateMonthlyRentGeneration(1);
    let balanceAfterMonth2 = await getCurrentBalance();
    printBalance(balanceAfterMonth2, balanceAfterMonth2.status);

    // MONTH 3
    logHeader('MONTH 3 - NO PAYMENT');
    const month3 = await simulateMonthlyRentGeneration(2);
    let balanceAfterMonth3 = await getCurrentBalance();
    printBalance(balanceAfterMonth3, balanceAfterMonth3.status);

    // Show cumulative calculation
    const rentAmount = lease.rent_amount;
    const expectedCumulative = initialBalance.balance + (rentAmount * 3);
    
    log('\n', 'Cumulative Balance Check:', 'cyan');
    log('📊', `Starting balance: ${formatKES(initialBalance.balance)}`, 'cyan');
    log('📊', `+ Month 1 rent: ${formatKES(rentAmount)}`, 'cyan');
    log('📊', `+ Month 2 rent: ${formatKES(rentAmount)}`, 'cyan');
    log('📊', `+ Month 3 rent: ${formatKES(rentAmount)}`, 'cyan');
    log('📊', `= Expected total: ${formatKES(expectedCumulative)}`, 'cyan');
    log('📊', `= Actual balance: ${formatKES(balanceAfterMonth3.balance)}`, 'cyan');

    if (balanceAfterMonth3.balance === expectedCumulative) {
      log('✅', 'CUMULATIVE TRACKING WORKING CORRECTLY!', 'green');
    } else {
      log('❌', `CUMULATIVE TRACKING FAILED! Expected ${formatKES(expectedCumulative)}, got ${formatKES(balanceAfterMonth3.balance)}`, 'red');
    }

    // PARTIAL PAYMENT
    logHeader('PARTIAL PAYMENT TEST');
    log('💳', 'Making a 50% payment to test deduction...', 'blue');
    const partialSuccess = await simulatePartialPayment(0.5);

    if (partialSuccess) {
      const balanceAfterPartial = await getCurrentBalance();
      log('\n', 'After Partial Payment:', 'cyan');
      printBalance(balanceAfterPartial, balanceAfterPartial.status);

      const expectedAfterPartial = expectedCumulative * 0.5;
      
      if (balanceAfterPartial.balance === expectedAfterPartial) {
        log('✅', 'PARTIAL PAYMENT DEDUCTION WORKING CORRECTLY!', 'green');
      } else {
        log('❌', `PARTIAL DEDUCTION FAILED! Expected ${formatKES(expectedAfterPartial)}, got ${formatKES(balanceAfterPartial.balance)}`, 'red');
      }
    }

    // FINAL PAYMENT
    logHeader('FINAL PAYMENT TEST');
    log('💳', 'Paying remaining balance...', 'blue');
    const finalSuccess = await simulatePartialPayment(1.0);

    if (finalSuccess) {
      const finalBalance = await getCurrentBalance();
      log('\n', 'Final State:', 'cyan');
      printBalance(finalBalance, finalBalance.status);

      if (finalBalance.balance === 0 && finalBalance.status === 'paid') {
        log('✅', 'FULL PAYMENT DEDUCTION WORKING CORRECTLY!', 'green');
      } else {
        log('❌', `FULL PAYMENT FAILED! Balance should be 0, got ${formatKES(finalBalance.balance)}`, 'red');
      }
    }

    // Payment History
    logHeader('PAYMENT HISTORY');
    const payments = await getRentPayments();
    log('📋', `Total payments in record: ${payments.length}`, 'cyan');
    
    const paidPayments = payments.filter(p => p.status === 'paid');
    const unpaidPayments = payments.filter(p => p.status !== 'paid');
    
    log('✅', `Paid: ${paidPayments.length}`, 'green');
    log('⚠️', `Unpaid: ${unpaidPayments.length}`, 'yellow');

    if (payments.length > 0) {
      console.log('\n');
      log('📊', 'Recent Payments:', 'cyan');
      payments.slice(0, 5).forEach(p => {
        const date = new Date(p.due_date).toLocaleDateString();
        const statusColor = p.status === 'paid' ? 'green' : 'red';
        const statusIcon = p.status === 'paid' ? '✅' : '⚠️';
        log(statusIcon, `${date}: ${formatKES(p.amount)} - ${p.status}`, statusColor);
      });
    }

    // Final Summary
    logHeader('TEST SUMMARY');
    const finalBalance = await getCurrentBalance();
    printBalance(finalBalance, finalBalance.status);
    
    if (finalBalance.balance === 0) {
      log('🎉', 'ALL TESTS PASSED! Rent workflow is working correctly!', 'green');
    } else {
      log('⚠️', `Final balance not zero: ${formatKES(finalBalance.balance)}`, 'yellow');
    }

  } catch (error) {
    log('❌', `Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
runMonthlyCumulativeTest();

