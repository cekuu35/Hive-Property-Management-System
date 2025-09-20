-- Clean up duplicate RLS policies on profiles and keep only the safe ones

-- Drop all SELECT policies except the safe "Users can view their own profile"
DROP POLICY IF EXISTS "Caretakers can view tenant profiles for work" ON public.profiles;
DROP POLICY IF EXISTS "Caretakers can view tenants for assigned work (definer)" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view their tenants profiles (definer)" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view assigned caretaker profiles (definer)" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view assigned caretakers" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view landlord profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view their landlords profile (definer)" ON public.profiles;

-- Create the necessary SECURITY DEFINER functions (if they don't exist)
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

-- Create new safe policies with unique names
CREATE POLICY "Safe landlord profile access"
ON public.profiles
FOR SELECT
USING (public.landlord_can_view_profile(id));

CREATE POLICY "Safe tenant profile access"
ON public.profiles
FOR SELECT
USING (public.tenant_can_view_landlord_profile(id));

CREATE POLICY "Safe caretaker profile access"
ON public.profiles
FOR SELECT
USING (public.caretaker_can_view_tenant_profile(id));

CREATE POLICY "Safe assigned caretaker access"
ON public.profiles
FOR SELECT
USING (public.tenant_can_view_assigned_caretaker_profile(id));