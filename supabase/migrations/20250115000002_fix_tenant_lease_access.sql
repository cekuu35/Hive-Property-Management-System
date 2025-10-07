-- Fix tenant lease access by adding proper RLS policy
-- This allows tenants to view their own leases through the tenant_info relationship

-- Enable RLS on leases table if not already enabled
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenants_can_view_own_leases" ON leases;
DROP POLICY IF EXISTS "tenants_can_view_leases" ON leases;

-- Create policy for tenants to view their own leases
-- This policy allows tenants to view leases where the tenant_info_id matches
-- a tenant_info record that belongs to their profile_id
CREATE POLICY "tenants_can_view_own_leases" ON leases
  FOR SELECT
  USING (
    tenant_info_id IN (
      SELECT id 
      FROM tenant_info 
      WHERE profile_id = auth.uid()
    )
  );

-- Also create a policy for landlords to view their tenants' leases
CREATE POLICY "landlords_can_view_tenant_leases" ON leases
  FOR ALL
  USING (
    tenant_info_id IN (
      SELECT id 
      FROM tenant_info 
      WHERE landlord_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT ON leases TO authenticated;
GRANT ALL ON leases TO service_role;


