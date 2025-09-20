-- Fix RLS infinite recursion on public.profiles by replacing all recursive SELECT policies with safe SECURITY DEFINER functions

-- Drop all existing SELECT policies on profiles (to avoid conflicts)
DROP POLICY IF EXISTS "Caretakers can view profiles for assigned work" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view their tenants profiles" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view their tenants profiles (definer)" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view their landlords profile" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view their landlords profile (definer)" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in shared maintenance requests" ON public.profiles;
DROP POLICY IF EXISTS "Caretakers can view tenants for assigned work (definer)" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view assigned caretaker profiles (definer)" ON public.profiles;

-- 1) Helper: Get current user's profile id (bypasses RLS safely)
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

-- 2) Landlord can view tenant profiles (active lease relationship)
CREATE OR REPLACE FUNCTION public.landlord_can_view_profile(_target_profile_id uuid)
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
    JOIN public.properties p ON u.property_id = p.id
    JOIN public.profiles landlord_pr ON p.landlord_id = landlord_pr.id
    WHERE l.status = 'active'
      AND landlord_pr.user_id = auth.uid()
      AND l.tenant_id = _target_profile_id
  );
$$;

-- 3) Tenant can view landlord profile (active lease relationship)
CREATE OR REPLACE FUNCTION public.tenant_can_view_landlord_profile(_target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leases l
    JOIN public.profiles tenant_pr ON l.tenant_id = tenant_pr.id
    JOIN public.units u ON l.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    WHERE l.status = 'active'
      AND tenant_pr.user_id = auth.uid()
      AND p.landlord_id = _target_profile_id
  );
$$;

-- 4) Caretaker can view tenant profiles for assigned work
CREATE OR REPLACE FUNCTION public.caretaker_can_view_tenant_profile(_target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    JOIN public.profiles caretaker_pr ON mr.assigned_to = caretaker_pr.id
    WHERE caretaker_pr.user_id = auth.uid()
      AND mr.tenant_id = _target_profile_id
  );
$$;

-- 5) Tenant can view assigned caretaker profiles
CREATE OR REPLACE FUNCTION public.tenant_can_view_assigned_caretaker_profile(_target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    JOIN public.profiles tenant_pr ON mr.tenant_id = tenant_pr.id
    WHERE tenant_pr.user_id = auth.uid()
      AND mr.assigned_to = _target_profile_id
  );
$$;

-- Create safe SELECT policies using SECURITY DEFINER functions (no recursion)
CREATE POLICY "Landlords can view tenant profiles"
ON public.profiles
FOR SELECT
USING (public.landlord_can_view_profile(id));

CREATE POLICY "Tenants can view landlord profiles"
ON public.profiles
FOR SELECT
USING (public.tenant_can_view_landlord_profile(id));

CREATE POLICY "Caretakers can view tenant profiles for work"
ON public.profiles
FOR SELECT
USING (public.caretaker_can_view_tenant_profile(id));

CREATE POLICY "Tenants can view assigned caretakers"
ON public.profiles
FOR SELECT
USING (public.tenant_can_view_assigned_caretaker_profile(id));

-- Keep the "Users can view their own profile" policy (this one is safe)
-- It should already exist from before