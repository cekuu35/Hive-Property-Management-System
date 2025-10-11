-- Setup automated monthly rent generation
-- This migration sets up a cron job to automatically generate monthly rent payments on the 1st of each month

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the generate-monthly-rent edge function
CREATE OR REPLACE FUNCTION generate_monthly_rent_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the edge function via HTTP
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-monthly-rent',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  
  -- Log the execution
  INSERT INTO cron_log (message, created_at)
  VALUES ('Monthly rent generation triggered', NOW());
END;
$$;

-- Create a cron log table for monitoring
CREATE TABLE IF NOT EXISTS cron_log (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule the monthly rent generation to run at 00:01 on the 1st of every month
-- This will run at 1 minute past midnight on the 1st of each month
SELECT cron.schedule(
  'monthly-rent-generation',
  '1 0 1 * *', -- At 00:01 on the 1st of every month
  'SELECT generate_monthly_rent_payments();'
);

-- Alternative: Run every day at 00:01 to check if it's the 1st of the month
-- This is more reliable as it doesn't depend on the exact timing
-- SELECT cron.schedule(
--   'daily-rent-check',
--   '1 0 * * *', -- At 00:01 every day
--   'SELECT generate_monthly_rent_payments();'
-- );

-- Create a function to check if it's the 1st of the month and generate payments
CREATE OR REPLACE FUNCTION check_and_generate_monthly_rent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_day INTEGER;
BEGIN
  -- Get the current day of the month
  current_day := EXTRACT(DAY FROM NOW());
  
  -- Only generate payments on the 1st of the month
  IF current_day = 1 THEN
    PERFORM generate_monthly_rent_payments();
    
    -- Log successful execution
    INSERT INTO cron_log (message, created_at)
    VALUES ('Monthly rent generation completed successfully', NOW());
  ELSE
    -- Log that it's not the 1st of the month
    INSERT INTO cron_log (message, created_at)
    VALUES ('Not the 1st of the month, skipping rent generation', NOW());
  END IF;
END;
$$;

-- Schedule the daily check function
SELECT cron.schedule(
  'daily-rent-check',
  '1 0 * * *', -- At 00:01 every day
  'SELECT check_and_generate_monthly_rent();'
);

-- Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION trigger_monthly_rent_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM generate_monthly_rent_payments();
  
  -- Log manual trigger
  INSERT INTO cron_log (message, created_at)
  VALUES ('Manual monthly rent generation triggered', NOW());
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_monthly_rent_payments() TO postgres;
GRANT EXECUTE ON FUNCTION check_and_generate_monthly_rent() TO postgres;
GRANT EXECUTE ON FUNCTION trigger_monthly_rent_generation() TO postgres;

-- Create an index on cron_log for better performance
CREATE INDEX IF NOT EXISTS idx_cron_log_created_at ON cron_log(created_at);

-- Insert initial log entry
INSERT INTO cron_log (message, created_at)
VALUES ('Monthly rent generation cron job setup completed', NOW());


