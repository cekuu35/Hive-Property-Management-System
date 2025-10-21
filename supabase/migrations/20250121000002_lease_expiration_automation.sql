-- ============================================================================
-- LEASE EXPIRATION AUTOMATION
-- ============================================================================
-- This migration adds a cron job to automatically detect and expire leases
-- Also updates unit status when leases expire
-- Runs daily at 03:00 AM
-- ============================================================================

-- Function to detect and expire leases
CREATE OR REPLACE FUNCTION expire_old_leases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lease_record RECORD;
  expired_count INTEGER := 0;
  current_date DATE;
BEGIN
  current_date := CURRENT_DATE;
  
  INSERT INTO cron_log (message, created_at) 
  VALUES ('🔍 [Lease Expiration] Starting lease expiration check for ' || current_date, NOW());

  -- Find all active leases that have passed their end date
  FOR lease_record IN
    SELECT 
      l.id,
      l.unit_id,
      l.tenant_id,
      l.tenant_info_id,
      l.end_date,
      u.unit_number,
      p.name AS property_name
    FROM leases l
    INNER JOIN units u ON u.id = l.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    WHERE l.status = 'active'
    AND l.end_date < current_date
  LOOP
    -- Update lease status to expired
    UPDATE leases
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE id = lease_record.id;

    -- Update unit status to vacant
    UPDATE units
    SET 
      status = 'vacant',
      tenant_id = NULL,
      updated_at = NOW()
    WHERE id = lease_record.unit_id;

    -- Update tenant profile role back to 'tenant' (if they were 'tenant')
    UPDATE profiles
    SET 
      role = 'tenant',
      updated_at = NOW()
    WHERE id = lease_record.tenant_id
    AND role NOT IN ('landlord', 'staff', 'admin');

    -- Mark any pending payments as cancelled (lease expired)
    UPDATE rent_payments
    SET 
      status = 'cancelled',
      notes = COALESCE(notes || ' | ', '') || 'Lease expired on ' || lease_record.end_date,
      updated_at = NOW()
    WHERE lease_id = lease_record.id
    AND status IN ('pending', 'overdue');

    expired_count := expired_count + 1;

    INSERT INTO cron_log (message, created_at) 
    VALUES (
      '📆 [Expired] Lease ' || lease_record.id || ' expired - Unit ' || 
      lease_record.unit_number || ' at ' || lease_record.property_name || 
      ' is now vacant',
      NOW()
    );

    -- Send notification to tenant
    INSERT INTO notifications (user_id, title, message, type, read, data, created_at)
    VALUES (
      lease_record.tenant_id,
      'Lease Expired',
      'Your lease for Unit ' || lease_record.unit_number || ' at ' || lease_record.property_name || 
      ' has expired. Please contact your landlord if you wish to renew.',
      'lease_expired',
      false,
      jsonb_build_object(
        'lease_id', lease_record.id,
        'unit_id', lease_record.unit_id,
        'end_date', lease_record.end_date
      ),
      NOW()
    );

  EXCEPTION WHEN OTHERS THEN
    INSERT INTO cron_log (message, created_at) 
    VALUES ('❌ [Lease Expiration] Error processing lease ' || lease_record.id || ': ' || SQLERRM, NOW());
  END LOOP;

  INSERT INTO cron_log (message, created_at) 
  VALUES ('✅ [Lease Expiration] Completed. Expired ' || expired_count || ' leases', NOW());

EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_log (message, created_at) 
  VALUES ('❌ [Lease Expiration] Fatal error: ' || SQLERRM, NOW());
END;
$$;

-- Schedule the lease expiration check to run daily at 03:00 AM
SELECT cron.schedule(
  'daily-lease-expiration',
  '0 3 * * *',
  'SELECT expire_old_leases();'
);

-- Add comment
COMMENT ON FUNCTION expire_old_leases() IS 
'Automatically detects expired leases, updates unit status to vacant, and notifies tenants. Runs daily at 03:00 AM.';

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] Lease expiration automation installed successfully', NOW());


