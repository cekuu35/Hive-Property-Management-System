-- =====================================================
-- Security Logs RLS Policies Fix
-- =====================================================
-- Adds proper RLS policies for security guards to create and manage incidents
-- =====================================================

-- Enable RLS on security_logs if not already enabled
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Security can view their incidents" ON public.security_logs;
DROP POLICY IF EXISTS "Security can create incidents" ON public.security_logs;
DROP POLICY IF EXISTS "Security can update their incidents" ON public.security_logs;
DROP POLICY IF EXISTS "Landlords can view incidents for their properties" ON public.security_logs;

-- Policy: Security guards can view incidents for their assigned properties
CREATE POLICY "Security can view their incidents"
    ON public.security_logs
    FOR SELECT
    USING (
        -- Security guards can see incidents they created
        security_id = auth.uid()
        OR
        -- Security guards can see incidents for their assigned properties
        EXISTS (
            SELECT 1 FROM public.staff_assignments sa
            WHERE sa.staff_id = auth.uid()
            AND sa.property_id = security_logs.property_id
            AND sa.role = 'security'
            AND sa.is_active = true
        )
        OR
        -- Fallback: if no staff_assignments, allow security role to see all
        (
            NOT EXISTS (SELECT 1 FROM public.staff_assignments WHERE role = 'security')
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'security'
            )
        )
    );

-- Policy: Security guards can create incidents
CREATE POLICY "Security can create incidents"
    ON public.security_logs
    FOR INSERT
    WITH CHECK (
        -- Must be a security guard
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'security'
        )
        AND
        (
            -- Incident must be for a property they're assigned to
            EXISTS (
                SELECT 1 FROM public.staff_assignments sa
                WHERE sa.staff_id = auth.uid()
                AND sa.property_id = security_logs.property_id
                AND sa.role = 'security'
                AND sa.is_active = true
            )
            OR
            -- Fallback: if no staff_assignments, allow creation
            NOT EXISTS (SELECT 1 FROM public.staff_assignments WHERE role = 'security')
        )
    );

-- Policy: Security guards can update their own incidents
CREATE POLICY "Security can update their incidents"
    ON public.security_logs
    FOR UPDATE
    USING (
        security_id = auth.uid()
        OR
        -- Can update incidents for their assigned properties
        EXISTS (
            SELECT 1 FROM public.staff_assignments sa
            WHERE sa.staff_id = auth.uid()
            AND sa.property_id = security_logs.property_id
            AND sa.role = 'security'
            AND sa.is_active = true
        )
    )
    WITH CHECK (
        security_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.staff_assignments sa
            WHERE sa.staff_id = auth.uid()
            AND sa.property_id = security_logs.property_id
            AND sa.role = 'security'
            AND sa.is_active = true
        )
    );

-- Policy: Landlords can view incidents for their properties
CREATE POLICY "Landlords can view incidents for their properties"
    ON public.security_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            JOIN public.profiles pr ON p.landlord_id = pr.id
            WHERE pr.id = auth.uid()
            AND p.id = security_logs.property_id
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_logs_property_id ON public.security_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_security_id ON public.security_logs(security_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_status ON public.security_logs(status);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.security_logs TO authenticated;

-- Comment
COMMENT ON TABLE public.security_logs IS 'Security incident logs with proper RLS policies for security guards and landlords';




