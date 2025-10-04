-- Fix RLS policy for tenants to approve/reject visitor requests
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Tenants can update their pending visitor requests" ON public.visitor_requests;

-- Create a proper policy that allows tenants to approve/reject requests
CREATE POLICY "Tenants can approve/reject visitor requests"
ON public.visitor_requests
FOR UPDATE
USING (
  tenant_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  AND status = 'pending'
)
WITH CHECK (
  tenant_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  AND status IN ('pending', 'approved', 'rejected')
);