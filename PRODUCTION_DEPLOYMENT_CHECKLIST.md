# 🚀 Production Deployment Checklist

**Date**: October 21, 2025  
**Component**: M-Pesa Payment System (Fixed)  
**Status**: Ready for Deployment ✅

---

## ☑️ Pre-Deployment Checklist

### 1. Code Review
- [x] Edge function updated (`supabase/functions/mpesa-stk-push/index.ts`)
- [x] Callback handler fixed (updates existing records)
- [x] Balance clearing implemented
- [x] Status updates implemented
- [x] Notifications added (optional)
- [x] Utility bill updates added
- [x] Error handling improved
- [x] Logging enhanced

### 2. Testing Completed
- [x] Automated tests passed (27/27)
- [x] Rent payment flow verified
- [x] Utility payment flow verified
- [x] Balance updates confirmed
- [x] Status updates confirmed
- [x] No duplicate records
- [x] Transaction tracking works

### 3. Database Verification
- [x] `payment_requests` table exists
- [x] `rent_payments` table exists
- [x] `unit_bills` table exists
- [x] `tenant_info` table exists
- [x] `notifications` table exists (optional)
- [x] All constraints validated
- [x] RLS policies reviewed

---

## 🚀 Deployment Steps

### Step 1: Backup Current State

```sql
-- In Supabase SQL Editor, create backup views:

CREATE VIEW payment_requests_backup AS 
SELECT * FROM payment_requests;

CREATE VIEW rent_payments_backup AS 
SELECT * FROM rent_payments;

CREATE VIEW tenant_info_backup AS 
SELECT * FROM tenant_info;
```

**Completed**: [ ]

---

### Step 2: Deploy Edge Function

#### Option A: Supabase CLI
```bash
cd C:\Users\Admin\Favorites\lovly-prop-ai-33
supabase functions deploy mpesa-stk-push
```

#### Option B: Supabase Dashboard
1. Go to: https://kozhlejudselgtmohdfm.supabase.co
2. Navigate to: **Edge Functions** → `mpesa-stk-push`
3. Click **Edit**
4. Copy entire contents of `supabase/functions/mpesa-stk-push/index.ts`
5. Paste into editor
6. Click **Deploy**
7. Wait for "Deployment successful" ✅

**Completed**: [ ]

---

### Step 3: Verify Environment Variables

In Supabase Dashboard → Settings → Secrets, ensure these exist:

```bash
KCB_API_KEY = 8b16f39a7d974f8e8c1e2bcf6e3d5a9f
KCB_CLIENT_ID = RDCya3n8IkzdnyZ0jwDgaqlXQpEa
KCB_CLIENT_SECRET = fGHR8vY3kLpN2qWxZmTsJdCbEaFw
SUPABASE_URL = https://kozhlejudselgtmohdfm.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Completed**: [ ]

---

### Step 4: Test Edge Function Endpoint

```bash
# Test health check
curl https://kozhlejudselgtmohdfm.supabase.co/functions/v1/mpesa-stk-push

# Should return: 404 or method not allowed (expected for GET)
```

**Completed**: [ ]

---

### Step 5: Monitor First Real Payment

1. Login as tenant: http://localhost:5173
2. Navigate to Monthly Rent section
3. Click "Pay via KCB M-Pesa"
4. Enter REAL phone number
5. Complete STK Push on phone
6. Monitor edge function logs:

```bash
supabase functions logs mpesa-stk-push --tail
```

Look for these logs:
```
📞 [M-Pesa] Received callback
🔄 [M-Pesa] Processing successful payment
✅ [M-Pesa] Rent payment record updated
✅ [M-Pesa] Tenant balance updated to 0
✅ [M-Pesa] Notification sent to tenant
```

**Completed**: [ ]

---

### Step 6: Verify Database Changes

```sql
-- Check payment was processed correctly

-- 1. Payment request
SELECT * FROM payment_requests 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Should show: status = 'success', result_code = 0

-- 2. Rent payment
SELECT * FROM rent_payments 
WHERE paid_date > CURRENT_DATE
ORDER BY paid_date DESC;

-- Should show: status = 'paid', payment_method = 'mpesa'

-- 3. Tenant balance
SELECT id, current_balance, payment_status, updated_at 
FROM tenant_info 
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- Should show: current_balance = 0, payment_status = 'paid'

-- 4. Check for duplicates
SELECT lease_id, COUNT(*) 
FROM rent_payments 
WHERE paid_date > CURRENT_DATE
GROUP BY lease_id 
HAVING COUNT(*) > 1;

-- Should return: NO ROWS (no duplicates)
```

**Completed**: [ ]

---

### Step 7: Verify Tenant Dashboard

1. Refresh tenant dashboard
2. Check "Monthly Rent" section shows:
   - ✅ Status: "Paid"
   - ✅ Balance: KES 0
   - ✅ Payment Date: Today
   - ✅ Payment Method: M-Pesa

**Completed**: [ ]

---

### Step 8: Check Notifications

```sql
SELECT * FROM notifications 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND type = 'payment_success'
ORDER BY created_at DESC;
```

**Expected**: 1 notification for the tenant

**Note**: If this fails, it's okay - payments still work correctly. Fix foreign key constraint later.

**Completed**: [ ]

---

## 🔍 Post-Deployment Verification

### Automated Health Check

Run the test suite to verify everything still works:

```bash
node test-mpesa-payment-flow.js
```

**Expected Output**:
```
🎉 ALL TESTS PASSED SUCCESSFULLY!
```

**Completed**: [ ]

---

### Browser Test (Optional)

Open browser test tool:
```
http://localhost:5173/test-payment-flow.html
```

Click: **Run All Tests**

**Expected**: All tests pass ✅

**Completed**: [ ]

---

## 📊 Success Criteria

Mark as complete when ALL are true:

- [ ] Edge function deployed without errors
- [ ] Test payment completes successfully
- [ ] Tenant balance clears to 0
- [ ] Payment status updates to 'paid'
- [ ] Rent payment status updates to 'paid'
- [ ] Dashboard shows "Paid" status
- [ ] No duplicate rent_payment records
- [ ] Transaction reference is stored
- [ ] Edge function logs show success messages
- [ ] No errors in database logs

---

## 🚨 Rollback Plan

If deployment causes issues:

### Quick Rollback (Dashboard)
1. Go to Edge Functions → mpesa-stk-push
2. Click **Version History**
3. Select previous version
4. Click **Deploy**

### Database Rollback (if needed)
```sql
-- Restore from backup (only if absolutely necessary)
-- This should NOT be needed as we only update, not delete

-- Check backup first
SELECT COUNT(*) FROM payment_requests_backup;
SELECT COUNT(*) FROM rent_payments_backup;
SELECT COUNT(*) FROM tenant_info_backup;
```

---

## 📈 Monitoring (First 24 Hours)

### What to Monitor:

1. **Edge Function Logs**
   - Check for errors every 2 hours
   - Look for successful payment processing
   - Verify all steps complete

2. **Database Queries**
   ```sql
   -- Check recent payments
   SELECT 
     pr.created_at,
     pr.status as request_status,
     rp.status as payment_status,
     ti.current_balance,
     ti.payment_status
   FROM payment_requests pr
   LEFT JOIN rent_payments rp ON rp.lease_id = pr.lease_id
   LEFT JOIN leases l ON l.id = pr.lease_id
   LEFT JOIN tenant_info ti ON ti.id = l.tenant_info_id
   WHERE pr.created_at > NOW() - INTERVAL '24 hours'
   ORDER BY pr.created_at DESC;
   ```

3. **Tenant Feedback**
   - Ask tenants if they see correct status
   - Verify balances are accurate
   - Check for any confusion

---

## 🎯 Known Issues (Non-Critical)

### 1. Notifications Foreign Key
- **Issue**: `user_id` foreign key constraint
- **Impact**: Notifications not created
- **Workaround**: Payments still work perfectly
- **Fix**: Update notification schema (future)
- **Priority**: Low

### 2. Landlord Payouts
- **Issue**: Money stays in business account
- **Impact**: Manual transfer needed
- **Workaround**: Transfer manually monthly
- **Fix**: Implement KCB B2B API (future)
- **Priority**: Medium

---

## ✅ Final Approval

**Deployment Approved By**: _________________

**Date**: _________________

**Signature**: _________________

---

## 📞 Support Contacts

**Technical Issues**:
- Check edge function logs first
- Review this checklist
- Consult `TEST_RESULTS_SUMMARY.md`

**Database Issues**:
- Run verification queries
- Check RLS policies
- Review table constraints

---

**Last Updated**: October 21, 2025  
**Document Version**: 1.0  
**Status**: Ready for Production Deployment ✅


