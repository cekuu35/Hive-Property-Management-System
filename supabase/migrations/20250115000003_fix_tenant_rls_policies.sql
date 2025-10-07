-- Fix RLS policies for tenant portal access
-- This allows tenants to view their own tenant_info and leases

-- Enable RLS on tenant_info if not already enabled
ALTER TABLE public.tenant_info ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenants_can_view_own_tenant_info" ON public.tenant_info;

-- Create policy for tenants to view their own tenant_info
CREATE POLICY "tenants_can_view_own_tenant_info" ON public.tenant_info
  FOR SELECT
  USING (profile_id = auth.uid());

-- Enable RLS on leases if not already enabled
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tenants_can_view_own_leases" ON public.leases;

-- Create policy for tenants to view their own leases
CREATE POLICY "tenants_can_view_own_leases" ON public.leases
  FOR SELECT
  USING (
    tenant_info_id IN (
      SELECT id 
      FROM public.tenant_info 
      WHERE profile_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT ON public.tenant_info TO authenticated;
GRANT SELECT ON public.leases TO authenticated;

-- Also create policies for landlords to view their tenants' data
DROP POLICY IF EXISTS "landlords_can_view_tenant_info" ON public.tenant_info;
CREATE POLICY "landlords_can_view_tenant_info" ON public.tenant_info
  FOR ALL
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "landlords_can_view_tenant_leases" ON public.leases;
CREATE POLICY "landlords_can_view_tenant_leases" ON public.leases
  FOR ALL
  USING (
    tenant_info_id IN (
      SELECT id 
      FROM public.tenant_info 
      WHERE landlord_id = auth.uid()
    )
  );
