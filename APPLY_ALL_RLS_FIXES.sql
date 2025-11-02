-- ============================================================================
-- COMPLETE RLS FIX: Fix All Infinite Recursion Issues
-- ============================================================================
-- Run this in Supabase SQL Editor to fix ALL RLS recursion errors
-- This combines fixes for tenant_info, leases, and rent_payments
-- ============================================================================

-- ============================================================================
-- PART 1: Fix tenant_info RLS Infinite Recursion
-- ============================================================================

-- Drop all conflicting policies on tenant_info
DROP POLICY IF EXISTS "tenants_can_view_own_tenant_info" ON public.tenant_info;
DROP POLICY IF EXISTS "Tenants can view their own info" ON public.tenant_info;
DROP POLICY IF EXISTS "Tenants can view own info" ON public.tenant_info;
DROP POLICY IF EXISTS "Tenants can view own tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "landlords_can_view_tenant_info" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can view tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can select their tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can insert their tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can update their tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can delete their tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can view tenant info for their properties" ON public.tenant_info;
DROP POLICY IF EXISTS "Landlords can manage their tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Caretakers can view tenant info for assigned properties" ON public.tenant_info;
DROP POLICY IF EXISTS "Security can view tenant info for assigned properties" ON public.tenant_info;
DROP POLICY IF EXISTS "Security can view all tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Caretakers can view assigned tenant info" ON public.tenant_info;
DROP POLICY IF EXISTS "Security can view assigned tenant info" ON public.tenant_info;

-- Use existing helper function (already created by profiles fix)
-- Function current_user_profile_id() already exists and is SECURITY DEFINER

-- Create TENANT policy (matches profile_id to profile.id for current user)
CREATE POLICY "Tenants can view own info" 
ON public.tenant_info
FOR SELECT
USING (profile_id = public.current_user_profile_id());

-- Create LANDLORD policies
CREATE POLICY "Landlords can view tenant info"
ON public.tenant_info
FOR SELECT
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can insert tenant info"
ON public.tenant_info
FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can update tenant info"
ON public.tenant_info
FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can delete tenant info"
ON public.tenant_info
FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- ============================================================================
-- PART 2: Fix LEASES RLS Infinite Recursion
-- ============================================================================

-- Drop all conflicting policies on leases
DROP POLICY IF EXISTS "tenants_can_view_own_leases" ON public.leases;
DROP POLICY IF EXISTS "tenants_can_view_leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view own leases" ON public.leases;
DROP POLICY IF EXISTS "landlords_can_view_tenant_leases" ON public.leases;
DROP POLICY IF EXISTS "Landlords can view tenant leases" ON public.leases;
DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON public.leases;

-- Create policy for tenants to view their own leases
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

-- Create policy for landlords to view tenant leases
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

-- ============================================================================
-- PART 3: Fix RENT_PAYMENTS RLS Infinite Recursion
-- ============================================================================

-- Drop all conflicting policies on rent_payments
DROP POLICY IF EXISTS "Users can view their rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can view their own rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Landlords can view rent payments for their properties" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can insert their own rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Landlords can insert rent payments for their properties" ON public.rent_payments;
DROP POLICY IF EXISTS "Landlords can update rent payments for their properties" ON public.rent_payments;

-- Create TENANT policy for viewing rent_payments
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

-- Create TENANT policy for inserting rent_payments
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

-- Create LANDLORD policy for viewing rent_payments
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

-- Create LANDLORD policy for inserting rent_payments
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

-- Create LANDLORD policy for updating rent_payments
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
-- PART 4: Fix SECURITY access to TENANT_INFO, LEASES, UNITS via assigned properties
-- ============================================================================

-- Drop existing security policies on tenant_info (already dropped above)
-- Drop conflicting security policies on leases
DROP POLICY IF EXISTS "Security users can view all leases" ON public.leases;
DROP POLICY IF EXISTS "Security can view all leases for visitor management" ON public.leases;

-- Create new security policy for leases
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

-- Drop conflicting security policies on units
DROP POLICY IF EXISTS "Security users can view all units" ON public.units;
DROP POLICY IF EXISTS "Security can view all units for visitor management" ON public.units;

-- Create new security policy for units
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

-- Drop conflicting security policies on profiles
DROP POLICY IF EXISTS "Security can view all profiles for visitor management" ON public.profiles;
DROP POLICY IF EXISTS "Security users can view all profiles" ON public.profiles;

-- Create new security policy for profiles
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

-- Create SECURITY policy for tenant_info (must come after landlord policies)
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

-- ============================================================================
-- SUCCESS LOG
-- ============================================================================

-- Log success
INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] Fixed ALL RLS: tenant_info, leases, rent_payments, security access', NOW());

