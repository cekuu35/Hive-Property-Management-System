-- Break recursive RLS by introducing SECURITY DEFINER helpers and updating policies

-- Helper: who can view a unit (landlord of property or active tenant)
CREATE OR REPLACE FUNCTION public.user_can_view_unit(_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.profiles pr ON p.landlord_id = pr.id
      WHERE u.id = _unit_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.profiles pr ON l.tenant_id = pr.id
      WHERE l.unit_id = _unit_id
        AND l.status = 'active'
        AND pr.user_id = auth.uid()
    );
$$;

-- Helper: who can view a lease (tenant on lease or landlord of the unit's property)
CREATE OR REPLACE FUNCTION public.user_can_view_lease(_lease_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.profiles pr ON l.tenant_id = pr.id
      WHERE l.id = _lease_id
        AND pr.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.units u ON l.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.profiles pr ON p.landlord_id = pr.id
      WHERE l.id = _lease_id
        AND pr.user_id = auth.uid()
    );
$$;

-- Replace recursive policies
DROP POLICY IF EXISTS "Users can view units of their properties or leased units" ON public.units;
CREATE POLICY "Users can view units they own or lease"
ON public.units
FOR SELECT
USING (public.user_can_view_unit(id));

DROP POLICY IF EXISTS "Users can view their own leases" ON public.leases;
CREATE POLICY "Users can view relevant leases"
ON public.leases
FOR SELECT
USING (public.user_can_view_lease(id));