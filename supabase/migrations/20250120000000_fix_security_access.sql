-- Fix security role access to units and leases for visitor registration
-- This migration adds RLS policies to allow security personnel to view units and leases

-- Update the user_can_view_unit function to include security role
CREATE OR REPLACE FUNCTION public.user_can_view_unit(_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Security role can view all units
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid() 
        AND pr.role = 'security'
    )
    OR
    -- Landlord can view units of their properties
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.profiles pr ON p.landlord_id = pr.id
      WHERE u.id = _unit_id
        AND pr.user_id = auth.uid()
    )
    OR
    -- Tenant can view units they lease
    EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.profiles pr ON l.tenant_id = pr.id
      WHERE l.unit_id = _unit_id
        AND l.status = 'active'
        AND pr.user_id = auth.uid()
    );
$$;

-- Update the user_can_view_lease function to include security role
CREATE OR REPLACE FUNCTION public.user_can_view_lease(_lease_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Security role can view all leases
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid() 
        AND pr.role = 'security'
    )
    OR
    -- Tenant can view their own leases
    EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.profiles pr ON l.tenant_id = pr.id
      WHERE l.id = _lease_id
        AND pr.user_id = auth.uid()
    )
    OR
    -- Landlord can view leases for units in their properties
    EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.units u ON l.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.profiles pr ON p.landlord_id = pr.id
      WHERE l.id = _lease_id
        AND pr.user_id = auth.uid()
    );
$$;

-- Update the user_can_view_property function to include security role
CREATE OR REPLACE FUNCTION public.user_can_view_property(_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Security role can view all properties
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid() 
        AND pr.role = 'security'
    )
    OR
    -- Landlord can view their own properties
    EXISTS (
      SELECT 1
      FROM public.properties p
      JOIN public.profiles pr ON p.landlord_id = pr.id
      WHERE p.id = _property_id
        AND pr.user_id = auth.uid()
    )
    OR
    -- Tenant can view properties where they have active leases
    EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.units u ON l.unit_id = u.id
      JOIN public.profiles pr ON l.tenant_id = pr.id
      WHERE u.property_id = _property_id
        AND l.status = 'active'
        AND pr.user_id = auth.uid()
    );
$$;

-- Update the user_can_view_profile function to include security role
CREATE OR REPLACE FUNCTION public.user_can_view_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Security role can view all profiles
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.user_id = auth.uid() 
        AND pr.role = 'security'
    )
    OR
    -- Users can view their own profile
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = _profile_id
        AND pr.user_id = auth.uid()
    )
    OR
    -- Landlords can view tenant profiles for their properties
    EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.units u ON l.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.profiles landlord_pr ON p.landlord_id = landlord_pr.id
      WHERE l.tenant_id = _profile_id
        AND l.status = 'active'
        AND landlord_pr.user_id = auth.uid()
    );
$$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Security can view all profiles" ON public.profiles;
CREATE POLICY "Security can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.user_id = auth.uid() 
      AND pr.role = 'security'
  )
);

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Security can view all properties" ON public.properties;
CREATE POLICY "Security can view all properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.user_id = auth.uid() 
      AND pr.role = 'security'
  )
);
