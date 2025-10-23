-- ================================================================================================
-- TENANT LEASE STATUS FIX
-- Run this in Supabase SQL Editor to diagnose and fix tenant lease visibility issues
-- ================================================================================================

-- Step 1: Check all tenants and their leases
SELECT 
  p.id as profile_id,
  p.email,
  p.first_name,
  p.last_name,
  ti.id as tenant_info_id,
  l.id as lease_id,
  l.status as lease_status,
  u.unit_number,
  prop.name as property_name,
  l.start_date,
  l.end_date
FROM profiles p
LEFT JOIN tenant_info ti ON ti.profile_id = p.id
LEFT JOIN leases l ON l.tenant_info_id = ti.id OR l.tenant_id = p.id
LEFT JOIN units u ON u.id = l.unit_id
LEFT JOIN properties prop ON prop.id = u.property_id
WHERE p.role = 'tenant'
ORDER BY p.email;

-- Step 2: Find leases that exist but are not 'active' or 'approved'
SELECT 
  l.id,
  l.status,
  l.tenant_info_id,
  l.tenant_id,
  u.unit_number,
  prop.name as property_name,
  p.email as tenant_email
FROM leases l
JOIN units u ON u.id = l.unit_id
JOIN properties prop ON prop.id = u.property_id
LEFT JOIN profiles p ON p.id = l.tenant_id
WHERE l.status NOT IN ('active', 'approved')
ORDER BY l.created_at DESC;

-- Step 3: Find leases missing tenant_info_id
SELECT 
  l.id,
  l.status,
  l.tenant_id,
  l.tenant_info_id,
  p.email,
  ti.id as correct_tenant_info_id
FROM leases l
LEFT JOIN profiles p ON p.id = l.tenant_id
LEFT JOIN tenant_info ti ON ti.profile_id = p.id
WHERE l.tenant_info_id IS NULL
ORDER BY l.created_at DESC;

-- ================================================================================================
-- FIXES - Uncomment and run the appropriate fix based on the diagnosis above
-- ================================================================================================

-- FIX 1: Update lease status to 'active' for a specific lease
-- Replace 'LEASE_ID_HERE' with the actual lease ID from Step 2
-- UPDATE leases SET status = 'active' WHERE id = 'LEASE_ID_HERE';

-- FIX 2: Update ALL pending/approved leases to 'active'
-- Uncomment if you want all approved leases to be active
-- UPDATE leases SET status = 'active' WHERE status = 'approved';

-- FIX 3: Link leases to tenant_info_id (if missing)
-- This will find the correct tenant_info_id and update the lease
-- UPDATE leases l
-- SET tenant_info_id = ti.id
-- FROM profiles p
-- JOIN tenant_info ti ON ti.profile_id = p.id
-- WHERE l.tenant_id = p.id
-- AND l.tenant_info_id IS NULL;

-- FIX 4: Activate the most recent lease for each tenant
-- UPDATE leases l
-- SET status = 'active'
-- FROM (
--   SELECT DISTINCT ON (tenant_info_id) 
--     id
--   FROM leases
--   WHERE tenant_info_id IS NOT NULL
--   ORDER BY tenant_info_id, created_at DESC
-- ) AS latest
-- WHERE l.id = latest.id
-- AND l.status != 'active';

-- ================================================================================================
-- VERIFICATION - Run this after applying fixes
-- ================================================================================================

-- Check if tenants now have active leases
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  COUNT(l.id) as total_leases,
  COUNT(CASE WHEN l.status IN ('active', 'approved') THEN 1 END) as active_leases
FROM profiles p
LEFT JOIN tenant_info ti ON ti.profile_id = p.id
LEFT JOIN leases l ON l.tenant_info_id = ti.id OR l.tenant_id = p.id
WHERE p.role = 'tenant'
GROUP BY p.id, p.email, p.first_name, p.last_name
ORDER BY p.email;
