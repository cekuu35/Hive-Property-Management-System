-- ============================================================================
-- URGENT FIX: rent_payments RLS Infinite Recursion
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the rent_payments 500 errors
-- ============================================================================

-- Step 1: Drop all conflicting policies on rent_payments
DROP POLICY IF EXISTS "Users can view their rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can view their own rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Landlords can view rent payments for their properties" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can insert their own rent payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Landlords can insert rent payments for their properties" ON public.rent_payments;
DROP POLICY IF EXISTS "Landlords can update rent payments for their properties" ON public.rent_payments;

-- Step 2: Use existing helper function (already created by profiles fix)
-- Function current_user_profile_id() already exists and is SECURITY DEFINER

-- Step 3: Create TENANT policy for viewing rent_payments
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

-- Step 4: Create TENANT policy for inserting rent_payments
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

-- Step 5: Create LANDLORD policy for viewing rent_payments
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

-- Step 6: Create LANDLORD policy for inserting rent_payments
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

-- Step 7: Create LANDLORD policy for updating rent_payments
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

-- Log success
INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] Fixed rent_payments RLS recursion', NOW());

