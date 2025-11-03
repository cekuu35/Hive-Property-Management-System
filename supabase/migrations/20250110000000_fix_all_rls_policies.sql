-- ============================================================================
-- FIX ALL RLS POLICIES - Complete fix for all portals
-- ============================================================================
-- This migration drops all conflicting policies and recreates them properly
-- Run with: supabase db push
-- ============================================================================

-- STEP 1: Ensure helper function exists and has grants
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id FROM public.profiles pr WHERE pr.user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO anon;

-- STEP 2: Drop ALL existing policies that might conflict
DO $$
DECLARE
    pol RECORD;
    t TEXT;
    tables TEXT[] := ARRAY['profiles', 'properties', 'tenant_info', 'units', 'leases', 'rent_payments', 'maintenance_requests', 'staff_assignments'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
        END LOOP;
    END LOOP;
END $$ LANGUAGE plpgsql;

-- STEP 3: Create PROFILES policies (no recursion)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STEP 4: Create PROPERTIES policies
CREATE POLICY "Landlords can view their properties"
ON public.properties FOR SELECT
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can insert their properties"
ON public.properties FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can update their properties"
ON public.properties FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can delete their properties"
ON public.properties FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- STEP 5: Create STAFF_ASSIGNMENTS policies
CREATE POLICY "Landlords can view their staff assignments"
ON public.staff_assignments FOR SELECT
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Staff can view their assignments"
ON public.staff_assignments FOR SELECT
USING (staff_id = public.current_user_profile_id());

-- STEP 6: Create UNITS policies
CREATE POLICY "Landlords can view their units"
ON public.units FOR SELECT
USING (
  property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id = public.current_user_profile_id()
  )
);

-- STEP 7: Create TENANT_INFO policies
CREATE POLICY "Tenants can view own info"
ON public.tenant_info FOR SELECT
USING (profile_id = public.current_user_profile_id());

CREATE POLICY "Landlords can view their tenant info"
ON public.tenant_info FOR SELECT
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can insert their tenant info"
ON public.tenant_info FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can update their tenant info"
ON public.tenant_info FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can delete their tenant info"
ON public.tenant_info FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- STEP 8: Create LEASES policies
CREATE POLICY "Tenants can view own leases"
ON public.leases FOR SELECT
USING (
  tenant_info_id IN (
    SELECT id FROM public.tenant_info
    WHERE profile_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can view tenant leases"
ON public.leases FOR SELECT
USING (
  tenant_info_id IN (
    SELECT id FROM public.tenant_info
    WHERE landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can insert leases"
ON public.leases FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can update leases"
ON public.leases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
);

-- STEP 9: Create RENT_PAYMENTS policies
CREATE POLICY "Tenants can view own rent payments"
ON public.rent_payments FOR SELECT
USING (
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.profile_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can view tenant rent payments"
ON public.rent_payments FOR SELECT
USING (
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can insert tenant rent payments"
ON public.rent_payments FOR INSERT
WITH CHECK (
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can update tenant rent payments"
ON public.rent_payments FOR UPDATE
USING (
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
)
WITH CHECK (
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.landlord_id = public.current_user_profile_id()
  )
);

-- STEP 10: Create MAINTENANCE_REQUESTS policies
CREATE POLICY "Tenants can view their maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenant_info
    WHERE profile_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can view property maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  unit_id IN (
    SELECT u.id FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

-- STEP 11: Add security/caretaker policies for properties
CREATE POLICY "Security can view properties for assigned properties"
ON public.properties FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND sa.property_id = properties.id
  )
);

CREATE POLICY "Caretaker can view properties for assigned properties"
ON public.properties FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND sa.property_id = properties.id
  )
);

-- STEP 12: Add security/caretaker policies for units
CREATE POLICY "Security can view units for assigned properties"
ON public.units FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND sa.property_id = units.property_id
  )
);

CREATE POLICY "Caretaker can view units for assigned properties"
ON public.units FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND sa.property_id = units.property_id
  )
);

-- STEP 13: Add security/caretaker policies for tenant_info
CREATE POLICY "Security can view tenant info for assigned properties"
ON public.tenant_info FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.units u ON u.property_id = sa.property_id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND l.tenant_info_id = tenant_info.id
  )
);

CREATE POLICY "Caretaker can view tenant info for assigned properties"
ON public.tenant_info FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.units u ON u.property_id = sa.property_id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND l.tenant_info_id = tenant_info.id
  )
);

-- STEP 14: Add security/caretaker policies for leases
CREATE POLICY "Security can view leases for assigned properties"
ON public.leases FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND sa.property_id IN (
        SELECT u.property_id FROM public.units u WHERE u.id = leases.unit_id
      )
  )
);

CREATE POLICY "Caretaker can view leases for assigned properties"
ON public.leases FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = public.current_user_profile_id()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND sa.property_id IN (
        SELECT u.property_id FROM public.units u WHERE u.id = leases.unit_id
      )
  )
);

