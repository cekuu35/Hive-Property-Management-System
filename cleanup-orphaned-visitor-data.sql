-- =====================================================
-- Cleanup Orphaned Visitor Data Before Adding FK Constraints
-- =====================================================
-- Run this BEFORE applying 20250122000006_add_visitor_foreign_keys.sql
-- =====================================================

-- Step 1: Find all orphaned visitor_requests (tenant_id not in profiles)
SELECT 
    vr.id,
    vr.tenant_id,
    vr.visitor_name,
    vr.created_at,
    vr.status,
    'ORPHAN: tenant not in profiles' as issue
FROM public.visitor_requests vr
WHERE vr.tenant_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = vr.tenant_id
)
ORDER BY vr.created_at DESC;

-- Step 2: Find all orphaned visitors (visiting_tenant_id not in profiles)
SELECT 
    v.id,
    v.visiting_tenant_id,
    v.visitor_name,
    v.created_at,
    v.status,
    'ORPHAN: visiting_tenant not in profiles' as issue
FROM public.visitors v
WHERE v.visiting_tenant_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v.visiting_tenant_id
)
ORDER BY v.created_at DESC;

-- Step 3: Find orphaned visitors (security_id not in profiles)
SELECT 
    v.id,
    v.security_id,
    v.visitor_name,
    v.created_at,
    v.status,
    'ORPHAN: security not in profiles' as issue
FROM public.visitors v
WHERE v.security_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v.security_id
)
ORDER BY v.created_at DESC;

-- Step 4: Find orphaned visitors (visiting_unit_id not in units)
SELECT 
    v.id,
    v.visiting_unit_id,
    v.visitor_name,
    v.created_at,
    v.status,
    'ORPHAN: visiting_unit not in units' as issue
FROM public.visitors v
WHERE v.visiting_unit_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.units u WHERE u.id = v.visiting_unit_id
)
ORDER BY v.created_at DESC;

-- =====================================================
-- CLEANUP ACTIONS (uncomment to execute)
-- =====================================================

-- Option A: DELETE orphaned visitor_requests
-- (Recommended - these are invalid data)
/*
DELETE FROM public.visitor_requests
WHERE tenant_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = tenant_id
);
*/

-- Option B: DELETE orphaned visitors
-- (Recommended - these are invalid data)
/*
DELETE FROM public.visitors
WHERE (
    (visiting_tenant_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = visiting_tenant_id
    ))
    OR
    (security_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = security_id
    ))
    OR
    (visiting_unit_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.units u WHERE u.id = visiting_unit_id
    ))
);
*/

-- Option C: Set orphaned fields to NULL (less aggressive)
/*
UPDATE public.visitor_requests
SET tenant_id = NULL
WHERE tenant_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = tenant_id
);

UPDATE public.visitors
SET visiting_tenant_id = NULL
WHERE visiting_tenant_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = visiting_tenant_id
);

UPDATE public.visitors
SET security_id = NULL
WHERE security_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = security_id
);

UPDATE public.visitors
SET visiting_unit_id = NULL
WHERE visiting_unit_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.units u WHERE u.id = visiting_unit_id
);
*/

-- =====================================================
-- After cleanup, verify no orphans remain:
-- =====================================================
/*
SELECT COUNT(*) as orphaned_visitor_requests
FROM public.visitor_requests
WHERE tenant_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = tenant_id);

SELECT COUNT(*) as orphaned_visitors
FROM public.visitors
WHERE (
    (visiting_tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = visiting_tenant_id))
    OR (security_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = security_id))
    OR (visiting_unit_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.units WHERE id = visiting_unit_id))
);
*/




