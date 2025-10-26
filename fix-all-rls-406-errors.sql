-- ========================================
-- FIX ALL 406 ERRORS - Complete RLS Fix
-- ========================================
-- This fixes RLS policies for subscription tables AND profiles table

-- ========================================
-- 1. FIX PROFILES TABLE RLS
-- ========================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Recreate profiles policies (more permissive for SELECT)
CREATE POLICY "Anyone authenticated can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR id = auth.uid())
WITH CHECK (user_id = auth.uid() OR id = auth.uid());

CREATE POLICY "Service role can manage all profiles"
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 2. FIX LANDLORD_SUBSCRIPTIONS TABLE RLS
-- ========================================

-- Drop existing subscription policies
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can insert their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON landlord_subscriptions;

-- Recreate subscription policies
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

-- ========================================
-- 3. FIX SUBSCRIPTION_PLANS TABLE RLS
-- ========================================

-- Drop existing plans policies
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;

-- Recreate plans policies (everyone should read plans)
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

-- ========================================
-- 4. VERIFY RLS IS ENABLED
-- ========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE landlord_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. GRANT NECESSARY PERMISSIONS
-- ========================================

-- Profiles table
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- Subscriptions tables
GRANT SELECT ON landlord_subscriptions TO authenticated;
GRANT INSERT ON landlord_subscriptions TO authenticated;
GRANT UPDATE ON landlord_subscriptions TO authenticated;
GRANT SELECT ON subscription_plans TO authenticated, anon;

-- ========================================
-- 6. VERIFY POLICIES (Optional - Check Results)
-- ========================================

-- Run this to see all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'landlord_subscriptions', 'subscription_plans')
ORDER BY tablename, policyname;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
-- If you see "Success. No rows returned", the fix worked!
-- Now refresh your app with Ctrl+Shift+R

