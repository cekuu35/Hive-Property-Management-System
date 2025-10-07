-- Create utilities table
CREATE TABLE IF NOT EXISTS utilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Insert sample utilities
INSERT INTO utilities (name) VALUES 
    ('Water'),
    ('Electricity'),
    ('Internet')
ON CONFLICT (name) DO NOTHING;

-- Create unit_bills table
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
    payment_reason text, -- for manual payments
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unit_bills_tenant_id ON unit_bills (tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_bills_unit_id ON unit_bills (unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_bills_landlord_id ON unit_bills (landlord_id);
CREATE INDEX IF NOT EXISTS idx_unit_bills_status ON unit_bills (status);
CREATE INDEX IF NOT EXISTS idx_unit_bills_due_date ON unit_bills (due_date);

-- Create unique constraint to prevent duplicate bills
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_bills_unique 
ON unit_bills (unit_id, utility_id, month) 
WHERE status != 'deleted';

-- Create webhook_logs table for Paystack webhook debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- Create RLS policies for utilities table (public read)
ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilities are viewable by everyone" ON utilities
    FOR SELECT USING (true);

-- Create RLS policies for unit_bills table
ALTER TABLE unit_bills ENABLE ROW LEVEL SECURITY;

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

-- Create function to update updated_at timestamp
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

-- Create function to automatically mark overdue bills
CREATE OR REPLACE FUNCTION mark_overdue_bills()
RETURNS void AS $$
BEGIN
    UPDATE unit_bills 
    SET status = 'overdue'
    WHERE status = 'unpaid' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get tenant bills with utility names
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

-- Create function to get landlord bills with utility names
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




