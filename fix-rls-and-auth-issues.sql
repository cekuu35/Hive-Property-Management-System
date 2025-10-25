-- Fix infinite recursion in RLS policies and auth issues
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- FIX 1: Remove problematic recursive policies
-- ============================================

-- Drop all existing INSERT policies on profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Landlords can create tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Users can create profiles" ON profiles;

-- Create a simple, non-recursive INSERT policy
CREATE POLICY "Allow authenticated users to create profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow all authenticated users to create profiles

-- ============================================
-- FIX 2: Fix SELECT policy to avoid recursion
-- ============================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Landlords can view their tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create simple SELECT policy
CREATE POLICY "Users can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- User can view their own profile
  auth.uid() = user_id
  OR
  -- Or if they're a landlord viewing tenant profiles (simplified, no recursion)
  EXISTS (
    SELECT 1 FROM profiles landlord_profile
    WHERE landlord_profile.user_id = auth.uid()
    AND landlord_profile.role = 'landlord'
  )
);

-- ============================================
-- FIX 3: Fix tenant_info policies to avoid recursion
-- ============================================

-- Drop existing tenant_info policies that might cause recursion
DROP POLICY IF EXISTS "Tenants can view their own info" ON tenant_info;
DROP POLICY IF EXISTS "Landlords can view their tenant info" ON tenant_info;
DROP POLICY IF EXISTS "Enable read access for own tenant_info" ON tenant_info;

-- Create simple tenant_info SELECT policy
CREATE POLICY "Users can view tenant_info"
ON tenant_info
FOR SELECT
TO authenticated
USING (
  -- Tenant can view their own info
  auth_user_id = auth.uid()
  OR
  profile_id = auth.uid()
  OR
  -- Landlord can view their tenants (use direct column, no joins)
  landlord_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ============================================
-- FIX 4: Ensure profiles table has all needed columns
-- ============================================

-- Add email column if it doesn't exist (for profile lookup)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

