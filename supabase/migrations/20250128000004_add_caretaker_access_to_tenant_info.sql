-- Add RLS policy for caretakers to view tenant_info for their assigned properties
-- This allows them to view tenants who have maintenance requests in properties they're assigned to
CREATE POLICY "Caretakers can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.maintenance_requests mr ON mr.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND tenant_info.profile_id = mr.tenant_id
  )
);

-- Add RLS policy for security to view tenant_info for their assigned properties
-- This allows them to view tenants who have maintenance requests in properties they're assigned to
CREATE POLICY "Security can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.maintenance_requests mr ON mr.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND tenant_info.profile_id = mr.tenant_id
  )
);

