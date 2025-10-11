-- Simple monthly rent generation trigger
-- This creates a daily trigger that checks if it's the 1st of the month and generates rent payments

-- Create a function that runs daily and generates monthly rent if it's the 1st
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
BEGIN
  -- Get current date components
  current_day := EXTRACT(DAY FROM NOW());
  current_month := EXTRACT(MONTH FROM NOW());
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Only run on the 1st of the month
  IF current_day = 1 THEN
    -- Calculate due date (first day of current month)
    due_date := TO_CHAR(NOW(), 'YYYY-MM-01');
    
    -- Log the start of monthly rent generation
    INSERT INTO cron_log (message, created_at)
    VALUES ('Starting monthly rent generation for ' || due_date, NOW());
    
    -- Loop through all active leases
    FOR lease_record IN 
      SELECT id, rent_amount, tenant_info_id
      FROM leases 
      WHERE status = 'active'
    LOOP
      -- Check if payment already exists for this month
      SELECT EXISTS(
        SELECT 1 FROM rent_payments 
        WHERE lease_id = lease_record.id 
        AND due_date = due_date
      ) INTO payment_exists;
      
      -- Create payment if it doesn't exist
      IF NOT payment_exists THEN
        INSERT INTO rent_payments (lease_id, amount, due_date, status, created_at, updated_at)
        VALUES (
          lease_record.id, 
          lease_record.rent_amount, 
          due_date, 
          'pending',
          NOW(),
          NOW()
        )
        RETURNING id INTO new_payment_id;
        
        -- Log the creation
        INSERT INTO cron_log (message, created_at)
        VALUES ('Created rent payment ' || new_payment_id || ' for lease ' || lease_record.id || ' - KES ' || lease_record.rent_amount, NOW());
        
        -- Update tenant_info current_balance if it's 0 (new month)
        UPDATE tenant_info 
        SET current_balance = lease_record.rent_amount,
            payment_status = 'unpaid',
            updated_at = NOW()
        WHERE id = lease_record.tenant_info_id 
        AND current_balance = 0;
        
      ELSE
        -- Log that payment already exists
        INSERT INTO cron_log (message, created_at)
        VALUES ('Payment already exists for lease ' || lease_record.id || ' for ' || due_date, NOW());
      END IF;
    END LOOP;
    
    -- Log completion
    INSERT INTO cron_log (message, created_at)
    VALUES ('Monthly rent generation completed for ' || due_date, NOW());
    
  ELSE
    -- Log that it's not the 1st of the month
    INSERT INTO cron_log (message, created_at)
    VALUES ('Not the 1st of the month (' || current_day || '), skipping rent generation', NOW());
  END IF;
END;
$$;

-- Create a cron log table if it doesn't exist
CREATE TABLE IF NOT EXISTS cron_log (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily check (runs at 00:01 every day)
SELECT cron.schedule(
  'daily-monthly-rent-check',
  '1 0 * * *', -- At 00:01 every day
  'SELECT daily_monthly_rent_check();'
);

-- Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION trigger_manual_monthly_rent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Force run the monthly rent check regardless of date
  PERFORM daily_monthly_rent_check();
  
  -- Log manual trigger
  INSERT INTO cron_log (message, created_at)
  VALUES ('Manual monthly rent generation triggered', NOW());
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION daily_monthly_rent_check() TO postgres;
GRANT EXECUTE ON FUNCTION trigger_manual_monthly_rent() TO postgres;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cron_log_created_at ON cron_log(created_at);

-- Insert setup completion log
INSERT INTO cron_log (message, created_at)
VALUES ('Monthly rent generation system setup completed', NOW());


