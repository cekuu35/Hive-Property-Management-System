-- ============================================================================
-- RESTORE TO LAST KNOWN WORKING STATE
-- ============================================================================
-- This restores RLS policies to match the working migration state
-- Based on migrations 20250917090000, 20250115000007, and related fixes
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure helper function exists and has correct permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.user_id = auth.uid()
  LIMIT 1;
$$;

-- CRITICAL: Grant execute to authenticated (was missing!)
GRANT EXECUTE ON FUNCTION public.current_user_profile_id() TO authenticated, anon;

-- ============================================================================
-- STEP 2: Restore PROFILES policies (from migration 20250917090000)
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Essential profiles policies (no recursion - uses auth.uid() directly)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Restore TENANT_INFO policies (from migration 20250115000007)
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_info'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_info', pol.policyname);
    END LOOP;
END $$;

-- Tenants can view their own info (using helper function to avoid recursion)
CREATE POLICY "Tenants can view their own info" 
ON public.tenant_info FOR SELECT 
USING (profile_id = public.current_user_profile_id());

-- Landlords can view tenant info (using helper function)
CREATE POLICY "Landlords can view tenant info for their properties" 
ON public.tenant_info FOR SELECT 
USING (
  id IN (
    SELECT DISTINCT l.tenant_info_id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can insert tenant info"
ON public.tenant_info FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can update tenant info"
ON public.tenant_info FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can delete tenant info"
ON public.tenant_info FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 4: Restore LEASES policies (from migration 20250115000007)
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leases'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.leases', pol.policyname);
    END LOOP;
END $$;

-- Tenants can view their own leases
CREATE POLICY "Tenants can view their own leases" 
ON public.leases FOR SELECT 
USING (
  tenant_info_id IN (
    SELECT ti.id
    FROM tenant_info ti
    WHERE ti.profile_id = public.current_user_profile_id()
  )
);

-- Landlords can view leases for their properties
CREATE POLICY "Landlords can view leases for their properties" 
ON public.leases FOR SELECT 
USING (
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can insert leases for their units"
ON public.leases FOR INSERT
WITH CHECK (
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Landlords can update leases for their units"
ON public.leases FOR UPDATE
USING (
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
)
WITH CHECK (
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

-- ============================================================================
-- STEP 5: Restore RENT_PAYMENTS policies (from migration 20250115000007)
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rent_payments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rent_payments', pol.policyname);
    END LOOP;
END $$;

-- Tenants can view their own rent payments
CREATE POLICY "Tenants can view their own rent payments" 
ON public.rent_payments FOR SELECT 
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.profile_id = public.current_user_profile_id() AND l.status = 'active'
  )
);

-- Landlords can view rent payments for their properties
CREATE POLICY "Landlords can view rent payments for their properties" 
ON public.rent_payments FOR SELECT 
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

-- Tenants can insert their own rent payments (for payment recording)
CREATE POLICY "Tenants can insert their own rent payments" 
ON public.rent_payments FOR INSERT 
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    WHERE ti.profile_id = public.current_user_profile_id() AND l.status = 'active'
  )
);

-- Landlords can insert rent payments for their properties
CREATE POLICY "Landlords can insert rent payments for their properties" 
ON public.rent_payments FOR INSERT 
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

-- Landlords can update rent payments for their properties (IMPORTANT: Controls payment status!)
CREATE POLICY "Landlords can update rent payments for their properties" 
ON public.rent_payments FOR UPDATE 
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
)
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.landlord_id = public.current_user_profile_id()
  )
);

-- ============================================================================
-- STEP 6: Restore PROPERTIES policies (from migration 20250115000006)
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Landlords can view their own properties" 
ON public.properties FOR SELECT 
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can manage their properties"
ON public.properties FOR ALL
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 7: Restore UNITS policies (from migration 20250115000006)
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'units'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.units', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Landlords can view units for their properties" 
ON public.units FOR SELECT 
USING (
  property_id IN (
    SELECT id FROM public.properties 
    WHERE landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Tenants can view their leased units"
ON public.units FOR SELECT
USING (
  id IN (
    SELECT unit_id FROM public.leases 
    WHERE tenant_info_id IN (
      SELECT id FROM public.tenant_info 
      WHERE profile_id = public.current_user_profile_id()
    )
  )
);

-- ============================================================================
-- STEP 8: Restore MAINTENANCE_REQUESTS policies
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.maintenance_requests', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Landlords can view maintenance requests for their properties" 
ON public.maintenance_requests FOR SELECT 
USING (
  unit_id IN (
    SELECT id FROM public.units 
    WHERE property_id IN (
      SELECT id FROM public.properties 
      WHERE landlord_id = public.current_user_profile_id()
    )
  )
);

CREATE POLICY "Tenants can view their maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  unit_id IN (
    SELECT unit_id FROM public.leases 
    WHERE tenant_info_id IN (
      SELECT id FROM public.tenant_info 
      WHERE profile_id = public.current_user_profile_id()
    )
  )
);

-- ============================================================================
-- STEP 9: Add Security/Caretaker access (from migration 20250128000004)
-- ============================================================================

-- Security can view tenant info for assigned properties
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

-- Security can view units for assigned properties
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

-- Security can view leases for assigned properties
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
        SELECT u.property_id
        FROM public.units u
        WHERE u.id = leases.unit_id
      )
  )
);

-- ============================================================================
-- STEP 10: Restore STAFF_ASSIGNMENTS policies
-- ============================================================================

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_assignments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_assignments', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Landlords can view their staff assignments"
ON public.staff_assignments FOR SELECT
USING (
  property_id IN (
    SELECT id FROM public.properties 
    WHERE landlord_id = public.current_user_profile_id()
  )
);

CREATE POLICY "Staff can view their own assignments"
ON public.staff_assignments FOR SELECT
USING (staff_id = public.current_user_profile_id());

-- ============================================================================
-- SUCCESS LOG
-- ============================================================================

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ RESTORE: Restored RLS policies to last known working state', NOW());

-- ============================================================================
-- DONE - Refresh browser and test
-- ============================================================================

