-- Fix RLS policies to allow landlords to create tenant profiles

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow landlords to create profiles for their tenants
DROP POLICY IF EXISTS "Landlords can create tenant profiles" ON profiles;

CREATE POLICY "Landlords can create tenant profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if the profile being created has role 'tenant'
  role = 'tenant'
  OR
  -- Or if it's the user's own profile
  auth.uid() = user_id
);

-- Ensure landlords can view tenant profiles
DROP POLICY IF EXISTS "Landlords can view their tenant profiles" ON profiles;

CREATE POLICY "Landlords can view their tenant profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  id IN (
    SELECT ti.profile_id
    FROM tenant_info ti
    JOIN profiles p ON ti.landlord_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

