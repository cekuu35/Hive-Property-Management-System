-- Fix RLS for tenant_info with explicit policies
DROP POLICY IF EXISTS "Landlords can manage their tenant info" ON public.tenant_info;

CREATE POLICY "Landlords can select their tenant info"
ON public.tenant_info
FOR SELECT
USING (
  landlord_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can insert their tenant info"
ON public.tenant_info
FOR INSERT
WITH CHECK (
  landlord_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can update their tenant info"
ON public.tenant_info
FOR UPDATE
USING (
  landlord_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  landlord_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can delete their tenant info"
ON public.tenant_info
FOR DELETE
USING (
  landlord_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow landlords to insert/update leases for their units
CREATE POLICY "Landlords can insert leases for their units"
ON public.leases
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    JOIN public.profiles pr ON p.landlord_id = pr.id
    WHERE u.id = unit_id
      AND pr.user_id = auth.uid()
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
    JOIN public.profiles pr ON p.landlord_id = pr.id
    WHERE u.id = unit_id
      AND pr.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    JOIN public.profiles pr ON p.landlord_id = pr.id
    WHERE u.id = unit_id
      AND pr.user_id = auth.uid()
  )
);