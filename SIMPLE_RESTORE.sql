-- ============================================================================
-- SIMPLE RESTORE - Minimal fix to restore access
-- ============================================================================
-- This is the MINIMAL fix needed to restore your project
-- ============================================================================

-- STEP 1: Fix helper function and GRANT execute
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

-- STEP 2: Make profiles accessible (allows helper function to work)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STEP 3: Fix tenant_info (tenants and landlords)
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_info'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_info', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Tenants can view own info" ON public.tenant_info FOR SELECT
USING (profile_id = public.current_user_profile_id());

CREATE POLICY "Landlords can view tenant info" ON public.tenant_info FOR SELECT
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can insert tenant info" ON public.tenant_info FOR INSERT
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can update tenant info" ON public.tenant_info FOR UPDATE
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can delete tenant info" ON public.tenant_info FOR DELETE
USING (landlord_id = public.current_user_profile_id());

-- STEP 4: Fix leases
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leases'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.leases', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Tenants can view own leases" ON public.leases FOR SELECT
USING (tenant_info_id IN (SELECT id FROM public.tenant_info WHERE profile_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can view tenant leases" ON public.leases FOR SELECT
USING (tenant_info_id IN (SELECT id FROM public.tenant_info WHERE landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can insert leases" ON public.leases FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE u.id = unit_id AND p.landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can update leases" ON public.leases FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE u.id = unit_id AND p.landlord_id = public.current_user_profile_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE u.id = unit_id AND p.landlord_id = public.current_user_profile_id()));

-- STEP 5: Fix units
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'units'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.units', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Landlords can view their units" ON public.units FOR SELECT
USING (property_id IN (SELECT id FROM public.properties WHERE landlord_id = public.current_user_profile_id()));

CREATE POLICY "Tenants can view leased units" ON public.units FOR SELECT
USING (id IN (SELECT unit_id FROM public.leases WHERE tenant_info_id IN (SELECT id FROM public.tenant_info WHERE profile_id = public.current_user_profile_id())));

-- STEP 6: Fix rent_payments
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rent_payments'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.rent_payments', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Tenants can view own rent payments" ON public.rent_payments FOR SELECT
USING (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.profile_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can view tenant rent payments" ON public.rent_payments FOR SELECT
USING (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can insert rent payments" ON public.rent_payments FOR INSERT
WITH CHECK (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can update rent payments" ON public.rent_payments FOR UPDATE
USING (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()))
WITH CHECK (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()));

-- STEP 7: Fix properties
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'properties'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Landlords can view their properties" ON public.properties FOR SELECT
USING (landlord_id = public.current_user_profile_id());

CREATE POLICY "Landlords can manage properties" ON public.properties FOR ALL
USING (landlord_id = public.current_user_profile_id())
WITH CHECK (landlord_id = public.current_user_profile_id());

-- STEP 8: Fix maintenance_requests
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_requests'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.maintenance_requests', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Landlords can view maintenance requests" ON public.maintenance_requests FOR SELECT
USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT id FROM public.properties WHERE landlord_id = public.current_user_profile_id())));

CREATE POLICY "Tenants can view maintenance requests" ON public.maintenance_requests FOR SELECT
USING (unit_id IN (SELECT unit_id FROM public.leases WHERE tenant_info_id IN (SELECT id FROM public.tenant_info WHERE profile_id = public.current_user_profile_id())));

-- STEP 9: Add security access
CREATE POLICY "Security can view units for assigned properties" ON public.units FOR SELECT
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true AND sa.property_id = units.property_id));

CREATE POLICY "Security can view tenant info" ON public.tenant_info FOR SELECT
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa JOIN public.units u ON u.property_id = sa.property_id JOIN public.leases l ON l.unit_id = u.id WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true AND l.tenant_info_id = tenant_info.id));

CREATE POLICY "Security can view leases" ON public.leases FOR SELECT
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true AND sa.property_id IN (SELECT u.property_id FROM public.units u WHERE u.id = leases.unit_id)));

-- STEP 10: Fix staff_assignments
DO $$ DECLARE pol RECORD; BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_assignments'
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_assignments', pol.policyname); END LOOP;
END $$;

CREATE POLICY "Landlords can view staff assignments" ON public.staff_assignments FOR SELECT
USING (property_id IN (SELECT id FROM public.properties WHERE landlord_id = public.current_user_profile_id()));

CREATE POLICY "Staff can view own assignments" ON public.staff_assignments FOR SELECT
USING (staff_id = public.current_user_profile_id());

INSERT INTO cron_log (message, created_at) VALUES ('✅ SIMPLE RESTORE completed', NOW());

