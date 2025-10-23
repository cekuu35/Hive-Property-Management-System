-- =====================================================
-- Fix Security Logs Incident Type Check Constraint
-- =====================================================
-- Updates the CHECK constraint to accept incident types from the frontend
-- =====================================================

-- Drop the existing CHECK constraint
ALTER TABLE public.security_logs
DROP CONSTRAINT IF EXISTS security_logs_incident_type_check;

-- Create new CHECK constraint with all allowed incident types
ALTER TABLE public.security_logs
ADD CONSTRAINT security_logs_incident_type_check
CHECK (incident_type IN (
    -- Original values
    'visitor',
    'maintenance',
    'emergency',
    'suspicious',
    'noise',
    'other',
    -- Frontend values (with underscores)
    'unauthorized_access',
    'suspicious_activity',
    'vandalism',
    'noise_complaint',
    'equipment_failure'
));

-- Add comment
COMMENT ON CONSTRAINT security_logs_incident_type_check ON public.security_logs IS 'Allowed incident types including frontend values with underscores';



