-- Create payment_requests table for tracking M-Pesa STK push requests
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checkout_request_id TEXT UNIQUE NOT NULL,
  merchant_request_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('rent', 'utility')),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES unit_bills(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  result_code INTEGER,
  result_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_checkout_id ON payment_requests(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_lease_id ON payment_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_bill_id ON payment_requests(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- Add RLS policies
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Policy for tenants to view their own payment requests
CREATE POLICY "Tenants can view their own payment requests" ON payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN tenant_info ti ON l.tenant_info_id = ti.id
      WHERE l.id = payment_requests.lease_id
      AND ti.auth_user_id = auth.uid()
    )
  );

-- Policy for landlords to view payment requests for their properties
CREATE POLICY "Landlords can view payment requests for their properties" ON payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      JOIN landlords ld ON p.landlord_id = ld.id
      WHERE l.id = payment_requests.lease_id
      AND ld.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policy for service role to manage all payment requests
CREATE POLICY "Service role can manage all payment requests" ON payment_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_requests_updated_at();
