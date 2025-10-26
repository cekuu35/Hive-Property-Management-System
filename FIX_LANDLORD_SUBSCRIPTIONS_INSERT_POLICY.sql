-- ============================================
-- FIX LANDLORD_SUBSCRIPTIONS INSERT POLICY
-- Allow users to create subscriptions using their profile.id
-- ============================================

-- Drop the old policy
DROP POLICY IF EXISTS "Landlords can create their own subscriptions" ON landlord_subscriptions;

-- Create new policy that checks profile.user_id
CREATE POLICY "Landlords can create their own subscriptions"
ON landlord_subscriptions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = landlord_subscriptions.landlord_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Also update the UPDATE policy for consistency
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;

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

-- Verify the policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'landlord_subscriptions'
ORDER BY policyname;

