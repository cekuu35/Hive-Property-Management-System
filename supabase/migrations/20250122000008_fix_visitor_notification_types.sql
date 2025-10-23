-- =====================================================
-- Fix Visitor Notification Types in notify_on_visitor_events Function
-- =====================================================
-- Changes 'visitor_request_status' and 'visitor_checkin' to 'visitor_response'
-- to comply with notifications_type_check constraint
-- =====================================================

-- Drop and recreate the function with correct notification types
CREATE OR REPLACE FUNCTION public.notify_on_visitor_events()
RETURNS TRIGGER AS $$
BEGIN
    -- When a visitor request status changes to approved or rejected
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status IN ('approved', 'rejected') THEN
            -- Notify the tenant that their request was processed
            INSERT INTO public.notifications (user_id, title, message, type, data)
            VALUES (
                NEW.tenant_id,
                'Visitor Request ' || CASE WHEN NEW.status = 'approved' THEN 'Approved' ELSE 'Rejected' END,
                'Your visitor request for ' || NEW.visitor_name || ' has been ' || NEW.status || '.',
                'visitor_response',  -- Changed from 'visitor_request_status'
                jsonb_build_object(
                    'visitor_request_id', NEW.id,
                    'visitor_name', NEW.visitor_name,
                    'status', NEW.status,
                    'approved_by', NEW.approved_by,
                    'security_notes', NEW.security_notes
                )
            );
        END IF;
    END IF;

    -- When a new visitor request is created
    IF TG_OP = 'INSERT' THEN
        -- Notify security that a new visitor request needs approval
        -- (This could be enhanced to notify specific security guards)
        INSERT INTO public.notifications (user_id, title, message, type, data)
        SELECT 
            p.id,
            'New Visitor Request',
            'New visitor request from ' || tenant.first_name || ' ' || tenant.last_name || ' for ' || NEW.visitor_name,
            'visitor_request',
            jsonb_build_object(
                'visitor_request_id', NEW.id,
                'visitor_name', NEW.visitor_name,
                'tenant_id', NEW.tenant_id,
                'expected_arrival', NEW.expected_arrival
            )
        FROM public.profiles p
        CROSS JOIN (
            SELECT first_name, last_name 
            FROM public.profiles 
            WHERE id = NEW.tenant_id
        ) tenant
        WHERE p.role = 'security'
        AND p.id IN (
            -- Only notify security guards assigned to the property
            SELECT DISTINCT sa.staff_id
            FROM public.staff_assignments sa
            JOIN public.leases l ON l.unit_id = ANY(
                SELECT u.id FROM public.units u WHERE u.property_id = sa.property_id
            )
            WHERE l.tenant_id = NEW.tenant_id
            AND sa.role = 'security'
            AND sa.is_active = true
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.notify_on_visitor_events() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.notify_on_visitor_events() IS 'Creates notifications for visitor request status changes using allowed notification types';



