
-- Fix infinite recursion in tenant_info RLS policies
-- The issue is the Security policy creates a circular dependency through leases

-- Drop the problematic policy
DROP POLICY IF EXISTS "Security can view tenant info" ON public.tenant_info;

-- Create a simpler policy that doesn't cause recursion
-- Security staff can view tenant info for properties they're assigned to
CREATE POLICY "Security can view tenant info"
  ON public.tenant_info
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM staff_assignments sa
      WHERE sa.staff_id = current_user_profile_id()
        AND sa.role = 'security'
        AND sa.is_active = true
        AND sa.property_id IN (
          SELECT u.property_id 
          FROM units u
          INNER JOIN leases l ON l.unit_id = u.id
          WHERE l.tenant_info_id = tenant_info.id
          LIMIT 1
        )
    )
  );
