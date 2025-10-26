-- Fix RLS Policies for Subscription System
-- This allows authenticated users to read plans and manage their own subscriptions

-- ============================================
-- 1. subscription_plans - Allow everyone to read plans
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Only admins can manage subscription plans" ON subscription_plans;

-- Allow all authenticated and anonymous users to read plans
CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans
FOR SELECT
TO public
USING (true);

-- Only admins can modify plans
CREATE POLICY "Only admins can manage subscription plans"
ON subscription_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================
-- 2. landlord_subscriptions - Landlords can manage their own
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can create their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON landlord_subscriptions;

-- Landlords can view their own subscriptions
CREATE POLICY "Landlords can view their own subscriptions"
ON landlord_subscriptions
FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

-- Landlords can create their own subscriptions
CREATE POLICY "Landlords can create their own subscriptions"
ON landlord_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (landlord_id = auth.uid());

-- Landlords can update their own subscriptions
CREATE POLICY "Landlords can update their own subscriptions"
ON landlord_subscriptions
FOR UPDATE
TO authenticated
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON landlord_subscriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================
-- 3. subscription_usage - Landlords can view/update their own
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Landlords can view their own usage" ON subscription_usage;
DROP POLICY IF EXISTS "Service role can manage usage" ON subscription_usage;

-- Landlords can view their own usage
CREATE POLICY "Landlords can view their own usage"
ON subscription_usage
FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

-- Service role can manage all usage (for automated updates)
CREATE POLICY "Service role can manage usage"
ON subscription_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can manage all usage
CREATE POLICY "Admins can manage all usage"
ON subscription_usage
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================
-- 4. subscription_payments - Landlords can view their own
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Landlords can view their own payments" ON subscription_payments;

-- Landlords can view their own payments
CREATE POLICY "Landlords can view their own payments"
ON subscription_payments
FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON subscription_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON POLICY "Anyone can view subscription plans" ON subscription_plans IS 
'Allow all users (authenticated and anonymous) to read subscription plans';

COMMENT ON POLICY "Landlords can view their own subscriptions" ON landlord_subscriptions IS 
'Landlords can only view their own subscription records';

COMMENT ON POLICY "Landlords can create their own subscriptions" ON landlord_subscriptions IS 
'Landlords can create subscriptions for themselves (trial sign-up)';
