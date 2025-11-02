-- Fix infinite recursion in staff_assignments table RLS policies
-- The issue is circular dependencies with other tables

-- Drop all existing policies on staff_assignments table
DROP POLICY IF EXISTS "Landlords can view staff assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Landlords can insert staff assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Landlords can update staff assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Landlords can delete staff assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Staff can view their own assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Security can view all staff assignments" ON public.staff_assignments;

-- Recreate policies without recursion
-- Landlords can manage staff assignments for their properties
CREATE POLICY "Landlords can view staff assignments"
  ON public.staff_assignments
  FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

CREATE POLICY "Landlords can insert staff assignments"
  ON public.staff_assignments
  FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

CREATE POLICY "Landlords can update staff assignments"
  ON public.staff_assignments
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

CREATE POLICY "Landlords can delete staff assignments"
  ON public.staff_assignments
  FOR DELETE
  USING (
    property_id IN (
      SELECT id FROM properties WHERE landlord_id = current_user_profile_id()
    )
  );

-- Staff can view their own assignments (simplified)
CREATE POLICY "Staff can view their own assignments"
  ON public.staff_assignments
  FOR SELECT
  USING (staff_id = current_user_profile_id());