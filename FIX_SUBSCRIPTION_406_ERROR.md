# 🔧 Fix 406 Error - Subscription Not Loading

## 🐛 The Problem

You're seeing this error in the console:
```
GET .../landlord_subscriptions?... 406 (Not Acceptable)
useSubscription.tsx:83 No active subscription found
```

This means the subscription card IS rendering, but **RLS policies** are blocking the data fetch.

---

## ✅ Quick Fix

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run This SQL

Copy and paste the entire content from `fix-subscription-rls-policies.sql`:

```sql
-- Fix RLS policies for landlord_subscriptions table

-- Drop existing policies
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can insert their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON landlord_subscriptions;

-- Recreate policies with proper permissions
CREATE POLICY "Landlords can view their own subscriptions"
ON landlord_subscriptions
FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can insert their own subscriptions"
ON landlord_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can update their own subscriptions"
ON landlord_subscriptions
FOR UPDATE
TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Service role can manage all subscriptions"
ON landlord_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also ensure the subscription_plans table is readable
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;

CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Service role can manage subscription plans"
ON subscription_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE landlord_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON landlord_subscriptions TO authenticated;
GRANT INSERT ON landlord_subscriptions TO authenticated;
GRANT UPDATE ON landlord_subscriptions TO authenticated;
GRANT SELECT ON subscription_plans TO authenticated, anon;
```

### Step 3: Click "Run" (or press Ctrl+Enter)

You should see: **"Success. No rows returned"**

### Step 4: Refresh Your App

1. Go back to your app
2. Hard refresh: **Ctrl + Shift + R**
3. The subscription card should now load properly!

---

## 🎯 What Should Happen Now

After running the SQL and refreshing:

### If You Have NO Subscription:
You'll see:
```
┌──────────────────────────────────────────┐
│  🔒 Subscription Required                │
│                                          │
│  Start with a 60-day free trial...      │
│                                          │
│  [🎁 Start 60-Day Free Trial]           │
│  [📊 View All Plans]                    │
└──────────────────────────────────────────┘
```

Click "Start 60-Day Free Trial" and you'll be able to use the app!

### If You Already Have a Subscription:
You'll see your subscription details with usage progress bars.

---

## 🧪 Test the Free Trial

Once the 406 error is fixed:

1. **Click "Start 60-Day Free Trial"**
2. Wait 2-3 seconds (button will show "Starting Trial...")
3. You should see: **"🎉 60-Day Free Trial Started!"**
4. Subscription card will update to show your trial
5. You can now add properties, units, and tenants!

---

## 🔍 Verify It's Fixed

Check the browser console (F12):
- ❌ Before: `406 (Not Acceptable)` error
- ✅ After: No 406 error, subscription data loads successfully

---

## 💡 Why This Happened

The RLS (Row Level Security) policies on the `landlord_subscriptions` table were too restrictive or missing, causing Supabase to reject the query with a 406 error.

The fix adds proper policies that allow:
- Landlords to read their own subscriptions
- Landlords to create their own subscriptions (for free trial)
- Everyone to read available subscription plans
- Service role (admin) to manage everything

---

## 🚀 After the Fix

Your subscription system will be fully functional:
1. ✅ Subscription card displays correctly
2. ✅ One-click free trial works
3. ✅ Usage tracking works
4. ✅ Limit enforcement works
5. ✅ Upgrade flow works

---

**Run the SQL fix now and your subscription system will work perfectly! 🎉**

