-- ============================================================================
-- ADD VISITOR_REQUESTS POLICIES - Fix 403 errors for security portal
-- ============================================================================
-- This script:
-- 1. Creates helper functions (current_user_profile_id, has_staff_assignment)
-- 2. Ensures RLS is enabled on visitor_requests table
-- 3. Creates a trigger to auto-populate tenant_id and unit_id if missing
-- 4. Creates RLS policies for tenants, security, caretakers, and landlords
--
-- Note: The trigger will auto-populate tenant_id for tenant users if not
-- provided by the client, making the system more robust.
-- ============================================================================

-- STEP 1: Create helper functions (if they don't exist)
-- Helper function to get current user's profile ID
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

-- Helper function to check staff assignments (avoids recursion in RLS policies)
CREATE OR REPLACE FUNCTION public.has_staff_assignment(p_property_id uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.property_id = p_property_id
      AND sa.staff_id = public.current_user_profile_id()
      AND sa.role = p_role
      AND sa.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_assignment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_assignment(uuid, text) TO anon;

-- Ensure RLS is enabled (idempotent - won't error if already enabled)
ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create trigger function to auto-populate tenant_id and unit_id
CREATE OR REPLACE FUNCTION public.auto_populate_visitor_request_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_profile_role TEXT;
  v_unit_id UUID;
BEGIN
  -- Get current user's profile
  v_profile_id := public.current_user_profile_id();
  
  IF v_profile_id IS NULL THEN
    RETURN NEW; -- If no profile found, continue (might be service role)
  END IF;
  
  -- Get profile role
  SELECT role INTO v_profile_role
  FROM public.profiles
  WHERE id = v_profile_id;
  
  -- For tenants: auto-populate tenant_id if not set
  IF v_profile_role = 'tenant' AND NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_profile_id;
  END IF;
  
  -- Auto-populate unit_id from tenant's active lease if not set
  IF NEW.tenant_id IS NOT NULL AND NEW.unit_id IS NULL THEN
    SELECT unit_id INTO v_unit_id
    FROM public.leases
    WHERE tenant_id = NEW.tenant_id
      AND status = 'active'
    LIMIT 1;
    
    IF v_unit_id IS NOT NULL THEN
      NEW.unit_id := v_unit_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS auto_populate_visitor_request_fields ON public.visitor_requests;
CREATE TRIGGER auto_populate_visitor_request_fields
  BEFORE INSERT ON public.visitor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_visitor_request_fields();

-- STEP 4: Check what policies exist
DO $$
BEGIN
    RAISE NOTICE 'Current visitor_requests policies:';
END $$;

-- Use the helper function to avoid recursion
-- Security policies
DROP POLICY IF EXISTS "Security can view visitor requests for assigned properties" ON public.visitor_requests;

CREATE POLICY "Security can view visitor requests for assigned properties"
ON public.visitor_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = public.current_user_profile_id()
      AND role = 'security'
  )
  AND (
    -- If it has unit_id, check via units -> properties using function
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id
        AND public.has_staff_assignment(u.property_id, 'security'::text)
    ))
    OR
    -- Security can see requests they created
    security_id = public.current_user_profile_id()
  )
);

-- Security can insert visitor requests
DROP POLICY IF EXISTS "Security can insert visitor requests" ON public.visitor_requests;

CREATE POLICY "Security can insert visitor requests"
ON public.visitor_requests FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'security')
  AND (
    security_id = public.current_user_profile_id()
    AND (
      -- Check via unit_id -> units -> property (unit_id may be populated by trigger)
      unit_id IS NULL OR EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = unit_id
          AND public.has_staff_assignment(u.property_id, 'security'::text)
      )
    )
  )
);

-- Security can update visitor requests for assigned properties
DROP POLICY IF EXISTS "Security can update visitor requests for assigned properties" ON public.visitor_requests;

CREATE POLICY "Security can update visitor requests for assigned properties"
ON public.visitor_requests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'security')
  AND (
    security_id = public.current_user_profile_id()
    OR
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id
        AND public.has_staff_assignment(u.property_id, 'security'::text)
    ))
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'security')
);

-- Caretaker policies (same pattern using function)
DROP POLICY IF EXISTS "Caretaker can view visitor requests for assigned properties" ON public.visitor_requests;
DROP POLICY IF EXISTS "Caretaker can insert visitor requests" ON public.visitor_requests;
DROP POLICY IF EXISTS "Caretaker can update visitor requests for assigned properties" ON public.visitor_requests;

CREATE POLICY "Caretaker can view visitor requests for assigned properties"
ON public.visitor_requests FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'caretaker')
  AND (
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id
        AND public.has_staff_assignment(u.property_id, 'caretaker'::text)
    ))
  )
);

CREATE POLICY "Caretaker can insert visitor requests"
ON public.visitor_requests FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'caretaker')
  AND (
    -- Check via unit_id -> units -> property (unit_id may be populated by trigger)
    unit_id IS NULL OR EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id
        AND public.has_staff_assignment(u.property_id, 'caretaker'::text)
    )
  )
);

CREATE POLICY "Caretaker can update visitor requests for assigned properties"
ON public.visitor_requests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'caretaker')
  AND (
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.units u
      WHERE u.id = unit_id
        AND public.has_staff_assignment(u.property_id, 'caretaker'::text)
    ))
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'caretaker')
);

-- Tenant policies (CRITICAL - Missing INSERT policy causing 403 errors)
DROP POLICY IF EXISTS "Tenants can create their own visitor requests" ON public.visitor_requests;
DROP POLICY IF EXISTS "Tenants can view their own visitor requests" ON public.visitor_requests;
DROP POLICY IF EXISTS "Tenants can update their pending visitor requests" ON public.visitor_requests;

CREATE POLICY "Tenants can create their own visitor requests"
ON public.visitor_requests FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'tenant')
  AND (
    -- Allow if tenant_id matches (may be set by client or trigger)
    tenant_id = public.current_user_profile_id()
    OR tenant_id IS NULL  -- Trigger will populate this
  )
);

CREATE POLICY "Tenants can view their own visitor requests"
ON public.visitor_requests FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'tenant')
  AND tenant_id = public.current_user_profile_id()
);

CREATE POLICY "Tenants can update their pending visitor requests"
ON public.visitor_requests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'tenant')
  AND tenant_id = public.current_user_profile_id()
  AND status = 'pending'
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.current_user_profile_id() AND role = 'tenant')
  AND tenant_id = public.current_user_profile_id()
);

-- Landlord policies
DROP POLICY IF EXISTS "Landlords can view visitor requests for their properties" ON public.visitor_requests;

CREATE POLICY "Landlords can view visitor requests for their properties"
ON public.visitor_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.properties p ON u.property_id = p.id
    WHERE u.id = unit_id
      AND p.landlord_id = public.current_user_profile_id()
  )
);
