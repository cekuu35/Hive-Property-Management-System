-- Test RLS Policies - Run this separately to test

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Service role can log admin actions" ON admin_actions;

-- Create policies
CREATE POLICY "Admins can view admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can log admin actions" ON admin_actions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

