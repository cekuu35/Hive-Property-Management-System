-- =====================================================
-- Fix Notifications Type Check Constraint
-- =====================================================
-- Adds missing notification types that might be used by triggers
-- =====================================================

-- Drop the existing check constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recreate with all possible values (including potential trigger values)
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
    'payment',
    'maintenance',
    'maintenance_request',
    'lease',
    'security',
    'general',
    'message',
    'visitor_request',
    'visitor_response',
    'visitor_approved',
    'visitor_rejected',
    'visitor',
    'utility_bill',
    'payment_success',
    'payment_failed',
    'info',
    'success',
    'warning',
    'error'
));

-- Add comment
COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 'Allowed notification types including visitor-related types';



