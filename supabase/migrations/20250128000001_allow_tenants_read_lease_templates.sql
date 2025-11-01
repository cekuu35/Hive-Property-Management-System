-- Allow tenants to read lease templates for their landlords
-- Tenants need to view templates when accessing their lease documents

-- Add policy for tenants to view lease templates
-- Tenants can view templates from landlords who have properties they're leasing
CREATE POLICY "Tenants can view their landlord's lease templates"
  ON public.lease_templates
  FOR SELECT
  USING (
    landlord_id IN (
      SELECT p.landlord_id
      FROM public.leases l
      JOIN public.units u ON l.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
      WHERE ti.profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
      AND l.status IN ('active', 'approved')
    )
  );

