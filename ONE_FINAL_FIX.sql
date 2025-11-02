-- ============================================================================
-- ONE FINAL FIX - Drops ALL policies and recreates safe ones
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor
-- This is the ONLY SQL you need to run
-- ============================================================================

-- ============================================================================
-- STEP 1: Create/Ensure helper function exists
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

-- ============================================================================
-- STEP 2: Drop ALL policies on ALL tables using DO blocks
-- ============================================================================

DO $$ 
DECLARE 
    t TEXT;
    pol RECORD;
    tables TEXT[] := ARRAY['profiles', 'tenant_info', 'leases', 'units', 'rent_payments', 'maintenance_requests', 'visitor_requests', 'visitors', 'properties', 'staff_assignments'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Recreate ONLY safe profiles policies
-- ============================================================================

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
-- STEP 4: Recreate tenant_info policies
-- ============================================================================

CREATE POLICY "Tenants can view own info" 
ON public.tenant_info FOR SELECT 
USING (profile_id = public.current_user_profile_id());

CREATE POLICY "Landlords can select their tenant info" 
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

-- ============================================================================
-- STEP 5: Recreate leases policies
-- ============================================================================

CREATE POLICY "Tenants can view own leases" 
ON public.leases FOR SELECT 
USING (tenant_info_id IN (SELECT id FROM public.tenant_info WHERE profile_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can view tenant leases" 
ON public.leases FOR SELECT 
USING (tenant_info_id IN (SELECT id FROM public.tenant_info WHERE landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can insert leases for their units" 
ON public.leases FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE u.id = unit_id AND p.landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can update leases for their units" 
ON public.leases FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE u.id = unit_id AND p.landlord_id = public.current_user_profile_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE u.id = unit_id AND p.landlord_id = public.current_user_profile_id()));

-- ============================================================================
-- STEP 6: Recreate units policies
-- ============================================================================

CREATE POLICY "Landlords can view their units" 
ON public.units FOR SELECT 
USING (property_id IN (SELECT id FROM public.properties WHERE landlord_id = public.current_user_profile_id()));

CREATE POLICY "Tenants can view their leased units" 
ON public.units FOR SELECT 
USING (id IN (SELECT unit_id FROM public.leases WHERE tenant_info_id IN (SELECT id FROM public.tenant_info WHERE profile_id = public.current_user_profile_id())));

CREATE POLICY "Security can view units for assigned properties" 
ON public.units FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true AND sa.property_id = units.property_id));

CREATE POLICY "Caretaker can view units for assigned properties" 
ON public.units FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'caretaker' AND sa.is_active = true AND sa.property_id = units.property_id));

-- ============================================================================
-- STEP 7: Recreate rent_payments policies
-- ============================================================================

CREATE POLICY "Tenants can view own rent payments" 
ON public.rent_payments FOR SELECT 
USING (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.profile_id = public.current_user_profile_id()));

CREATE POLICY "Tenants can insert own rent payments" 
ON public.rent_payments FOR INSERT 
WITH CHECK (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.profile_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can view tenant rent payments" 
ON public.rent_payments FOR SELECT 
USING (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can insert tenant rent payments" 
ON public.rent_payments FOR INSERT 
WITH CHECK (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()));

CREATE POLICY "Landlords can update tenant rent payments" 
ON public.rent_payments FOR UPDATE 
USING (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()))
WITH CHECK (lease_id IN (SELECT l.id FROM public.leases l JOIN public.tenant_info ti ON l.tenant_info_id = ti.id WHERE ti.landlord_id = public.current_user_profile_id()));

-- ============================================================================
-- STEP 8: Recreate properties policies
-- ============================================================================

CREATE POLICY "Landlords can view their properties" 
ON public.properties FOR SELECT 
USING (landlord_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 9: Recreate staff_assignments policies
-- ============================================================================

CREATE POLICY "Landlords can view their staff assignments" 
ON public.staff_assignments FOR SELECT 
USING (property_id IN (SELECT id FROM public.properties WHERE landlord_id = public.current_user_profile_id()));

CREATE POLICY "Staff can view their own assignments" 
ON public.staff_assignments FOR SELECT 
USING (staff_id = public.current_user_profile_id());

-- ============================================================================
-- STEP 10: Add security/tenant_info access for security staff
-- ============================================================================

CREATE POLICY "Security can view tenant info for assigned properties" 
ON public.tenant_info FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa JOIN public.units u ON u.property_id = sa.property_id JOIN public.leases l ON l.unit_id = u.id WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true AND l.tenant_info_id = tenant_info.id));

CREATE POLICY "Security can view leases for assigned properties" 
ON public.leases FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true AND sa.property_id IN (SELECT u.property_id FROM public.units u WHERE u.id = leases.unit_id)));

CREATE POLICY "Security can view tenant profiles" 
ON public.profiles FOR SELECT 
USING (role = 'tenant' AND EXISTS (SELECT 1 FROM public.staff_assignments sa WHERE sa.staff_id = public.current_user_profile_id() AND sa.role = 'security' AND sa.is_active = true));

-- ============================================================================
-- DONE
-- ============================================================================

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ ONE FINAL FIX applied - all RLS policies reset', NOW());

