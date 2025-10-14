-- Fix the notifications trigger to use the correct user_id
-- The issue is that the trigger is using tenant_info.profile_id as user_id
-- but notifications.user_id should reference profiles.id directly

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_notify_utility_bill_created ON unit_bills;
DROP FUNCTION IF EXISTS notify_utility_bill_created();

-- Create the corrected function
CREATE OR REPLACE FUNCTION notify_utility_bill_created()
RETURNS TRIGGER AS $$
DECLARE
    tenant_user_id uuid;
    utility_name text;
BEGIN
    -- Get tenant user_id directly from tenant_info
    SELECT ti.profile_id INTO tenant_user_id
    FROM tenant_info ti
    WHERE ti.id = NEW.tenant_id;
    
    -- Get utility name
    SELECT u.name INTO utility_name
    FROM utilities u
    WHERE u.id = NEW.utility_id;
    
    -- Create notification if tenant exists and has a valid profile_id
    IF tenant_user_id IS NOT NULL THEN
        -- Verify that the profile exists in the profiles table
        IF EXISTS (SELECT 1 FROM profiles WHERE id = tenant_user_id) THEN
            INSERT INTO notifications (
                user_id,
                title,
                message,
                type,
                data
            ) VALUES (
                tenant_user_id,
                'New Utility Bill',
                utility_name || ' bill for ' || NEW.amount || ' KES due on ' || NEW.due_date,
                'utility_bill',
                jsonb_build_object(
                    'bill_id', NEW.id,
                    'utility_name', utility_name,
                    'amount', NEW.amount,
                    'due_date', NEW.due_date
                )
            );
        ELSE
            -- Log warning if profile doesn't exist
            RAISE WARNING 'Profile with id % does not exist in profiles table', tenant_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_utility_bill_created
    AFTER INSERT ON unit_bills
    FOR EACH ROW
    EXECUTE FUNCTION notify_utility_bill_created();

