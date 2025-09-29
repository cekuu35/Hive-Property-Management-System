-- Fix infinite recursion in RLS policies by creating security definer functions
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Security can view all profiles for visitor management" ON profiles;
DROP POLICY IF EXISTS "Security can view all leases for visitor management" ON leases;
DROP POLICY IF EXISTS "Security can view all units for visitor management" ON units;
DROP POLICY IF EXISTS "Security can view all properties for visitor management" ON properties;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_security_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'security'
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Security users can view all profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (public.is_security_user());

CREATE POLICY "Security users can view all leases" 
ON leases 
FOR SELECT 
TO authenticated
USING (public.is_security_user());

CREATE POLICY "Security users can view all units" 
ON units 
FOR SELECT 
TO authenticated
USING (public.is_security_user());

CREATE POLICY "Security users can view all properties" 
ON properties 
FOR SELECT 
TO authenticated
USING (public.is_security_user());