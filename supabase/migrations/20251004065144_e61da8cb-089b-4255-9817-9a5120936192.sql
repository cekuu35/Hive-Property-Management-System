-- Add RLS policy for security to create visitor requests
CREATE POLICY "Security can create visitor requests"
ON public.visitor_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'security'
  )
);