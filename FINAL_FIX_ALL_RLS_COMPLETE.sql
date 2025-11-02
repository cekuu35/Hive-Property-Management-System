-- ============================================================================
-- FINAL COMPLETE RLS FIX - Fixes ALL recursion issues
-- ============================================================================
-- This script comprehensively fixes ALL RLS policies across all tables
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL policies on profiles table and recreate safe ones
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

-- Recreate ONLY safe profiles policies (no recursion)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 2: Ensure current_user_profile_id() helper function exists
-- ============================================================================

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

-- ============================================================================
-- STEP 3: Drop ALL policies on tenant_info and recreate safe ones
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

-- Create safe tenant_info policies
CREATE POLICY "Tenants can view own info" 
ON public.tenant_info
FOR SELECT
USING (profile_id = public.current_user_profile_id());

CREATE POLICY "Landlords can select their tenant info"
ON public.tenant_info
FOR SELECT
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can insert their tenant info"
ON public.tenant_info
FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can update their tenant info"
ON public.tenant_info
FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can delete their tenant info"
ON public.tenant_info
FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 4: Drop ALL policies on leases and recreate safe ones
-- ============================================================================

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

-- Create safe leases policies
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
-- STEP 5: Drop ALL policies on units and recreate safe ones
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'units'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.units';
    END LOOP;
END $$;

-- Create base units policies for landlords and tenants
CREATE POLICY "Landlords can view their units"
ON public.units
FOR SELECT
USING (
  property_id IN (
    SELECT id 
    FROM public.properties 
    WHERE landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Tenants can view their leased units"
ON public.units
FOR SELECT
USING (
  id IN (
    SELECT unit_id 
    FROM public.leases 
    WHERE tenant_info_id IN (
      SELECT id 
      FROM public.tenant_info 
      WHERE profile_id = public.current_user_profile_id()
    )
  )
);

-- Create security and caretaker units policies
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

-- ============================================================================
-- STEP 6: Add security access to tenant_info, leases, and profiles
-- ============================================================================

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
-- STEP 7: Fix staff_assignments recursion if it exists
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'staff_assignments'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.staff_assignments';
    END LOOP;
END $$;

-- Recreate safe staff_assignments policies
CREATE POLICY "Landlords can view their staff assignments"
ON public.staff_assignments
FOR SELECT
USING (
  property_id IN (
    SELECT id 
    FROM public.properties 
    WHERE landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Staff can view their own assignments"
ON public.staff_assignments
FOR SELECT
USING (staff_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 8: Fix rent_payments policies
-- ============================================================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'rent_payments'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.rent_payments';
    END LOOP;
END $$;

-- Create safe rent_payments policies
CREATE POLICY "Tenants can view own rent payments"
ON public.rent_payments
FOR SELECT
USING (
  lease_id IN (
    SELECT l.id
    FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.profile_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Tenants can insert own rent payments"
ON public.rent_payments
FOR INSERT
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.profile_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can view tenant rent payments"
ON public.rent_payments
FOR SELECT
USING (
  lease_id IN (
    SELECT l.id
    FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can insert tenant rent payments"
ON public.rent_payments
FOR INSERT
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can update tenant rent payments"
ON public.rent_payments
FOR UPDATE
USING (
  lease_id IN (
    SELECT l.id
    FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
)
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
);

-- ============================================================================
-- SUCCESS LOG
-- ============================================================================

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] FINAL FIX: Dropped ALL recursive RLS policies and recreated safe ones', NOW());

-- ============================================================================
-- DONE! Refresh your browser and test all portals
-- ============================================================================

