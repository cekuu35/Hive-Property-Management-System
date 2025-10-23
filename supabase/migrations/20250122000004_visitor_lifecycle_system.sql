-- =====================================================
-- Visitor Lifecycle System
-- =====================================================
-- Implements visitor lifecycle: active → checked_out → auto-delete after 7 days
-- Creates visitors_history view and automatic cleanup job
-- =====================================================

-- First, ensure visitors table has correct status values
-- Update the status check constraint if it exists
DO $$ 
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE public.visitors DROP CONSTRAINT IF EXISTS visitors_status_check;
    
    -- Add new constraint
    ALTER TABLE public.visitors ADD CONSTRAINT visitors_status_check 
        CHECK (status IN ('active', 'checked_out'));
EXCEPTION
    WHEN OTHERS THEN
        -- If constraint already correct, ignore
        NULL;
END $$;

-- Create index on status and time_out for performance
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_time_out ON public.visitors(time_out);
CREATE INDEX IF NOT EXISTS idx_visitors_checked_out_date ON public.visitors(time_out) WHERE status = 'checked_out';

-- Create a view for visitors history (checked out visitors)
CREATE OR REPLACE VIEW public.visitors_history AS
SELECT 
    v.*,
    EXTRACT(EPOCH FROM (v.time_out - v.time_in)) / 60 AS visit_duration_minutes,
    CURRENT_TIMESTAMP - v.time_out AS time_since_checkout
FROM public.visitors v
WHERE v.status = 'checked_out'
AND v.time_out IS NOT NULL
ORDER BY v.time_out DESC;

-- Grant access to the view
GRANT SELECT ON public.visitors_history TO authenticated;

-- Create function to get visitor history stats
CREATE OR REPLACE FUNCTION public.get_visitor_history_stats(
    p_property_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_visitors BIGINT,
    avg_visit_duration_minutes NUMERIC,
    total_visit_time_hours NUMERIC,
    unique_tenants BIGINT,
    most_frequent_purpose TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_visitors,
        ROUND(AVG(EXTRACT(EPOCH FROM (time_out - time_in)) / 60), 1) as avg_visit_duration_minutes,
        ROUND(SUM(EXTRACT(EPOCH FROM (time_out - time_in)) / 3600), 1) as total_visit_time_hours,
        COUNT(DISTINCT tenant_id)::BIGINT as unique_tenants,
        MODE() WITHIN GROUP (ORDER BY purpose) as most_frequent_purpose
    FROM public.visitors
    WHERE status = 'checked_out'
    AND time_out >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_property_id IS NULL OR property_id = p_property_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_visitor_history_stats(UUID, INTEGER) TO authenticated;

-- Create function to automatically delete old visitor history (7+ days old)
CREATE OR REPLACE FUNCTION public.cleanup_old_visitor_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete checked out visitors older than 7 days
    WITH deleted AS (
        DELETE FROM public.visitors
        WHERE status = 'checked_out'
        AND time_out IS NOT NULL
        AND time_out < NOW() - INTERVAL '7 days'
        RETURNING *
    )
    SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
    
    -- Log the cleanup (optional: you can create a cleanup_logs table)
    RAISE NOTICE 'Cleaned up % old visitor records', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to postgres and service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_visitor_history() TO postgres;

-- Create a cron job to run cleanup daily at 2 AM
-- Note: Requires pg_cron extension (enabled in most Supabase projects)
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if it exists
        PERFORM cron.unschedule('cleanup-old-visitor-history');
        
        -- Schedule new job
        PERFORM cron.schedule(
            'cleanup-old-visitor-history',
            '0 2 * * *', -- Every day at 2 AM
            $$SELECT public.cleanup_old_visitor_history();$$
        );
        
        RAISE NOTICE 'Visitor history cleanup cron job scheduled successfully';
    ELSE
        RAISE WARNING 'pg_cron extension not available. Please enable it or run cleanup manually.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not schedule cron job: %', SQLERRM;
END $$;

-- Create trigger to validate checkout time
CREATE OR REPLACE FUNCTION public.validate_visitor_checkout()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'checked_out', ensure time_out is set
    IF NEW.status = 'checked_out' THEN
        IF NEW.time_out IS NULL THEN
            NEW.time_out = NOW();
        END IF;
        
        -- Ensure time_out is not before time_in
        IF NEW.time_out < NEW.time_in THEN
            RAISE EXCEPTION 'Check-out time cannot be before check-in time';
        END IF;
    END IF;
    
    -- When status is 'active', ensure time_out is NULL
    IF NEW.status = 'active' THEN
        NEW.time_out = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visitor_checkout_validation
    BEFORE INSERT OR UPDATE ON public.visitors
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_visitor_checkout();

-- Create function to check out a visitor
CREATE OR REPLACE FUNCTION public.checkout_visitor(p_visitor_id UUID)
RETURNS JSONB AS $$
DECLARE
    visitor_record RECORD;
    result JSONB;
BEGIN
    -- Update visitor status to checked_out
    UPDATE public.visitors
    SET 
        status = 'checked_out',
        time_out = NOW(),
        updated_at = NOW()
    WHERE id = p_visitor_id
    AND status = 'active'
    RETURNING * INTO visitor_record;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Visitor not found or already checked out'
        );
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'visitor_id', visitor_record.id,
        'visitor_name', visitor_record.visitor_name,
        'time_in', visitor_record.time_in,
        'time_out', visitor_record.time_out,
        'visit_duration_minutes', EXTRACT(EPOCH FROM (visitor_record.time_out - visitor_record.time_in)) / 60
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.checkout_visitor(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON VIEW public.visitors_history IS 'View of checked out visitors with calculated visit duration';
COMMENT ON FUNCTION public.cleanup_old_visitor_history() IS 'Automatically deletes visitor records older than 7 days (checked out status)';
COMMENT ON FUNCTION public.checkout_visitor(UUID) IS 'Safely checks out an active visitor and returns visit summary';
COMMENT ON FUNCTION public.get_visitor_history_stats(UUID, INTEGER) IS 'Returns visitor history statistics for a property or all properties';

-- Create a manual cleanup function that can be called anytime
CREATE OR REPLACE FUNCTION public.manual_cleanup_visitor_history(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    deleted_count INTEGER,
    cleanup_date TIMESTAMP,
    message TEXT
) AS $$
DECLARE
    count INTEGER;
BEGIN
    count := public.cleanup_old_visitor_history();
    
    RETURN QUERY SELECT 
        count,
        NOW(),
        format('Successfully deleted %s visitor records older than %s days', count, p_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.manual_cleanup_visitor_history(INTEGER) TO authenticated;




