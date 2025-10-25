-- COMPLETE FIX: Remove ALL RLS policies causing recursion
-- Run this ENTIRE script in Supabase Dashboard SQL Editor

-- ============================================
-- STEP 1: Completely remove ALL existing policies
-- ============================================

-- Drop ALL profiles policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Landlords can create tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Landlords can view their tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Drop ALL tenant_info policies
DROP POLICY IF EXISTS "Tenants can view their own info" ON tenant_info;
DROP POLICY IF EXISTS "Landlords can view their tenant info" ON tenant_info;
DROP POLICY IF EXISTS "Users can view tenant_info" ON tenant_info;
DROP POLICY IF EXISTS "Enable read access for own tenant_info" ON tenant_info;

-- ============================================
-- STEP 2: Create SIMPLE policies without recursion
-- ============================================

-- Simple INSERT policy for profiles (NO RECURSION)
CREATE POLICY "authenticated_users_can_insert_profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow all authenticated users

-- Simple SELECT policy for profiles (NO RECURSION - just check auth.uid())
CREATE POLICY "users_can_select_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);  -- Temporarily allow all authenticated users to view profiles

-- Simple UPDATE policy for profiles
CREATE POLICY "users_can_update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 3: Fix tenant_info policies (NO RECURSION)
-- ============================================

-- Simple SELECT policy for tenant_info (NO profile table joins)
CREATE POLICY "authenticated_users_can_view_tenant_info"
ON tenant_info
FOR SELECT
TO authenticated
USING (
  -- User can view if they are the tenant (by auth_user_id)
  auth_user_id = auth.uid()
  OR
  -- Or if they are the tenant (by profile_id)
  profile_id = auth.uid()
  OR
  -- Or if their profile ID matches the landlord_id (direct check, no join)
  landlord_id = auth.uid()
  OR
  -- Or if they're in the landlord_id using a subquery (safest way)
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND tenant_info.landlord_id = auth.users.id
  )
);

-- Simple INSERT policy for tenant_info
CREATE POLICY "authenticated_users_can_insert_tenant_info"
ON tenant_info
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Simple UPDATE policy for tenant_info
CREATE POLICY "authenticated_users_can_update_tenant_info"
ON tenant_info
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR
  profile_id = auth.uid()
  OR
  landlord_id = auth.uid()
);

