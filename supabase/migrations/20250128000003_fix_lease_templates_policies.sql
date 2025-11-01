-- Fix lease_templates RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Landlords can view their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Landlords can insert their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Landlords can update their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Landlords can delete their own lease templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Tenants can view their landlord's lease templates" ON public.lease_templates;

-- Recreate policies
CREATE POLICY "Landlords can view their own lease templates"
  ON public.lease_templates
  FOR SELECT
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can insert their own lease templates"
  ON public.lease_templates
  FOR INSERT
  WITH CHECK (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can update their own lease templates"
  ON public.lease_templates
  FOR UPDATE
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can delete their own lease templates"
  ON public.lease_templates
  FOR DELETE
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

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

