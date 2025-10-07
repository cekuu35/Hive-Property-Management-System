-- =====================================================
-- UTILITY BILLING SYSTEM SETUP
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create utilities table
CREATE TABLE IF NOT EXISTS utilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Insert sample utilities
INSERT INTO utilities (name) VALUES 
    ('Water'),
    ('Electricity'),
    ('Internet')
ON CONFLICT (name) DO NOTHING;

-- 2. Create unit_bills table
CREATE TABLE IF NOT EXISTS unit_bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid REFERENCES units(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES tenant_info(id) ON DELETE SET NULL,
    landlord_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    utility_id uuid REFERENCES utilities(id) ON DELETE RESTRICT,
    month text NOT NULL,
    amount numeric NOT NULL,
    due_date date,
    status text DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    paystack_reference text,
    payment_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unit_bills_tenant_id ON unit_bills (tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_bills_unit_id ON unit_bills (unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_bills_landlord_id ON unit_bills (landlord_id);
CREATE INDEX IF NOT EXISTS idx_unit_bills_status ON unit_bills (status);
CREATE INDEX IF NOT EXISTS idx_unit_bills_due_date ON unit_bills (due_date);

-- Create unique constraint to prevent duplicate bills
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_bills_unique 
ON unit_bills (unit_id, utility_id, month) 
WHERE status != 'deleted';

-- 5. Enable RLS
ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for utilities table (public read)
CREATE POLICY "Utilities are viewable by everyone" ON utilities
    FOR SELECT USING (true);

-- 7. Create RLS policies for unit_bills table
-- Tenants can view their own bills
CREATE POLICY "Tenants can view their own bills" ON unit_bills
    FOR SELECT USING (
        tenant_id IN (
            SELECT ti.id 
            FROM tenant_info ti 
            JOIN profiles p ON ti.profile_id = p.id 
            WHERE p.user_id = auth.uid()
        )
    );

-- Landlords can view bills for their units
CREATE POLICY "Landlords can view their bills" ON unit_bills
    FOR SELECT USING (
        landlord_id IN (
            SELECT p.id 
            FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'landlord'
        )
    );

-- Landlords can insert bills for their units
CREATE POLICY "Landlords can create bills" ON unit_bills
    FOR INSERT WITH CHECK (
        landlord_id IN (
            SELECT p.id 
            FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'landlord'
        )
        AND unit_id IN (
            SELECT u.id 
            FROM units u 
            JOIN properties pr ON u.property_id = pr.id 
            WHERE pr.landlord_id = (
                SELECT p.id 
                FROM profiles p 
                WHERE p.user_id = auth.uid() AND p.role = 'landlord'
            )
        )
    );

-- Landlords can update bills for their units
CREATE POLICY "Landlords can update their bills" ON unit_bills
    FOR UPDATE USING (
        landlord_id IN (
            SELECT p.id 
            FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'landlord'
        )
    );

-- Landlords can delete bills for their units
CREATE POLICY "Landlords can delete their bills" ON unit_bills
    FOR DELETE USING (
        landlord_id IN (
            SELECT p.id 
            FROM profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'landlord'
        )
    );

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role can manage all bills" ON unit_bills
    FOR ALL USING (true);

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for unit_bills
CREATE TRIGGER update_unit_bills_updated_at 
    BEFORE UPDATE ON unit_bills 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Create function to automatically mark overdue bills
CREATE OR REPLACE FUNCTION mark_overdue_bills()
RETURNS void AS $$
BEGIN
    UPDATE unit_bills 
    SET status = 'overdue'
    WHERE status = 'unpaid' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to get tenant bills with utility names
CREATE OR REPLACE FUNCTION get_tenant_bills(tenant_profile_id uuid)
RETURNS TABLE (
    id uuid,
    unit_id uuid,
    utility_name text,
    month text,
    amount numeric,
    due_date date,
    status text,
    paystack_reference text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.unit_id,
        u.name as utility_name,
        ub.month,
        ub.amount,
        ub.due_date,
        ub.status,
        ub.paystack_reference,
        ub.created_at
    FROM unit_bills ub
    JOIN utilities u ON ub.utility_id = u.id
    WHERE ub.tenant_id = (
        SELECT ti.id 
        FROM tenant_info ti 
        WHERE ti.profile_id = tenant_profile_id
    )
    ORDER BY ub.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to get landlord bills with utility names
CREATE OR REPLACE FUNCTION get_landlord_bills(landlord_profile_id uuid)
RETURNS TABLE (
    id uuid,
    unit_id uuid,
    unit_number text,
    property_name text,
    tenant_name text,
    utility_name text,
    month text,
    amount numeric,
    due_date date,
    status text,
    paystack_reference text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ub.id,
        ub.unit_id,
        u.unit_number,
        p.name as property_name,
        CONCAT(ti.first_name, ' ', ti.last_name) as tenant_name,
        ut.name as utility_name,
        ub.month,
        ub.amount,
        ub.due_date,
        ub.status,
        ub.paystack_reference,
        ub.created_at
    FROM unit_bills ub
    JOIN utilities ut ON ub.utility_id = ut.id
    JOIN units u ON ub.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    LEFT JOIN tenant_info ti ON ub.tenant_id = ti.id
    WHERE ub.landlord_id = landlord_profile_id
    ORDER BY ub.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to create utility bill notification
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

-- 13. Create trigger to automatically create notification when bill is created
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

-- 14. Create sample data for testing
-- Insert a sample utility bill for testing
DO $$
DECLARE
    sample_unit_id uuid;
    sample_landlord_id uuid;
    sample_utility_id uuid;
    sample_tenant_id uuid;
BEGIN
    -- Get a sample unit and its landlord profile ID
    SELECT u.id, pr.id INTO sample_unit_id, sample_landlord_id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON pr.id = p.landlord_id
    LIMIT 1;
    
    -- Get water utility
    SELECT id INTO sample_utility_id
    FROM utilities
    WHERE name = 'Water'
    LIMIT 1;
    
    -- Get a sample tenant for this unit through leases
    SELECT ti.id INTO sample_tenant_id
    FROM tenant_info ti
    JOIN leases l ON l.tenant_info_id = ti.id
    WHERE l.unit_id = sample_unit_id
    LIMIT 1;
    
    -- Insert sample bill if we have the required data
    IF sample_unit_id IS NOT NULL AND sample_utility_id IS NOT NULL THEN
        INSERT INTO unit_bills (
            unit_id,
            landlord_id,
            utility_id,
            month,
            amount,
            due_date,
            status,
            tenant_id
        ) VALUES (
            sample_unit_id,
            sample_landlord_id,
            sample_utility_id,
            'January 2025',
            1500.00,
            '2025-01-31',
            'unpaid',
            sample_tenant_id
        );
        
        RAISE NOTICE 'Sample utility bill created for testing';
    ELSE
        RAISE NOTICE 'Could not create sample bill - missing required data';
    END IF;
END $$;

-- 15. Verify the setup
SELECT 'Setup completed successfully!' as status;

-- Show created tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('utilities', 'unit_bills', 'webhook_logs', 'notifications')
ORDER BY tablename;

-- Show sample data
SELECT 
    'utilities' as table_name,
    count(*) as record_count
FROM utilities
UNION ALL
SELECT 
    'unit_bills' as table_name,
    count(*) as record_count
FROM unit_bills
UNION ALL
SELECT 
    'notifications' as table_name,
    count(*) as record_count
FROM notifications;
