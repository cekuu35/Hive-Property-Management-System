-- ============================================================================
-- URGENT FIX: Drop ALL Recursive RLS Policies and Recreate Safe Ones
-- ============================================================================
-- This script fixes the "Profile not found" error affecting ALL portals
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL policies on profiles table
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Recreate profiles policies WITHOUT recursion
-- ============================================================================

-- Create ONLY the essential policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Drop ALL policies on tenant_info table
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tenant_info'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.tenant_info';
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Recreate tenant_info policies (using current_user_profile_id helper)
-- ============================================================================

-- Ensure current_user_profile_id() function exists
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.user_id = auth.uid()
  LIMIT 1;
$$;

-- Tenants can view their own info
CREATE POLICY "Tenants can view own info" 
ON public.tenant_info
FOR SELECT
USING (profile_id = public.current_user_profile_id());

-- Landlords can select their tenant info
CREATE POLICY "Landlords can select their tenant info"
ON public.tenant_info
FOR SELECT
USING (landlord_id = public.current_user_profile_id());

-- Landlords can insert their tenant info
CREATE POLICY "Landlords can insert their tenant info"
ON public.tenant_info
FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

-- Landlords can update their tenant info
CREATE POLICY "Landlords can update their tenant info"
ON public.tenant_info
FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

-- Landlords can delete their tenant info
CREATE POLICY "Landlords can delete their tenant info"
ON public.tenant_info
FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 5: Fix leases policies
-- ============================================================================

-- Drop all leases policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'leases'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.leases';
    END LOOP;
END $$;

-- Tenants can view own leases
CREATE POLICY "Tenants can view own leases"
ON public.leases
FOR SELECT
USING (
  tenant_info_id IN (
    SELECT id 
    FROM public.tenant_info 
    WHERE profile_id = public.current_user_profile_id()
  )
);

-- Landlords can view tenant leases
CREATE POLICY "Landlords can view tenant leases"
ON public.leases
FOR SELECT
USING (
  tenant_info_id IN (
    SELECT id 
    FROM public.tenant_info 
    WHERE landlord_id = public.current_user_profile_id()
  )
);

-- Landlords can insert leases for their units
CREATE POLICY "Landlords can insert leases for their units"
ON public.leases
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
);

-- Landlords can update leases for their units
CREATE POLICY "Landlords can update leases for their units"
ON public.leases
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
);

-- ============================================================================
-- STEP 6: Add Security and Caretaker access policies
-- ============================================================================

-- Security can view units for assigned properties
CREATE POLICY "Security can view units for assigned properties"
ON public.units
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND sa.property_id = units.property_id
  )
);

-- Caretaker can view units for assigned properties
CREATE POLICY "Caretaker can view units for assigned properties"
ON public.units
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND sa.property_id = units.property_id
  )
);

-- Security can view leases for assigned properties
CREATE POLICY "Security can view leases for assigned properties"
ON public.leases
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND sa.property_id IN (
        SELECT u.property_id
        FROM public.units u
        WHERE u.id = leases.unit_id
      )
  )
);

-- Security can view tenant info for assigned properties
CREATE POLICY "Security can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.units u ON u.property_id = sa.property_id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND l.tenant_info_id = tenant_info.id
  )
);

-- Caretaker can view tenant info for assigned properties
CREATE POLICY "Caretaker can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.units u ON u.property_id = sa.property_id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND l.tenant_info_id = tenant_info.id
  )
);

-- Security can view tenant profiles (for visitor access)
CREATE POLICY "Security can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  role = 'tenant'
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
  )
);

-- ============================================================================
-- SUCCESS LOG
-- ============================================================================

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] URGENT FIX: Dropped all recursive RLS policies and recreated safe ones', NOW());

-- ============================================================================
-- DONE! Refresh your browser and test all portals
-- ============================================================================

