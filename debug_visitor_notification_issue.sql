-- =====================================================
-- Debug Visitor Request Notification Issue
-- =====================================================
-- Run this in Supabase SQL Editor to find the problem
-- =====================================================

-- ========== PART A: List ALL triggers on visitor_requests table ==========
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS enabled,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'visitor_requests'
AND n.nspname = 'public'
ORDER BY t.tgname;

-- ========== PART B: Show notifications check constraint ==========
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'notifications_type_check';

-- ========== PART C: List ALL trigger functions that mention 'notification' ==========
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    pg_get_functiondef(p.oid) LIKE '%notification%'
    OR p.proname LIKE '%notif%'
)
ORDER BY p.proname;

-- ========== PART D: Check for any RPC functions related to visitor_requests ==========
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    pg_get_functiondef(p.oid) LIKE '%visitor_request%'
    OR p.proname LIKE '%visitor%'
)
ORDER BY p.proname;

-- ========== PART E: Sample query to check what type values currently exist ==========
SELECT DISTINCT type, COUNT(*) as count
FROM public.notifications
GROUP BY type
ORDER BY type;

-- ========== END OF DEBUG SCRIPT ==========



