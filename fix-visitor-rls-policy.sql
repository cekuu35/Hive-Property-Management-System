-- Fix RLS policy for visitors table to properly handle INSERT operations
-- The current policy uses USING which doesn't work for INSERT operations

-- Drop the existing policy
DROP POLICY IF EXISTS "Security can manage all visitor records" ON public.visitors;

-- Create separate policies for different operations
CREATE POLICY "Security can insert visitor records" 
ON public.visitors 
FOR INSERT 
WITH CHECK (
  security_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'security'
  )
);

CREATE POLICY "Security can view visitor records" 
ON public.visitors 
FOR SELECT 
USING (
  security_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'security'
  )
);

CREATE POLICY "Security can update visitor records" 
ON public.visitors 
FOR UPDATE 
USING (
  security_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'security'
  )
);

CREATE POLICY "Security can delete visitor records" 
ON public.visitors 
FOR DELETE 
USING (
  security_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'security'
  )
);
