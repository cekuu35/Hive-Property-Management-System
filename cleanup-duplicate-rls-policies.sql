-- ========================================
-- CLEANUP DUPLICATE RLS POLICIES
-- ========================================
-- Remove duplicate and conflicting policies

-- ========================================
-- 1. CLEAN UP LANDLORD_SUBSCRIPTIONS
-- ========================================

-- Remove ALL existing policies (we'll recreate the correct ones)
DROP POLICY IF EXISTS "Landlords can view own subscription" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can insert their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON landlord_subscriptions;

-- Create clean policies (no duplicates)
CREATE POLICY "landlords_select_own_subscriptions"
ON landlord_subscriptions
FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

CREATE POLICY "landlords_insert_own_subscriptions"
ON landlord_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "landlords_update_own_subscriptions"
ON landlord_subscriptions
FOR UPDATE
TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "service_role_manage_subscriptions"
ON landlord_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 2. CLEAN UP PROFILES
-- ========================================

-- Remove duplicates
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_can_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Security users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Create clean policies
CREATE POLICY "authenticated_select_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_profile_clean"
ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR id = auth.uid())
WITH CHECK (user_id = auth.uid() OR id = auth.uid());

CREATE POLICY "service_role_manage_profiles"
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 3. CLEAN UP SUBSCRIPTION_PLANS
-- ========================================

-- Remove duplicates
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON subscription_plans;

-- Create clean policies
CREATE POLICY "anyone_view_subscription_plans"
ON subscription_plans
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "service_role_manage_plans"
ON subscription_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 4. ENSURE RLS IS ENABLED
-- ========================================

ALTER TABLE landlord_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================

GRANT SELECT, INSERT, UPDATE ON landlord_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON subscription_plans TO authenticated, anon;

-- ========================================
-- 6. VERIFY (Check the cleaned up policies)
-- ========================================

SELECT 
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'landlord_subscriptions', 'subscription_plans')
ORDER BY tablename, policyname;

-- You should now see clean, non-duplicate policies!

