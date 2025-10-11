-- Fix notifications trigger by ensuring the data column exists
-- First, add the data column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'data'
    ) THEN
        ALTER TABLE notifications ADD COLUMN data jsonb;
    END IF;
END $$;

-- Update the create_utility_bill_notification function to handle missing data column
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
        -- If there's an error with the data column, insert without it
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

