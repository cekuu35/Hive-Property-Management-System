-- =====================================================
-- Clean Up Orphaned Visitor Data
-- =====================================================
-- Run this BEFORE applying foreign key constraints
-- =====================================================

-- Step 0: Drop conflicting foreign key constraint (tenant_id -> tenant_info)
-- We want tenant_id -> profiles instead
ALTER TABLE public.visitor_requests 
DROP CONSTRAINT IF EXISTS visitor_requests_tenant_info_id_fkey;

-- Also drop the old tenant_id -> profiles if it exists (to recreate it clean)
ALTER TABLE public.visitor_requests 
DROP CONSTRAINT IF EXISTS visitor_requests_tenant_id_fkey;

-- Step 1: Delete orphaned visitor_requests (tenant_id not in profiles)
DELETE FROM public.visitor_requests
WHERE tenant_id IS NOT NULL
AND tenant_id NOT IN (SELECT id FROM public.profiles);

-- Step 2: Delete orphaned visitor_requests (approved_by not in profiles)
DELETE FROM public.visitor_requests
WHERE approved_by IS NOT NULL
AND approved_by NOT IN (SELECT id FROM public.profiles);

-- Step 3: Delete orphaned visitors (visiting_tenant_id not in profiles)
DELETE FROM public.visitors
WHERE visiting_tenant_id IS NOT NULL
AND visiting_tenant_id NOT IN (SELECT id FROM public.profiles);

-- Step 4: Delete orphaned visitors (security_id not in profiles)
DELETE FROM public.visitors
WHERE security_id IS NOT NULL
AND security_id NOT IN (SELECT id FROM public.profiles);

-- Step 5: Delete orphaned visitors (visiting_unit_id not in units)
DELETE FROM public.visitors
WHERE visiting_unit_id IS NOT NULL
AND visiting_unit_id NOT IN (SELECT id FROM public.units);

-- Step 6: Delete orphaned visitors (visitor_request_id not in visitor_requests)
DELETE FROM public.visitors
WHERE visitor_request_id IS NOT NULL
AND visitor_request_id NOT IN (SELECT id FROM public.visitor_requests);

-- Step 7: Delete orphaned visitor_requests (unit_id not in units, if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'visitor_requests'
        AND column_name = 'unit_id'
    ) THEN
        DELETE FROM public.visitor_requests
        WHERE unit_id IS NOT NULL
        AND unit_id NOT IN (SELECT id FROM public.units);
    END IF;
END $$;

-- Show summary of what was deleted
SELECT 
    'Cleanup complete' AS status,
    (SELECT COUNT(*) FROM public.visitor_requests) AS remaining_visitor_requests,
    (SELECT COUNT(*) FROM public.visitors) AS remaining_visitors;

