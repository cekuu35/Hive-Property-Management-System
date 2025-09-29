-- Create RLS policies for security users to access data needed for visitor management

-- Security users can view lease data for visitor management
CREATE POLICY "Security can view all leases for visitor management" 
ON leases 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'security'
  )
);

-- Security users can view all profiles  
CREATE POLICY "Security can view all profiles for visitor management" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'security'
  )
);

-- Security users can view all units
CREATE POLICY "Security can view all units for visitor management" 
ON units 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'security'
  )
);

-- Security users can view all properties  
CREATE POLICY "Security can view all properties for visitor management" 
ON properties 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'security'
  )
);