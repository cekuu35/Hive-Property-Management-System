-- Fix notifications table by adding the missing data column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;

-- Update the create_utility_bill_notification function to handle the data column properly
CREATE OR REPLACE FUNCTION create_utility_bill_notification(
    p_tenant_id uuid,
    p_bill_id uuid,
    p_utility_name text,
    p_amount numeric,
    p_due_date date
)
RETURNS void AS $$
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        data
    ) VALUES (
        p_tenant_id,
        'New Utility Bill',
        'You have a new ' || p_utility_name || ' bill for KES ' || p_amount || ' due on ' || p_due_date,
        'utility_bill',
        jsonb_build_object(
            'bill_id', p_bill_id,
            'utility_name', p_utility_name,
            'amount', p_amount,
            'due_date', p_due_date
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        -- If there's still an error, insert without the data column
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type
        ) VALUES (
            p_tenant_id,
            'New Utility Bill',
            'You have a new ' || p_utility_name || ' bill for KES ' || p_amount || ' due on ' || p_due_date,
            'utility_bill'
        );
END;
$$ LANGUAGE plpgsql;

