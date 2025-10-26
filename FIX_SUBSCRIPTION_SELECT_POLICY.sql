-- ============================================
-- FIX LANDLORD_SUBSCRIPTIONS SELECT POLICY
-- Update to use profile.user_id check instead of direct landlord_id check
-- ============================================

-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;

-- Create new SELECT policy that checks profile.user_id
CREATE POLICY "Landlords can view their own subscriptions"
ON landlord_subscriptions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = landlord_subscriptions.landlord_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Verify the policy
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'landlord_subscriptions' AND cmd = 'SELECT'
ORDER BY policyname;

