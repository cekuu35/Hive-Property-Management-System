-- ============================================================================
-- CUSTOM LATE FEE SYSTEM - Landlord Configurable Late Fees
-- ============================================================================
-- This migration adds the ability for landlords to set custom late fee policies
-- per unit/property with either percentage or flat rate
-- ============================================================================

-- 1. Add late fee configuration columns to units table
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS late_fee_type VARCHAR(20) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS late_fee_value DECIMAL(10,2) DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS late_fee_max_percentage DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS late_fee_grace_period_days INTEGER DEFAULT 0;

-- Drop existing constraints if present, then add constraints
ALTER TABLE units DROP CONSTRAINT IF EXISTS late_fee_type_check;
ALTER TABLE units DROP CONSTRAINT IF EXISTS late_fee_value_positive;
ALTER TABLE units DROP CONSTRAINT IF EXISTS late_fee_max_positive;
ALTER TABLE units DROP CONSTRAINT IF EXISTS grace_period_positive;

ALTER TABLE units 
ADD CONSTRAINT late_fee_type_check CHECK (late_fee_type IN ('percentage', 'flat', 'none')),
ADD CONSTRAINT late_fee_value_positive CHECK (late_fee_value >= 0),
ADD CONSTRAINT late_fee_max_positive CHECK (late_fee_max_percentage >= 0 AND late_fee_max_percentage <= 100),
ADD CONSTRAINT grace_period_positive CHECK (late_fee_grace_period_days >= 0);

COMMENT ON COLUMN units.late_fee_type IS 'Type of late fee: percentage (per day), flat (one-time), or none';
COMMENT ON COLUMN units.late_fee_value IS 'Late fee value - percentage per day (e.g., 2.00 = 2%) or flat amount (e.g., 500 = KES 500)';
COMMENT ON COLUMN units.late_fee_max_percentage IS 'Maximum late fee as percentage of rent (only for percentage type)';
COMMENT ON COLUMN units.late_fee_grace_period_days IS 'Grace period in days before late fees start (0 = no grace period)';

-- 2. Add late fee configuration to leases table (snapshot from unit at lease creation)
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS late_fee_type VARCHAR(20) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS late_fee_value DECIMAL(10,2) DEFAULT 2.00,
ADD COLUMN IF NOT EXISTS late_fee_max_percentage DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS late_fee_grace_period_days INTEGER DEFAULT 0;

COMMENT ON COLUMN leases.late_fee_type IS 'Late fee type agreed in this lease contract';
COMMENT ON COLUMN leases.late_fee_value IS 'Late fee value agreed in this lease contract';
COMMENT ON COLUMN leases.late_fee_max_percentage IS 'Maximum late fee percentage agreed in this lease contract';
COMMENT ON COLUMN leases.late_fee_grace_period_days IS 'Grace period agreed in this lease contract';

-- 3. Create function to copy late fee settings from unit to lease
CREATE OR REPLACE FUNCTION copy_late_fee_to_lease()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a new lease is created, copy late fee settings from the unit
  IF TG_OP = 'INSERT' THEN
    UPDATE leases
    SET 
      late_fee_type = (SELECT late_fee_type FROM units WHERE id = NEW.unit_id),
      late_fee_value = (SELECT late_fee_value FROM units WHERE id = NEW.unit_id),
      late_fee_max_percentage = (SELECT late_fee_max_percentage FROM units WHERE id = NEW.unit_id),
      late_fee_grace_period_days = (SELECT late_fee_grace_period_days FROM units WHERE id = NEW.unit_id)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger to auto-copy late fee settings to new leases
DROP TRIGGER IF EXISTS trigger_copy_late_fee_to_lease ON leases;
CREATE TRIGGER trigger_copy_late_fee_to_lease
AFTER INSERT ON leases
FOR EACH ROW
EXECUTE FUNCTION copy_late_fee_to_lease();

-- 5. Update existing leases with default late fee settings (for backward compatibility)
UPDATE leases
SET 
  late_fee_type = 'percentage',
  late_fee_value = 2.00,
  late_fee_max_percentage = 10.00,
  late_fee_grace_period_days = 0
WHERE late_fee_type IS NULL;

-- 6. Update existing units with default late fee settings
UPDATE units
SET 
  late_fee_type = 'percentage',
  late_fee_value = 2.00,
  late_fee_max_percentage = 10.00,
  late_fee_grace_period_days = 0
WHERE late_fee_type IS NULL;

-- 7. Create improved overdue detection function with custom late fees
CREATE OR REPLACE FUNCTION detect_overdue_payments_custom()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_record RECORD;
  updated_count INTEGER := 0;
  today_date DATE;
  late_fee_amount DECIMAL(10,2) := 0;
  days_overdue_after_grace INTEGER;
  late_fee_percentage DECIMAL(5,2) := 0;
BEGIN
  today_date := CURRENT_DATE;
  
  INSERT INTO cron_log (message, created_at) 
  VALUES ('🔍 [Custom Overdue Detection] Starting overdue payment check for ' || today_date, NOW());

  -- Find all pending payments that are past their due date
  FOR payment_record IN
    SELECT 
      rp.id as payment_id,
      rp.lease_id,
      rp.due_date,
      rp.amount,
      l.tenant_id,
      l.tenant_info_id,
      l.late_fee_type,
      l.late_fee_value,
      l.late_fee_max_percentage,
      l.late_fee_grace_period_days,
      DATE_PART('day', today_date - rp.due_date)::INTEGER AS days_past_due
    FROM rent_payments rp
    INNER JOIN leases l ON l.id = rp.lease_id
    WHERE rp.status = 'pending'
    AND rp.due_date < today_date
    AND l.status = 'active'
  LOOP
    -- Calculate days overdue after grace period
    days_overdue_after_grace := payment_record.days_past_due - COALESCE(payment_record.late_fee_grace_period_days, 0);
    
    -- Only process if past grace period
    IF days_overdue_after_grace > 0 THEN
      -- Update payment status to overdue
      UPDATE rent_payments
      SET 
        status = 'overdue',
        updated_at = NOW()
      WHERE id = payment_record.payment_id;

      -- Calculate late fee based on type
      CASE COALESCE(payment_record.late_fee_type, 'percentage')
        WHEN 'percentage' THEN
          -- Percentage per day, capped at max percentage
          late_fee_percentage := LEAST(
            days_overdue_after_grace * COALESCE(payment_record.late_fee_value, 0), 
            COALESCE(payment_record.late_fee_max_percentage, 100)
          );
          late_fee_amount := ROUND((payment_record.amount * late_fee_percentage / 100), 2);
          
        WHEN 'flat' THEN
          -- Flat fee (one-time charge)
          late_fee_amount := COALESCE(payment_record.late_fee_value, 0);
          
        WHEN 'none' THEN
          -- No late fee
          late_fee_amount := 0;
          
        ELSE
          -- Default to percentage if something is wrong
          late_fee_amount := ROUND((payment_record.amount * 0.02 * days_overdue_after_grace), 2);
      END CASE;

      -- Update late fee in rent_payments
      UPDATE rent_payments
      SET late_fee = late_fee_amount
      WHERE id = payment_record.payment_id;

      -- Update tenant balance to include late fee
      IF payment_record.tenant_info_id IS NOT NULL THEN
        UPDATE tenant_info
        SET 
          current_balance = current_balance + late_fee_amount,
          payment_status = 'overdue',
          updated_at = NOW()
        WHERE id = payment_record.tenant_info_id;
      END IF;

      updated_count := updated_count + 1;

      INSERT INTO cron_log (message, created_at) 
      VALUES (
        '⚠️ [Custom Overdue] Payment ' || payment_record.payment_id || 
        ' - Type: ' || COALESCE(payment_record.late_fee_type, 'percentage') ||
        ' - Days overdue: ' || days_overdue_after_grace || 
        ' (Grace: ' || COALESCE(payment_record.late_fee_grace_period_days, 0) || ' days)' ||
        ' - Late fee: KES ' || late_fee_amount,
        NOW()
      );

      -- Send notification to tenant
      INSERT INTO notifications (user_id, title, message, type, read, data, created_at)
      VALUES (
        payment_record.tenant_id,
        'Rent Payment Overdue',
        'Your rent payment of KES ' || payment_record.amount || ' is now ' || 
        days_overdue_after_grace || ' days overdue. A late fee of KES ' || 
        late_fee_amount || ' has been applied.',
        'payment_overdue',
        false,
        jsonb_build_object(
          'lease_id', payment_record.lease_id,
          'payment_id', payment_record.payment_id,
          'amount', payment_record.amount,
          'late_fee', late_fee_amount,
          'days_overdue', days_overdue_after_grace,
          'late_fee_type', payment_record.late_fee_type
        ),
        NOW()
      );
    ELSE
      -- Still in grace period
      INSERT INTO cron_log (message, created_at) 
      VALUES (
        'ℹ️ [Grace Period] Payment ' || payment_record.payment_id || 
        ' - ' || payment_record.days_past_due || ' days past due, but within ' ||
        COALESCE(payment_record.late_fee_grace_period_days, 0) || ' day grace period',
        NOW()
      );
    END IF;
  END LOOP;

  INSERT INTO cron_log (message, created_at) 
  VALUES ('✅ [Custom Overdue Detection] Completed. Updated ' || updated_count || ' payments', NOW());

EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_log (message, created_at) 
  VALUES ('❌ [Custom Overdue Detection] Fatal error: ' || SQLERRM, NOW());
END;
$$;

-- 8. Update the cron job to use the new custom function
SELECT cron.unschedule('daily-overdue-detection');
SELECT cron.schedule(
  'daily-overdue-detection-custom',
  '0 2 * * *',
  $$SELECT detect_overdue_payments_custom()$$
);

-- 9. Create view for landlords to see late fee configurations
CREATE OR REPLACE VIEW landlord_late_fee_settings AS
SELECT 
  u.id as unit_id,
  u.unit_number,
  u.property_id,
  p.name as property_name,
  p.landlord_id,
  u.late_fee_type,
  u.late_fee_value,
  u.late_fee_max_percentage,
  u.late_fee_grace_period_days,
  CASE 
    WHEN u.late_fee_type = 'percentage' THEN 
      u.late_fee_value || '% per day (max ' || u.late_fee_max_percentage || '%)'
    WHEN u.late_fee_type = 'flat' THEN 
      'KES ' || u.late_fee_value || ' (one-time)'
    WHEN u.late_fee_type = 'none' THEN 
      'No late fees'
    ELSE 'Unknown'
  END as late_fee_description,
  CASE 
    WHEN u.late_fee_grace_period_days = 0 THEN 'No grace period'
    WHEN u.late_fee_grace_period_days = 1 THEN '1 day grace period'
    ELSE u.late_fee_grace_period_days || ' days grace period'
  END as grace_period_description
FROM units u
INNER JOIN properties p ON p.id = u.property_id;

-- 10. Grant permissions
GRANT SELECT ON landlord_late_fee_settings TO authenticated;

-- 11. Create RLS policy for the view (on units table)
DROP POLICY IF EXISTS landlords_view_own_late_fee_settings ON units;
CREATE POLICY "Landlords can view their own late fee settings"
ON units
FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE landlord_id = auth.uid()
  )
);

-- Log completion
INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [Migration] Custom late fee system installed successfully', NOW());
