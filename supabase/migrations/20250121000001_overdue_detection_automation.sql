-- ============================================================================
-- OVERDUE PAYMENT DETECTION AUTOMATION
-- ============================================================================
-- This migration adds a cron job to automatically detect and mark overdue payments
-- Runs daily at 02:00 AM
-- ============================================================================

-- Function to detect and mark overdue rent payments
CREATE OR REPLACE FUNCTION detect_overdue_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_record RECORD;
  updated_count INTEGER := 0;
  current_date DATE;
BEGIN
  current_date := CURRENT_DATE;
  
  INSERT INTO cron_log (message, created_at) 
  VALUES ('🔍 [Overdue Detection] Starting overdue payment check for ' || current_date, NOW());

  -- Find all pending payments that are past their due date
  FOR payment_record IN
    SELECT 
      rp.id,
      rp.lease_id,
      rp.due_date,
      rp.amount,
      l.tenant_id,
      l.tenant_info_id,
      DATE_PART('day', current_date - rp.due_date)::INTEGER AS days_overdue
    FROM rent_payments rp
    INNER JOIN leases l ON l.id = rp.lease_id
    WHERE rp.status = 'pending'
    AND rp.due_date < current_date
    AND l.status = 'active'
  LOOP
    -- Update payment status to overdue
    UPDATE rent_payments
    SET 
      status = 'overdue',
      updated_at = NOW()
    WHERE id = payment_record.id;

    -- Calculate late fee (2% per day, max 10%)
    DECLARE
      late_fee_amount DECIMAL(10,2);
      late_fee_percentage DECIMAL(5,2);
    BEGIN
      -- 2% per day, capped at 10%
      late_fee_percentage := LEAST(payment_record.days_overdue * 2, 10);
      late_fee_amount := ROUND((payment_record.amount * late_fee_percentage / 100), 2);

      -- Update late fee
      UPDATE rent_payments
      SET late_fee = late_fee_amount
      WHERE id = payment_record.id;

      -- Update tenant balance to include late fee
      UPDATE tenant_info
      SET 
        current_balance = current_balance + late_fee_amount,
        payment_status = 'overdue',
        updated_at = NOW()
      WHERE id = COALESCE(payment_record.tenant_info_id, payment_record.tenant_id);

      updated_count := updated_count + 1;

      INSERT INTO cron_log (message, created_at) 
      VALUES (
        '⚠️ [Overdue] Payment ' || payment_record.id || ' marked overdue - ' || 
        payment_record.days_overdue || ' days late - Late fee: KES ' || late_fee_amount,
        NOW()
      );

      -- Send notification to tenant
      INSERT INTO notifications (user_id, title, message, type, read, data, created_at)
      VALUES (
        payment_record.tenant_id,
        'Rent Payment Overdue',
        'Your rent payment of KES ' || payment_record.amount || ' is now ' || payment_record.days_overdue || 
        ' days overdue. A late fee of KES ' || late_fee_amount || ' has been applied.',
        'payment_overdue',
        false,
        jsonb_build_object(
          'lease_id', payment_record.lease_id,
          'payment_id', payment_record.id,
          'amount', payment_record.amount,
          'late_fee', late_fee_amount,
          'days_overdue', payment_record.days_overdue
        ),
        NOW()
      );

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO cron_log (message, created_at) 
      VALUES ('❌ [Overdue] Error processing payment ' || payment_record.id || ': ' || SQLERRM, NOW());
    END;
  END LOOP;

  INSERT INTO cron_log (message, created_at) 
  VALUES ('✅ [Overdue Detection] Completed. Updated ' || updated_count || ' payments', NOW());

EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_log (message, created_at) 
  VALUES ('❌ [Overdue Detection] Fatal error: ' || SQLERRM, NOW());
END;
$$;

-- Schedule the overdue detection to run daily at 02:00 AM
SELECT cron.schedule(
  'daily-overdue-detection',
  '0 2 * * *',
  'SELECT detect_overdue_payments();'
);

-- Add comment
COMMENT ON FUNCTION detect_overdue_payments() IS 
'Automatically detects overdue payments and applies late fees (2% per day, max 10%). Runs daily at 02:00 AM.';

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] Overdue detection automation installed successfully', NOW());


