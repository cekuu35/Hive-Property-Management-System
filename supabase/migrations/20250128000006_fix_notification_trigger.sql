-- ============================================================================
-- COMPREHENSIVE FIXES: Notification Triggers & RLS Policies
-- ============================================================================

-- ============================================================================
-- 1. Fix notify_payment_success - payment_date → paid_date + fallback lookups
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_payment_success()
RETURNS TRIGGER AS $$
DECLARE
  tenant_auth_user_id UUID;
BEGIN
  -- Only trigger when status changes to 'paid' from another status
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Try to get tenant's auth.user_id via leases -> profiles
    SELECT p.user_id INTO tenant_auth_user_id
    FROM leases l
    JOIN profiles p ON p.id = l.tenant_id
    WHERE l.id = NEW.lease_id
    LIMIT 1;

    -- Fallback: try leases.tenant_info_id -> tenant_info.auth_user_id
    IF tenant_auth_user_id IS NULL THEN
      SELECT ti.auth_user_id INTO tenant_auth_user_id
      FROM leases l
      JOIN tenant_info ti ON ti.id = l.tenant_info_id
      WHERE l.id = NEW.lease_id
      LIMIT 1;
    END IF;

    IF tenant_auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, data)
      VALUES (
        tenant_auth_user_id,
        'Payment Received ✅',
        'Your rent payment of KES ' || NEW.amount || ' has been received successfully!',
        'payment_success',
        '/dashboard?tab=payments',
        jsonb_build_object(
          'payment_id', NEW.id,
          'amount', NEW.amount,
          'paid_date', NEW.paid_date
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_payment_success ON rent_payments;

CREATE TRIGGER trigger_notify_payment_success
  AFTER UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_success();

COMMENT ON FUNCTION notify_payment_success() IS 'Sends notification to tenant when payment is successfully received - with fallback lookups';

-- ============================================================================
-- 2. Fix notify_visitor_checkin - fix variable assignment issue
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_visitor_checkin()
RETURNS TRIGGER AS $$
DECLARE
  tenant_auth_user_id UUID;
  visitor_name_val TEXT;
BEGIN
  -- Only trigger when visitor becomes active (time_in is set) AND it wasn't active before
  IF NEW.status = 'active' AND NEW.time_in IS NOT NULL AND 
     (OLD IS NULL OR OLD.time_in IS NULL OR OLD.time_in != NEW.time_in) THEN
    -- Get tenant's auth user_id
    SELECT p.user_id
    INTO tenant_auth_user_id
    FROM profiles p
    WHERE p.id = NEW.visiting_tenant_id;

    visitor_name_val := NEW.visitor_name;

    IF tenant_auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, data)
      VALUES (
        tenant_auth_user_id,
        '👋 Visitor Checked In',
        'Your visitor ' || visitor_name_val || ' has checked in.',
        'visitor',
        '/dashboard?tab=visitors',
        jsonb_build_object(
          'visitor_id', NEW.id,
          'visitor_name', visitor_name_val,
          'time_in', NEW.time_in
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace trigger
DROP TRIGGER IF EXISTS trigger_notify_visitor_checkin ON visitors;

CREATE TRIGGER trigger_notify_visitor_checkin
  AFTER INSERT OR UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION notify_visitor_checkin();

COMMENT ON FUNCTION notify_visitor_checkin() IS 'Sends notification to tenant when their visitor checks in';

-- ============================================================================
-- 3. Revise tenant_info RLS policies for caretakers/security
-- ============================================================================
-- Drop existing policies if present
DROP POLICY IF EXISTS "Caretakers can view tenant info for assigned properties" ON public.tenant_info;
DROP POLICY IF EXISTS "Security can view tenant info for assigned properties" ON public.tenant_info;

CREATE POLICY "Caretakers can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'caretaker'
      AND sa.is_active = true
      AND tenant_info.profile_id = l.tenant_id
  )
);

CREATE POLICY "Security can view tenant info for assigned properties"
ON public.tenant_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles p ON sa.staff_id = p.id
    JOIN public.properties pr ON sa.property_id = pr.id
    JOIN public.units u ON u.property_id = pr.id
    JOIN public.leases l ON l.unit_id = u.id
    WHERE p.user_id = auth.uid()
      AND sa.role = 'security'
      AND sa.is_active = true
      AND tenant_info.profile_id = l.tenant_id
  )
);

COMMENT ON POLICY "Caretakers can view tenant info for assigned properties" ON public.tenant_info IS 
'Allows caretakers to view tenant info for properties they are assigned to via staff_assignments and leases';

COMMENT ON POLICY "Security can view tenant info for assigned properties" ON public.tenant_info IS 
'Allows security to view tenant info for properties they are assigned to via staff_assignments and leases';

-- ============================================================================
-- 4. Add index on notifications.user_id if missing
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

COMMENT ON INDEX idx_notifications_user_id IS 'Index on notifications.user_id for faster lookups';


