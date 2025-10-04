-- Add RLS policy for security to view tenant_info
CREATE POLICY "Security can view all tenant info"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'security'
  )
);