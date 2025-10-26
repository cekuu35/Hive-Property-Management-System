-- ============================================
-- CLEAN ALL LANDLORD_SUBSCRIPTIONS POLICIES
-- Remove duplicates and old policies
-- ============================================

-- Drop ALL old policies
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can create their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "landlords_insert_own_subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "landlords_select_own_subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "landlords_update_own_subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "service_role_manage_subscriptions" ON landlord_subscriptions;

-- Create clean, comprehensive policies

-- 1. Service role has full access
CREATE POLICY "service_role_manage_subscriptions"
ON landlord_subscriptions FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 2. Admins can manage all subscriptions
CREATE POLICY "Admins can manage all subscriptions"
ON landlord_subscriptions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- 3. Landlords can view their own subscriptions
CREATE POLICY "Landlords can view their own subscriptions"
ON landlord_subscriptions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = landlord_subscriptions.landlord_id 
    AND profiles.user_id = auth.uid()
  )
);

-- 4. Landlords can create their own subscriptions
CREATE POLICY "Landlords can create their own subscriptions"
ON landlord_subscriptions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = landlord_subscriptions.landlord_id 
    AND profiles.user_id = auth.uid()
  )
);

-- 5. Landlords can update their own subscriptions
CREATE POLICY "Landlords can update their own subscriptions"
ON landlord_subscriptions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = landlord_subscriptions.landlord_id 
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = landlord_subscriptions.landlord_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Verify the clean policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'landlord_subscriptions'
ORDER BY policyname;

