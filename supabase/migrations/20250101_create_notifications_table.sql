-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    data jsonb,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Service role can do everything
CREATE POLICY "Service role can manage all notifications" ON notifications
    FOR ALL USING (true);

-- Create function to create utility bill notification
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
        p_utility_name || ' bill for ' || p_amount || ' KES due on ' || p_due_date,
        'utility_bill',
        jsonb_build_object(
            'bill_id', p_bill_id,
            'utility_name', p_utility_name,
            'amount', p_amount,
            'due_date', p_due_date
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create notification when bill is created
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
        PERFORM create_utility_bill_notification(
            tenant_profile_id,
            NEW.id,
            utility_name,
            NEW.amount,
            NEW.due_date
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_notify_utility_bill_created
    AFTER INSERT ON unit_bills
    FOR EACH ROW
    EXECUTE FUNCTION notify_utility_bill_created();









