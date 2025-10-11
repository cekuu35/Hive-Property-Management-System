-- Ensure RLS policies for rent_payments table are properly configured

-- First, check if RLS is enabled
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Tenants can view their own rent payments" ON rent_payments;
DROP POLICY IF EXISTS "Landlords can view rent payments for their properties" ON rent_payments;

-- Create policy for tenants to view their own rent payments
CREATE POLICY "Tenants can view their own rent payments" 
ON rent_payments 
FOR SELECT 
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    JOIN profiles pr ON ti.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND l.status = 'active'
  )
);

-- Create policy for landlords to view rent payments for their properties
CREATE POLICY "Landlords can view rent payments for their properties" 
ON rent_payments 
FOR SELECT 
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Create policy for tenants to insert their own rent payments (for payment recording)
CREATE POLICY "Tenants can insert their own rent payments" 
ON rent_payments 
FOR INSERT 
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    JOIN profiles pr ON ti.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND l.status = 'active'
  )
);

-- Create policy for landlords to insert rent payments for their properties
CREATE POLICY "Landlords can insert rent payments for their properties" 
ON rent_payments 
FOR INSERT 
WITH CHECK (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Create policy for updating rent payments (for status updates)
CREATE POLICY "Landlords can update rent payments for their properties" 
ON rent_payments 
FOR UPDATE 
USING (
  lease_id IN (
    SELECT l.id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Also ensure tenant_info and leases have proper RLS policies
ALTER TABLE tenant_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- Tenant info policies
DROP POLICY IF EXISTS "Tenants can view their own info" ON tenant_info;
CREATE POLICY "Tenants can view their own info" 
ON tenant_info 
FOR SELECT 
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Leases policies
DROP POLICY IF EXISTS "Tenants can view their own leases" ON leases;
CREATE POLICY "Tenants can view their own leases" 
ON leases 
FOR SELECT 
USING (
  tenant_info_id IN (
    SELECT ti.id
    FROM tenant_info ti
    JOIN profiles pr ON ti.profile_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Landlord policies for tenant_info and leases
DROP POLICY IF EXISTS "Landlords can view tenant info for their properties" ON tenant_info;
CREATE POLICY "Landlords can view tenant info for their properties" 
ON tenant_info 
FOR SELECT 
USING (
  id IN (
    SELECT DISTINCT l.tenant_info_id
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON leases;
CREATE POLICY "Landlords can view leases for their properties" 
ON leases 
FOR SELECT 
USING (
  unit_id IN (
    SELECT u.id
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

