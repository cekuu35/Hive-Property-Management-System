# 📊 COMPLETE RENT PAYMENT WORKFLOW ANALYSIS

## OVERVIEW
This document maps the complete rent payment workflow from generation to completion over a full month cycle.

---

## 🗂️ KEY DATABASE TABLES

### 1. **rent_payments**
- Stores individual payment records for each month
- Fields: `lease_id`, `amount`, `due_date`, `status`, `paid_date`, `late_fee`, `transaction_reference`
- One record per month per lease

### 2. **tenant_info**
- Stores cumulative balance for each tenant
- Fields: `current_balance`, `payment_status`
- Tracks total debt

### 3. **leases**
- Active lease contracts
- Fields: `rent_amount`, `tenant_info_id`, `tenant_id`, `status`

---

## 📅 MONTHLY AUTOMATION SCHEDULE

### **Day 1 @ 00:01 AM** - Monthly Rent Generation
**Function:** `daily_monthly_rent_check()`
**What it does:**
1. Loops through all `active` leases
2. Checks if payment already exists for current month
3. For each lease without payment:
   - Creates `rent_payments` record:
     - `status`: 'pending'
     - `due_date`: First of month
     - `amount`: From lease
   - Updates `tenant_info`:
     - Adds to `current_balance`
     - Sets `payment_status`: 'unpaid'
   - Sends notification to tenant

### **Every Day @ 02:00 AM** - Overdue Detection
**Function:** `detect_overdue_payments()`
**What it does:**
1. Finds `pending` payments past `due_date`
2. Updates `rent_payments`:
   - `status`: 'overdue'
   - `late_fee`: 2% per day (max 10%)
3. Updates `tenant_info`:
   - Adds late fee to `current_balance`
   - Sets `payment_status`: 'overdue'
4. Sends notification to tenant

---

## 🔄 COMPLETE MONTHLY WORKFLOW

### **SCENARIO A: On-Time Payment**

#### **Day 1 (00:01 AM)**
- ✅ Cron creates `rent_payments` record
- ✅ `tenant_info.current_balance` = previous balance + rent
- ✅ Notification sent: "Rent due"
- ✅ Status: `pending`

#### **Days 2–29**
- ⏸️ Tenant pays via portal
- ✅ Paystack processes payment
- ✅ `rent_payments` updated: status=`paid`, `paid_date` set
- ✅ `tenant_info.current_balance` = 0
- ✅ `payment_status` = 'paid'

#### **Day 30+**
- ✅ Overdue cron runs daily
- ✅ No overdue fees (already paid)

---

### **SCENARIO B: Late Payment**

#### **Day 1 (00:01 AM)**
- ✅ Cron creates `rent_payments` record
- ✅ `tenant_info.current_balance` = previous + rent
- ✅ Notification: "Rent due"
- ✅ Status: `pending`

#### **Days 2–31**
- ⏸️ No payment
- ✅ Overdue cron marks `status` = 'overdue' on Day 2

#### **Overdue fee calculation:**
```
Day 5: late_fee = 25,000 * (5 days * 2%) = 2,500
Day 10: late_fee = 25,000 * 10% (capped) = 2,500
```

#### **Day 32 (or any day after due date)**
- ✅ Tenant pays: amount = rent + late fees
- ✅ `rent_payments` updated: status=`paid`
- ✅ `tenant_info.current_balance` = 0

---

### **SCENARIO C: Partial Payment**

#### **Day 1–5**
- ✅ Rent due, balance increases
- ✅ Overdue fees accumulate

#### **Day 6**
- ⏸️ Tenant pays partial amount
- ✅ Rent path expects full payment
- ⚠️ Needed: handle partials

---

## 🎯 KEY FUNCTIONS & COMPONENTS

### **Frontend Hooks**

#### **useMonthlyRent.tsx**
**Purpose:** Calculate current rent due for tenant dashboard  
**Logic:**
1. Fetch `tenant_info` for profile
2. Find active `lease`
3. Query `rent_payments` for current month
4. Compute days until due/overdue
5. Return: amount due, days remaining, late fees

**Auto-generation:**
- If no payment for current month, create it
- If payment paid and next month missing, create next

#### **useTenantPayments.tsx**
**Purpose:** Track payment history and calculate balances  
**Logic:**
1. Fetch payments for the tenant’s lease
2. Sum unpaid amounts
3. Return recent payments and current balance

### **Backend Cron Functions**

#### **daily_monthly_rent_check()**
- Runs at 00:01 daily
- Acts on Day 1
- Creates payments and updates balances
- Skips existing payments

#### **detect_overdue_payments()**
- Runs at 02:00 daily
- Marks `pending` payments past due
- Applies late fees and updates balances

---

## 🔍 WORKFLOW ANALYSIS

### **Payment Recording Paths**

#### **1. Paystack (Webhook)**
```
Tenant pays → Paystack processes → Webhook callback →
supabase/functions/paystack-webhook → Updates rent_payments
```

#### **2. Frontend Verification**
```
Tenant pays → Payment verification → updateRentPayment() →
Updates rent_payments via supabaseAdmin
```

#### **3. M-Pesa**
```
Tenant pays → KCB Buni STK → Callback →
supabase/functions/mpesa-stk-push → Updates rent_payments
```

---

## ⚠️ IDENTIFIED ISSUES

### **Issue 1: Balance Management Conflict**
**Problem:** Conflicting balance updates

**Frontend updates:**
```typescript
// PaymentCallback.tsx line 273
current_balance: 0  // ❌ Sets to 0
```

**Cron updates:**
```sql
-- line 92
current_balance + lease_record.rent_amount  // ✅ Adds to existing
```

**Result:** Frontend zeroes balance, breaking cumulative tracking.

---

### **Issue 2: Partial Payment Handling**
**Problem:** No partial payment logic

**Current behavior:**
- Records full rent amount
- Updates status to `paid` on any amount
- No tracking of amounts paid

**Needed:**
- Partial updates
- Status `partial` when amount < total
- Balance computed correctly

---

### **Issue 3: Frontend Balance Calculation**
**Problem:** Inconsistent frontend calculation

**useMonthlyRent:**
- Uses `rent_payments` status
- Generates next month if needed

**useTenantPayments:**
- Sums unpaid payments
- Differs from `tenant_info.current_balance`

**Result:** Confusion about which balance is correct

---

### **Issue 4: Update vs Insert**
**Problem:** Possible duplicate records

**Cron creates:**
```sql
INSERT INTO rent_payments (...)  -- ✅ New record
```

**updateRentPayment:**
```sql
UPDATE rent_payments WHERE status = 'pending'  -- ✅ Updates existing
```

**Risk:** Duplicate rows if someone inserts directly

---

## 📊 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                     MONTHLY RENT CYCLE                       │
└─────────────────────────────────────────────────────────────┘

Day 1 @ 00:01
    │
    ├─→ daily_monthly_rent_check()
    │   ├─→ Check all active leases
    │   ├─→ For each lease:
    │   │   ├─→ CREATE rent_payments (status='pending')
    │   │   ├─→ UPDATE tenant_info (current_balance += rent)
    │   │   └─→ SEND notification
    │   └─→ Log to cron_log
    │
    └─→ Result: All tenants have pending rent

Daily @ 02:00
    │
    ├─→ detect_overdue_payments()
    │   ├─→ Find pending payments past due_date
    │   ├─→ For each overdue:
    │   │   ├─→ UPDATE rent_payments (status='overdue')
    │   │   ├─→ CALCULATE late_fee (2% per day, max 10%)
    │   │   ├─→ UPDATE rent_payments (late_fee)
    │   │   ├─→ UPDATE tenant_info (current_balance += late_fee)
    │   │   └─→ SEND notification
    │   └─→ Log to cron_log
    │
    └─→ Result: Late fees applied automatically

When Tenant Pays
    │
    ├─→ TenantPaymentModal or MpesaRentPaymentModal
    │   ├─→ Process payment through gateway
    │   ├─→ Verify with Paystack or M-Pesa
    │   ├─→ Update rent_payments:
    │   │   ├─→ status = 'paid'
    │   │   ├─→ paid_date = NOW()
    │   │   ├─→ transaction_reference
    │   │   └─→ payment_method
    │   └─→ Update tenant_info:
    │       ├─→ current_balance = 0  ⚠️ (ISSUE!)
    │       └─→ payment_status = 'paid'
    │
    └─→ Result: Payment recorded, balance reset

Dashboard Display
    │
    ├─→ useMonthlyRent()
    │   ├─→ Query rent_payments for current month
    │   ├─→ Calculate days until due
    │   └─→ Return current due amount
    │
    ├─→ useTenantPayments()
    │   ├─→ Query all rent_payments for lease
    │   ├─→ Sum unpaid amounts
    │   └─→ Return total balance
    │
    └─→ Display: Rent due, balance, status
```

---

## 🎯 RECOMMENDATIONS

### **Critical Fixes Needed:**

1. Fix `current_balance` logic
   - Keep cumulative balances
   - Deduct paid amounts instead of zeroing

2. Add partial payment support
   - Track `amount_paid`
   - Use status `partial`
   - Compute remaining balance

3. Unify frontend balance calculation
   - Use `tenant_info.current_balance`
   - Or compute from `rent_payments`

4. Add index on `rent_payments`
   - On `lease_id` and `due_date` (applied above)

---

## 🔧 TECHNICAL STACK

**Backend:**
- PostgreSQL with pg_cron
- Scheduled functions for automation
- RLS

**Frontend:**
- React hooks for state
- Supabase client
- Real-time subscriptions

**Payment Gateways:**
- Paystack (webhook)
- M-Pesa STK (KCB Buni)
- Both update the same `rent_payments` table

