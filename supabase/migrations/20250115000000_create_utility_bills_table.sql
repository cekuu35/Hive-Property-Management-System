-- Create utility_bills table with proper relationships
CREATE TABLE IF NOT EXISTS utility_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenant_info(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('electricity', 'water', 'gas', 'internet', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Landlords can manage utility bills for their properties" 
ON utility_bills 
FOR ALL 
USING (landlord_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Tenants can view their own utility bills" 
ON utility_bills 
FOR SELECT 
USING (tenant_id IN (
  SELECT id FROM tenant_info WHERE profile_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_utility_bills_tenant_id ON utility_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_landlord_id ON utility_bills(landlord_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_unit_id ON utility_bills(unit_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_status ON utility_bills(status);
CREATE INDEX IF NOT EXISTS idx_utility_bills_due_date ON utility_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_utility_bills_bill_type ON utility_bills(bill_type);

-- Add trigger for updated_at
CREATE TRIGGER update_utility_bills_updated_at
  BEFORE UPDATE ON utility_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
