# Supabase AI Assistant Prompt: Fix Caretaker Portal RLS Policies

## Problem Description
The caretakers portal is failing to load work orders (maintenance requests) and all relevant data. Caretakers cannot view maintenance requests, properties, units, or tenant information despite having `staff_assignments` records.

## Root Cause Analysis
The issue is missing or incorrect Row Level Security (RLS) policies that prevent caretakers from:
1. Reading `maintenance_requests` for properties they're assigned to
2. Reading `properties` they're assigned to via `staff_assignments`
3. Reading `units` in their assigned properties
4. Reading `tenant_info` for tenants in their assigned properties
5. Reading `profiles` for tenants with maintenance requests in their assigned properties
6. Reading `leases` to find tenant information

## Current State
- Caretakers can read their own `staff_assignments` (policy exists)
- Missing: RLS policies for `maintenance_requests` SELECT for caretakers
- Missing: Proper RLS policies for `properties`, `units`, `profiles`, `tenant_info` that use `staff_assignments` relationship
- The frontend code filters by `staff_assignments` → `properties` → `units` → `maintenance_requests`, but RLS blocks these queries

## Required Fixes

### 1. Fix Maintenance Requests RLS for Caretakers
Create a SELECT policy on `maintenance_requests` that allows caretakers to view requests for units in properties they're assigned to via `staff_assignments`.

### 2. Ensure Properties, Units, and Related Data Access
Ensure caretakers can read:
- Properties they're assigned to
- Units in those properties
- Tenant information for tenants in those units
- Profiles related to maintenance requests

### 3. Use SECURITY DEFINER Functions
To avoid RLS recursion, use `SECURITY DEFINER` helper functions that:
- Check `staff_assignments` for caretaker assignments
- Return boolean values for policy checks
- Set `search_path = public` for safety

## SQL Script to Apply

```sql
-- ============================================================================
-- Fix Caretaker Portal RLS Policies
-- ============================================================================
-- This script fixes RLS policies so caretakers can view work orders and 
-- related data for properties they're assigned to via staff_assignments.
-- ============================================================================

-- Step 1: Create helper function to check if caretaker is assigned to a property
CREATE OR REPLACE FUNCTION public.caretaker_is_assigned_to_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND sa.property_id = p_property_id
      AND sa.role = 'caretaker'
      AND sa.is_active = true
  );
$$;

-- Step 2: Create helper function to check if caretaker can view a unit
CREATE OR REPLACE FUNCTION public.caretaker_can_view_unit(p_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND u.id = p_unit_id
      AND sa.role = 'caretaker'
      AND sa.is_active = true
  );
$$;

-- Step 3: Create helper function to check if caretaker can view maintenance request
CREATE OR REPLACE FUNCTION public.caretaker_can_view_maintenance_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    JOIN public.units u ON mr.unit_id = u.id
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND mr.id = p_request_id
      AND sa.role = 'caretaker'
      AND sa.is_active = true
  );
$$;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.caretaker_is_assigned_to_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caretaker_can_view_unit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caretaker_can_view_maintenance_request(uuid) TO authenticated;

-- Step 4: Add SELECT policy for maintenance_requests for caretakers
DROP POLICY IF EXISTS "Caretakers can view maintenance requests for assigned properties" ON public.maintenance_requests;

CREATE POLICY "Caretakers can view maintenance requests for assigned properties"
ON public.maintenance_requests
FOR SELECT
USING (
  public.caretaker_can_view_maintenance_request(id)
);

-- Step 5: Add UPDATE policy for maintenance_requests for caretakers
DROP POLICY IF EXISTS "Caretakers can update maintenance requests for assigned properties" ON public.maintenance_requests;

CREATE POLICY "Caretakers can update maintenance requests for assigned properties"
ON public.maintenance_requests
FOR UPDATE
USING (
  public.caretaker_can_view_maintenance_request(id)
)
WITH CHECK (
  public.caretaker_can_view_maintenance_request(id)
);

-- Step 6: Ensure caretakers can view properties they're assigned to
DROP POLICY IF EXISTS "Caretakers can view assigned properties" ON public.properties;

CREATE POLICY "Caretakers can view assigned properties"
ON public.properties
FOR SELECT
USING (
  public.caretaker_is_assigned_to_property(id)
);

-- Step 7: Ensure caretakers can view units in assigned properties
DROP POLICY IF EXISTS "Caretakers can view units in assigned properties" ON public.units;

CREATE POLICY "Caretakers can view units in assigned properties"
ON public.units
FOR SELECT
USING (
  public.caretaker_is_assigned_to_property(property_id)
);

-- Step 8: Update tenant_info policy for caretakers (more comprehensive)
DROP POLICY IF EXISTS "Caretakers can view tenant info for assigned properties" ON public.tenant_info;

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
    JOIN public.leases l ON l.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND (tenant_info.profile_id = l.tenant_id OR tenant_info.id = l.tenant_info_id)
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    JOIN public.units u ON mr.unit_id = u.id
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND tenant_info.profile_id = mr.tenant_id
  )
);

-- Step 9: Ensure caretakers can view profiles for tenants in assigned properties
-- (This complements existing policies)
-- The existing "Caretakers can view tenants for assigned work" policy should work,
-- but we'll ensure it's not recursive

-- Step 10: Ensure caretakers can view leases for units in assigned properties
DROP POLICY IF EXISTS "Caretakers can view leases for assigned properties" ON public.leases;

CREATE POLICY "Caretakers can view leases for assigned properties"
ON public.leases
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.staff_assignments sa ON u.property_id = sa.property_id
    JOIN public.profiles p ON sa.staff_id = p.id
    WHERE p.user_id = auth.uid()
      AND u.id = leases.unit_id
      AND sa.role = 'caretaker'
      AND sa.is_active = true
  )
);

-- Step 11: Ensure contractors table is accessible if needed
-- (Caretakers may need to view contractor info for assigned maintenance requests)
-- Check if contractors table exists and add policy if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contractors') THEN
    DROP POLICY IF EXISTS "Caretakers can view contractors for assigned work" ON public.contractors;
    
    CREATE POLICY "Caretakers can view contractors for assigned work"
    ON public.contractors
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.maintenance_requests mr
        JOIN public.units u ON mr.unit_id = u.id
        JOIN public.staff_assignments sa ON u.property_id = sa.property_id
        JOIN public.profiles p ON sa.staff_id = p.id
        WHERE p.user_id = auth.uid()
          AND mr.assigned_contractor_id = contractors.id
          AND sa.role = 'caretaker'
          AND sa.is_active = true
      )
    );
  END IF;
END $$;

-- Verification queries (run these after applying the script)
-- Check if policies were created:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('maintenance_requests', 'properties', 'units', 'tenant_info', 'leases', 'contractors')
  AND policyname LIKE '%caretaker%'
ORDER BY tablename, policyname;

-- Test query to check if caretaker can see their assignments:
-- SELECT * FROM staff_assignments WHERE role = 'caretaker' AND is_active = true;

-- Test query for a caretaker user (replace with actual caretaker profile ID):
-- SELECT mr.*, u.unit_number, p.name as property_name
-- FROM maintenance_requests mr
-- JOIN units u ON mr.unit_id = u.id
-- JOIN properties p ON u.property_id = p.id
-- ORDER BY mr.created_at DESC;
```

## Instructions for Supabase AI Assistant

1. **Run the SQL script above** to add missing RLS policies for caretakers
2. **Verify policies were created** by checking `pg_policies` for caretaker-related policies
3. **Test with a caretaker user** to ensure they can:
   - View `staff_assignments` for their profile
   - View `properties` they're assigned to
   - View `units` in those properties
   - View `maintenance_requests` for those units
   - View `tenant_info` and `profiles` for tenants in those units
   - View `leases` for those units
4. **Check for any RLS recursion issues** - if policies query tables that themselves have RLS, use `SECURITY DEFINER` functions (already included in script)
5. **Ensure no conflicts** - if policies with the same name exist, drop them first before creating new ones

## Expected Behavior After Fix
- Caretakers should see work orders (maintenance requests) for units in properties they're assigned to
- Caretakers should see property, unit, and tenant information related to those work orders
- Caretakers should be able to update maintenance request status
- All data should load without 403/500 errors

## Notes
- The script uses `SECURITY DEFINER` functions to avoid RLS recursion
- All functions set `search_path = public` for security
- Policies are designed to only allow access to data for assigned properties
- The frontend code already filters by `staff_assignments`, but RLS was blocking the queries

## IMPORTANT: Additional Fix Required

**If you see infinite recursion errors** (`'infinite recursion detected in policy for relation "tenant_info"'` or `'infinite recursion detected in policy for relation "leases"'`), you need to apply an additional fix:

Run the SQL script in `FIX_TENANT_INFO_LEASES_RECURSION.sql` which:
1. Creates SECURITY DEFINER helper functions for `tenant_info` and `leases` checks
2. Replaces the direct policy queries with function calls to break the recursion cycle
3. Fixes both caretaker and security policies

This recursion happens because:
- `tenant_info` policy queries `leases` → `leases` policy queries `tenant_info` → infinite loop
- Using SECURITY DEFINER functions breaks this cycle by bypassing RLS in the function execution

