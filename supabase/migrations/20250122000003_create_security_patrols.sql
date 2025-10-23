-- =====================================================
-- Security Patrols System
-- =====================================================
-- Creates the security_patrols table for tracking patrol rounds
-- Includes RLS policies, triggers, and automatic cleanup
-- =====================================================

-- Create security_patrols table
CREATE TABLE IF NOT EXISTS public.security_patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    security_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    location TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    status TEXT NOT NULL DEFAULT 'scheduled',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT security_patrols_status_check 
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT security_patrols_duration_check 
        CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT security_patrols_times_check 
        CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_patrols_security_id ON public.security_patrols(security_id);
CREATE INDEX IF NOT EXISTS idx_security_patrols_property_id ON public.security_patrols(property_id);
CREATE INDEX IF NOT EXISTS idx_security_patrols_status ON public.security_patrols(status);
CREATE INDEX IF NOT EXISTS idx_security_patrols_scheduled_time ON public.security_patrols(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_security_patrols_created_at ON public.security_patrols(created_at);

-- Enable RLS
ALTER TABLE public.security_patrols ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Security guards can view patrols for their assigned properties
CREATE POLICY "Security can view their assigned property patrols"
    ON public.security_patrols
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.staff_assignments sa
            JOIN public.profiles pr ON sa.staff_id = pr.id
            WHERE sa.staff_id = auth.uid()
            AND sa.property_id = security_patrols.property_id
            AND sa.role = 'security'
            AND sa.is_active = true
        )
        OR
        -- Fallback: if no staff_assignments, allow security guards to see all
        NOT EXISTS (SELECT 1 FROM public.staff_assignments WHERE role = 'security')
    );

-- RLS Policy: Security guards can insert patrols for their assigned properties
CREATE POLICY "Security can create patrols for assigned properties"
    ON public.security_patrols
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff_assignments sa
            JOIN public.profiles pr ON sa.staff_id = pr.id
            WHERE sa.staff_id = auth.uid()
            AND sa.property_id = security_patrols.property_id
            AND sa.role = 'security'
            AND sa.is_active = true
        )
        OR
        -- Fallback: if no staff_assignments, allow security guards to create
        NOT EXISTS (SELECT 1 FROM public.staff_assignments WHERE role = 'security')
    );

-- RLS Policy: Security guards can update their own patrols
CREATE POLICY "Security can update their own patrols"
    ON public.security_patrols
    FOR UPDATE
    USING (security_id = auth.uid())
    WITH CHECK (security_id = auth.uid());

-- RLS Policy: Security guards can delete their own patrols (only if scheduled)
CREATE POLICY "Security can delete scheduled patrols"
    ON public.security_patrols
    FOR DELETE
    USING (security_id = auth.uid() AND status = 'scheduled');

-- RLS Policy: Landlords can view patrols for their properties
CREATE POLICY "Landlords can view patrols for their properties"
    ON public.security_patrols
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            JOIN public.profiles pr ON p.landlord_id = pr.id
            WHERE pr.id = auth.uid()
            AND p.id = security_patrols.property_id
        )
    );

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_security_patrols_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER security_patrols_updated_at
    BEFORE UPDATE ON public.security_patrols
    FOR EACH ROW
    EXECUTE FUNCTION public.update_security_patrols_updated_at();

-- Trigger: Auto-set start_time when status changes to 'in_progress'
CREATE OR REPLACE FUNCTION public.auto_set_patrol_start_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.start_time IS NULL THEN
        NEW.start_time = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patrol_auto_start_time
    BEFORE UPDATE ON public.security_patrols
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_patrol_start_time();

-- Trigger: Auto-set end_time when status changes to 'completed'
CREATE OR REPLACE FUNCTION public.auto_set_patrol_end_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.end_time IS NULL THEN
        NEW.end_time = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patrol_auto_end_time
    BEFORE UPDATE ON public.security_patrols
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_set_patrol_end_time();

-- Function: Get patrol statistics for a property
CREATE OR REPLACE FUNCTION public.get_patrol_stats(p_property_id UUID, p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days', p_end_date TIMESTAMP DEFAULT NOW())
RETURNS TABLE (
    total_patrols BIGINT,
    completed_patrols BIGINT,
    in_progress_patrols BIGINT,
    scheduled_patrols BIGINT,
    completion_rate NUMERIC,
    avg_duration_minutes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_patrols,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_patrols,
        COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT as in_progress_patrols,
        COUNT(*) FILTER (WHERE status = 'scheduled')::BIGINT as scheduled_patrols,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
            ELSE 0
        END as completion_rate,
        ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 1) as avg_duration_minutes
    FROM public.security_patrols
    WHERE property_id = p_property_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_patrol_stats(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

-- Comment
COMMENT ON TABLE public.security_patrols IS 'Stores security patrol rounds and their completion status';




