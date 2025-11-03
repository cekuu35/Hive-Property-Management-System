-- ============================================================================
-- Fix Infinite Recursion in tenant_info and leases RLS Policies
-- ============================================================================
-- The caretaker policy on tenant_info is causing recursion because it queries
-- tables (leases, maintenance_requests) that also query tenant_info.
-- Solution: Use SECURITY DEFINER functions to break the recursion cycle.
-- ============================================================================

-- Step 1: Drop existing function if it exists (to avoid parameter name conflicts)
-- PostgreSQL doesn't allow changing parameter names, so we must drop and recreate
-- Drop all variations of the function (with different parameter names)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find and drop all functions with this name regardless of parameter name
  FOR func_record IN
    SELECT oid::regprocedure as func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'caretaker_can_view_tenant_info'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- If function doesn't exist, that's fine
  NULL;
END $$;

-- Step 2: Create helper function for caretaker to view tenant_info (breaks recursion)
CREATE OR REPLACE FUNCTION public.caretaker_can_view_tenant_info(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND (l.tenant_id = p_profile_id OR l.tenant_info_id IS NOT NULL)
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    JOIN public.units u ON mr.unit_id = u.id
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND mr.tenant_id = p_profile_id
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.caretaker_can_view_tenant_info(uuid) TO authenticated;

-- Step 3: Drop existing function if it exists
DROP FUNCTION IF EXISTS public.caretaker_can_view_lease(uuid);

-- Step 4: Create helper function for caretaker to view leases (breaks recursion)
CREATE OR REPLACE FUNCTION public.caretaker_can_view_lease(p_lease_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leases l
    JOIN public.units u ON l.unit_id = u.id
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND l.id = p_lease_id
      AND sa.role = 'caretaker'
      AND sa.is_active = true
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.caretaker_can_view_lease(uuid) TO authenticated;

-- Step 5: Drop and recreate tenant_info policy using SECURITY DEFINER function
DROP POLICY IF EXISTS "Caretakers can view tenant info for assigned properties" ON public.tenant_info;

CREATE POLICY "Caretakers can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  public.caretaker_can_view_tenant_info(profile_id)
);

-- Step 6: Drop and recreate leases policy using SECURITY DEFINER function
DROP POLICY IF EXISTS "Caretakers can view leases for assigned properties" ON public.leases;

CREATE POLICY "Caretakers can view leases for assigned properties"
ON public.leases
FOR SELECT
USING (
  public.caretaker_can_view_lease(id)
);

-- Step 7: Also fix the security policy for tenant_info if it exists and has recursion
-- (Security role might have similar issues)
DROP POLICY IF EXISTS "Security can view tenant info for assigned properties" ON public.tenant_info;

-- Drop existing function if it exists (with any parameter name)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find and drop all functions with this name regardless of parameter name
  FOR func_record IN
    SELECT oid::regprocedure as func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'security_can_view_tenant_info'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- If function doesn't exist, that's fine
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.security_can_view_tenant_info(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND (l.tenant_id = p_profile_id OR l.tenant_info_id IS NOT NULL)
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    JOIN public.units u ON mr.unit_id = u.id
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND mr.tenant_id = p_profile_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.security_can_view_tenant_info(uuid) TO authenticated;

CREATE POLICY "Security can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  public.security_can_view_tenant_info(profile_id)
);

-- Verification: Check for any remaining recursive patterns
-- Run this query to see all tenant_info policies:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'tenant_info';

