-- =====================================================
-- Add Missing Notification Triggers
-- =====================================================
-- Implements notifications for:
-- 1. Payment Success
-- 2. Unit Application Status
-- 3. Incident Reports  
-- 4. Visitor Check-in/Check-out
-- NOTE: notifications.user_id references auth.users(id), not profiles(id)
-- =====================================================

-- =====================================================
-- 1. Payment Success Notification
-- =====================================================
CREATE OR REPLACE FUNCTION notify_payment_success()
RETURNS TRIGGER AS $$
DECLARE
  tenant_auth_user_id UUID;
BEGIN
  -- Only trigger when status changes to 'paid' from another status
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Get tenant's auth.user_id from lease via profiles
    SELECT p.user_id INTO tenant_auth_user_id
    FROM leases l
    JOIN profiles p ON p.id = l.tenant_id
    WHERE l.id = NEW.lease_id;

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

-- Create trigger for payment success
DROP TRIGGER IF EXISTS trigger_notify_payment_success ON rent_payments;

CREATE TRIGGER trigger_notify_payment_success
  AFTER UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_success();

COMMENT ON FUNCTION notify_payment_success() IS 'Sends notification to tenant when payment is successfully received';

-- =====================================================
-- 2. Unit Application Status Notification
-- =====================================================
CREATE OR REPLACE FUNCTION notify_application_status()
RETURNS TRIGGER AS $$
DECLARE
  applicant_auth_user_id UUID;
  unit_info RECORD;
BEGIN
  -- Only trigger when status changes to 'approved' or 'rejected'
  IF NEW.status IN ('approved', 'rejected') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'rejected')) THEN
    -- Get applicant's auth user_id
    SELECT user_id INTO applicant_auth_user_id
    FROM profiles
    WHERE id = NEW.tenant_id;

    -- Get unit and property info
    SELECT 
      u.unit_number,
      p.name as property_name
    INTO unit_info
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE u.id = NEW.unit_id;

    IF applicant_auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, data)
      VALUES (
        applicant_auth_user_id,
        'Application ' || CASE WHEN NEW.status = 'approved' THEN 'Approved ✅' ELSE 'Rejected ❌' END,
        'Your application for Unit ' || unit_info.unit_number || ' at ' || unit_info.property_name || 
        ' has been ' || NEW.status || '.',
        'lease',
        '/dashboard?tab=applications',
        jsonb_build_object(
          'application_id', NEW.id,
          'unit_id', NEW.unit_id,
          'status', NEW.status
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for application status
DROP TRIGGER IF EXISTS trigger_notify_application_status ON unit_applications;

CREATE TRIGGER trigger_notify_application_status
  AFTER UPDATE ON unit_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status();

COMMENT ON FUNCTION notify_application_status() IS 'Sends notification to applicant when application is approved or rejected';

-- =====================================================
-- 3. Incident Report Notification (to Landlord)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_incident_reported()
RETURNS TRIGGER AS $$
DECLARE
  landlord_auth_user_id UUID;
  property_info RECORD;
BEGIN
  -- Get property and landlord info
  SELECT 
    p.name as property_name,
    pr.user_id as landlord_auth_user_id
  INTO property_info
  FROM properties p
  JOIN profiles pr ON pr.id = p.landlord_id
  WHERE p.id = NEW.property_id;

  IF property_info.landlord_auth_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, data)
    VALUES (
      property_info.landlord_auth_user_id,
      '🚨 Security Incident Reported',
      'A ' || NEW.severity || ' severity incident has been reported at ' || property_info.property_name || ': ' || NEW.incident_type,
      'security',
      '/dashboard?tab=incidents',
      jsonb_build_object(
        'incident_id', NEW.id,
        'property_id', NEW.property_id,
        'severity', NEW.severity,
        'incident_type', NEW.incident_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for incident reports (security_logs table)
DROP TRIGGER IF EXISTS trigger_notify_incident_reported ON security_logs;

CREATE TRIGGER trigger_notify_incident_reported
  AFTER INSERT ON security_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_incident_reported();

COMMENT ON FUNCTION notify_incident_reported() IS 'Sends notification to landlord when security reports an incident';

-- =====================================================
-- 4. Visitor Check-in Notification
-- =====================================================
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
    SELECT p.user_id, NEW.visitor_name
    INTO tenant_auth_user_id, visitor_name_val
    FROM profiles p
    WHERE p.id = NEW.visiting_tenant_id;

    IF tenant_auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, data)
      VALUES (
        tenant_auth_user_id,
        '👋 Visitor Checked In',
        'Your visitor ' || NEW.visitor_name || ' has checked in.',
        'visitor',
        '/dashboard?tab=visitors',
        jsonb_build_object(
          'visitor_id', NEW.id,
          'visitor_name', NEW.visitor_name,
          'time_in', NEW.time_in
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for visitor check-in
DROP TRIGGER IF EXISTS trigger_notify_visitor_checkin ON visitors;

CREATE TRIGGER trigger_notify_visitor_checkin
  AFTER INSERT OR UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION notify_visitor_checkin();

COMMENT ON FUNCTION notify_visitor_checkin() IS 'Sends notification to tenant when their visitor checks in';

-- =====================================================
-- 5. Visitor Check-out Notification
-- =====================================================
CREATE OR REPLACE FUNCTION notify_visitor_checkout()
RETURNS TRIGGER AS $$
DECLARE
  tenant_auth_user_id UUID;
BEGIN
  -- Only trigger when status changes to 'checked_out'
  IF NEW.status = 'checked_out' AND (OLD.status IS NULL OR OLD.status != 'checked_out') THEN
    -- Get tenant's auth user_id
    SELECT p.user_id
    INTO tenant_auth_user_id
    FROM profiles p
    WHERE p.id = NEW.visiting_tenant_id;

    IF tenant_auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, data)
      VALUES (
        tenant_auth_user_id,
        '👋 Visitor Checked Out',
        'Your visitor ' || NEW.visitor_name || ' has checked out.',
        'visitor',
        '/dashboard?tab=visitors',
        jsonb_build_object(
          'visitor_id', NEW.id,
          'visitor_name', NEW.visitor_name,
          'time_out', NEW.time_out
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for visitor check-out
DROP TRIGGER IF EXISTS trigger_notify_visitor_checkout ON visitors;

CREATE TRIGGER trigger_notify_visitor_checkout
  AFTER UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION notify_visitor_checkout();

COMMENT ON FUNCTION notify_visitor_checkout() IS 'Sends notification to tenant when their visitor checks out';

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION notify_payment_success() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_application_status() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_incident_reported() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_visitor_checkin() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_visitor_checkout() TO authenticated;

-- =====================================================
-- Update notification type constraint to include new types
-- =====================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'payment',
    'payment_success',
    'payment_failed',
    'payment_overdue',
    'maintenance',
    'maintenance_request',
    'lease',
    'lease_expired',
    'security',
    'general',
    'message',
    'visitor_request',
    'visitor_response',
    'visitor_approved',
    'visitor_rejected',
    'visitor',
    'utility_bill',
    'info',
    'success',
    'warning',
    'error'
));

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Allowed notification types including all app features';
