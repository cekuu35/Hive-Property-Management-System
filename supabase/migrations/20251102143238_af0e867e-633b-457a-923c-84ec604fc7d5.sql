-- Fix infinite recursion in units table RLS policies
-- The issue is circular dependencies between units, properties, and staff_assignments

-- Drop all existing policies on units table
DROP POLICY IF EXISTS "Landlords can view their units" ON public.units;
DROP POLICY IF EXISTS "Landlords can insert units" ON public.units;
DROP POLICY IF EXISTS "Landlords can update their units" ON public.units;
DROP POLICY IF EXISTS "Landlords can delete their units" ON public.units;
DROP POLICY IF EXISTS "Tenants can view their unit" ON public.units;
DROP POLICY IF EXISTS "Security can view units for assigned properties" ON public.units;
DROP POLICY IF EXISTS "Caretaker can view units for assigned properties" ON public.units;

-- Recreate policies without recursion
-- Landlords have full access to units in their properties
CREATE POLICY "Landlords can view their units"
  ON public.units
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

CREATE POLICY "Landlords can insert units"
  ON public.units
  FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

CREATE POLICY "Landlords can update their units"
  ON public.units
  FOR UPDATE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

CREATE POLICY "Landlords can delete their units"
  ON public.units
  FOR DELETE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

-- Tenants can view their unit through active leases
CREATE POLICY "Tenants can view their unit"
  ON public.units
  FOR SELECT
  USING (
    id IN (
      SELECT l.unit_id
      FROM leases l
      JOIN tenant_info ti ON l.tenant_info_id = ti.id
      WHERE ti.profile_id = current_user_profile_id()
        AND l.status = 'active'
    )
  );

-- Staff can view units for properties they're assigned to (simplified)
CREATE POLICY "Staff can view assigned property units"
  ON public.units
  FOR SELECT
  USING (
    property_id IN (
      SELECT property_id 
      FROM staff_assignments
      WHERE staff_id = current_user_profile_id()
        AND is_active = true
    )
  );