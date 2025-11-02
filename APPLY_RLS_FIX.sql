-- ============================================================================
-- URGENT FIX: tenant_info RLS Infinite Recursion
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the 500 errors
-- ============================================================================

-- Step 1: Drop all conflicting policies
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

-- Step 2: Use existing helper function (already created by profiles fix)
-- Function current_user_profile_id() already exists and is SECURITY DEFINER

-- Step 3: Create TENANT policy (matches profile_id to profile.id for current user)
-- Use the existing SECURITY DEFINER function to safely get profile_id
CREATE POLICY "Tenants can view own info" 
ON public.tenant_info
FOR SELECT
USING (profile_id = public.current_user_profile_id());

-- Step 4: Create LANDLORD policies (uses existing helper function)
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

-- Step 5: Fix LEASES policies (tenant access)
DROP POLICY IF EXISTS "tenants_can_view_own_leases" ON public.leases;
DROP POLICY IF EXISTS "tenants_can_view_leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view own leases" ON public.leases;

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

-- Step 6: Fix LEASES policies (landlord access)
DROP POLICY IF EXISTS "landlords_can_view_tenant_leases" ON public.leases;
DROP POLICY IF EXISTS "Landlords can view tenant leases" ON public.leases;

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

-- Log success
INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] Fixed tenant_info and leases RLS recursion', NOW());

