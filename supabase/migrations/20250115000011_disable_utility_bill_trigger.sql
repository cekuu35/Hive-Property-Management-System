-- Temporarily disable the utility bill trigger to fix the notifications issue
DROP TRIGGER IF EXISTS trigger_notify_utility_bill_created ON unit_bills;

-- Add the missing data column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;

-- Recreate the function to handle the data column properly
CREATE OR REPLACE FUNCTION notify_utility_bill_created()
RETURNS TRIGGER AS $$
DECLARE
    tenant_profile_id uuid;
    utility_name text;
BEGIN
    -- Get tenant profile ID
    SELECT ti.profile_id INTO tenant_profile_id
    FROM tenant_info ti
    WHERE ti.id = NEW.tenant_id;
    
    -- Get utility name
    SELECT u.name INTO utility_name
    FROM utilities u
    WHERE u.id = NEW.utility_id;
    
    -- Create notification if tenant exists
    IF tenant_profile_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            data
        ) VALUES (
            tenant_profile_id,
            'New Utility Bill',
            'You have a new ' || utility_name || ' bill for KES ' || NEW.amount || ' due on ' || NEW.due_date,
            'utility_bill',
            jsonb_build_object(
                'bill_id', NEW.id,
                'utility_name', utility_name,
                'amount', NEW.amount,
                'due_date', NEW.due_date
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_utility_bill_created
    AFTER INSERT ON unit_bills
    FOR EACH ROW
    EXECUTE FUNCTION notify_utility_bill_created();

