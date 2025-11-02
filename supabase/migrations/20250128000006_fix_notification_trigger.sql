-- Fix notification trigger to use correct field name
-- Replace: NEW.payment_date → NEW.paid_date

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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_payment_success ON rent_payments;

CREATE TRIGGER trigger_notify_payment_success
  AFTER UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_success();

COMMENT ON FUNCTION notify_payment_success() IS 'Sends notification to tenant when payment is successfully received';

