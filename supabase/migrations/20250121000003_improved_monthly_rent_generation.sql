-- ============================================================================
-- IMPROVED MONTHLY RENT GENERATION (CUMULATIVE BALANCE SUPPORT)
-- ============================================================================
-- This migration improves the monthly rent generation function to properly
-- handle cumulative balances (adding to existing unpaid amounts instead of
-- only updating when balance is 0)
-- ============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS daily_monthly_rent_check();

-- Create improved function with cumulative balance support
CREATE OR REPLACE FUNCTION daily_monthly_rent_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_day INTEGER;
  current_month INTEGER;
  current_year INTEGER;
  due_date TEXT;
  lease_record RECORD;
  payment_exists BOOLEAN;
  new_payment_id UUID;
  generated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  -- Check if today is the 1st of the month
  current_day := EXTRACT(DAY FROM NOW());
  
  IF current_day = 1 THEN
    current_month := EXTRACT(MONTH FROM NOW());
    current_year := EXTRACT(YEAR FROM NOW());
    due_date := TO_CHAR(NOW(), 'YYYY-MM-01');
    
    INSERT INTO cron_log (message, created_at) 
    VALUES ('🗓️ [Monthly Rent] Starting monthly rent generation for ' || due_date, NOW());

    -- Loop through all active leases
    FOR lease_record IN
      SELECT 
        l.id,
        l.rent_amount,
        l.tenant_info_id,
        l.tenant_id,
        u.unit_number,
        p.name AS property_name
      FROM leases l
      INNER JOIN units u ON u.id = l.unit_id
      INNER JOIN properties p ON p.id = u.property_id
      WHERE l.status = 'active'
    LOOP
      -- Check if payment already exists for this month
      SELECT EXISTS(
        SELECT 1 FROM rent_payments
        WHERE lease_id = lease_record.id
        AND due_date = due_date
      ) INTO payment_exists;

      IF NOT payment_exists THEN
        -- Create new rent payment record
        INSERT INTO rent_payments (
          lease_id,
          amount,
          due_date,
          status,
          created_at,
          updated_at
        )
        VALUES (
          lease_record.id,
          lease_record.rent_amount,
          due_date,
          'pending',
          NOW(),
          NOW()
        )
        RETURNING id INTO new_payment_id;

        -- UPDATE TENANT BALANCE (CUMULATIVE - always add to existing balance)
        DECLARE
          current_balance DECIMAL(10,2);
          new_balance DECIMAL(10,2);
        BEGIN
          -- Get current balance
          SELECT COALESCE(current_balance, 0) INTO current_balance
          FROM tenant_info
          WHERE id = COALESCE(lease_record.tenant_info_id, lease_record.tenant_id);

          -- Calculate new cumulative balance
          new_balance := current_balance + lease_record.rent_amount;

          -- Update tenant_info with cumulative balance
          UPDATE tenant_info
          SET 
            current_balance = new_balance,
            payment_status = CASE 
              WHEN new_balance > 0 THEN 'unpaid'
              ELSE 'paid'
            END,
            updated_at = NOW()
          WHERE id = COALESCE(lease_record.tenant_info_id, lease_record.tenant_id);

          generated_count := generated_count + 1;

          INSERT INTO cron_log (message, created_at) 
          VALUES (
            '✅ [Monthly Rent] Created payment ' || new_payment_id || ' for lease ' || lease_record.id || 
            ' (Unit ' || lease_record.unit_number || ' at ' || lease_record.property_name || ') - ' ||
            'KES ' || lease_record.rent_amount || ' | Balance: ' || current_balance || ' → ' || new_balance,
            NOW()
          );

          -- Send notification to tenant
          IF lease_record.tenant_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, message, type, read, data, created_at)
            VALUES (
              lease_record.tenant_id,
              'Monthly Rent Due',
              'Your rent for ' || TO_CHAR(NOW(), 'Month YYYY') || ' is now due. Amount: KES ' || 
              lease_record.rent_amount || '. Total balance: KES ' || new_balance || '.',
              'rent_due',
              false,
              jsonb_build_object(
                'lease_id', lease_record.id,
                'payment_id', new_payment_id,
                'amount', lease_record.rent_amount,
                'total_balance', new_balance,
                'due_date', due_date
              ),
              NOW()
            );
          END IF;

        EXCEPTION WHEN OTHERS THEN
          INSERT INTO cron_log (message, created_at) 
          VALUES ('❌ [Monthly Rent] Error updating tenant balance for lease ' || lease_record.id || ': ' || SQLERRM, NOW());
        END;

      ELSE
        skipped_count := skipped_count + 1;
        INSERT INTO cron_log (message, created_at) 
        VALUES ('⏭️ [Monthly Rent] Payment already exists for lease ' || lease_record.id || ' for ' || due_date, NOW());
      END IF;

    EXCEPTION WHEN OTHERS THEN
      INSERT INTO cron_log (message, created_at) 
      VALUES ('❌ [Monthly Rent] Error processing lease ' || lease_record.id || ': ' || SQLERRM, NOW());
    END LOOP;

    INSERT INTO cron_log (message, created_at) 
    VALUES (
      '✅ [Monthly Rent] Monthly rent generation completed for ' || due_date || 
      ' | Generated: ' || generated_count || ' | Skipped: ' || skipped_count,
      NOW()
    );

  ELSE
    INSERT INTO cron_log (message, created_at) 
    VALUES ('⏸️ [Monthly Rent] Not the 1st of the month (Day ' || current_day || '), skipping rent generation', NOW());
  END IF;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO cron_log (message, created_at) 
  VALUES ('❌ [Monthly Rent] Fatal error in monthly rent generation: ' || SQLERRM, NOW());
END;
$$;

-- Cron schedule remains the same (daily at 00:01 AM)
-- The existing cron job will automatically use the new function

-- Add comment
COMMENT ON FUNCTION daily_monthly_rent_check() IS 
'Generates monthly rent payments on the 1st of each month with cumulative balance support. Runs daily at 00:01 AM.';

INSERT INTO cron_log (message, created_at) 
VALUES ('✅ [System] Improved monthly rent generation (cumulative balance) installed successfully', NOW());


