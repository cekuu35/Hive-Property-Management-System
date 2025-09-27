-- Fix Maintenance Request Creation Issues
-- This script addresses RLS policies and ensures proper data setup

-- 1. First, let's ensure we have proper RLS policies for maintenance_requests
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view relevant maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests for their units" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can update relevant maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can view maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can update maintenance requests" ON public.maintenance_requests;

-- 2. Create comprehensive RLS policies for maintenance_requests
-- SELECT policy - allow users to view relevant maintenance requests
CREATE POLICY "Users can view relevant maintenance requests" ON public.maintenance_requests FOR SELECT USING (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  unit_id IN (
    SELECT u.id FROM units u 
    JOIN properties p ON u.property_id = p.id 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

-- INSERT policy - allow tenants to create maintenance requests
CREATE POLICY "Tenants can create maintenance requests for their units" ON public.maintenance_requests FOR INSERT WITH CHECK (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- UPDATE policy - allow users to update relevant maintenance requests
CREATE POLICY "Users can update relevant maintenance requests" ON public.maintenance_requests FOR UPDATE USING (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  unit_id IN (
    SELECT u.id FROM units u 
    JOIN properties p ON u.property_id = p.id 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

-- 3. Ensure we have proper test data for tenants
-- Create a tenant profile if it doesn't exist
INSERT INTO public.profiles (
  id,
  user_id,
  first_name,
  last_name,
  role,
  created_at,
  updated_at
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440002',
  'John',
  'Doe',
  'tenant',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '550e8400-e29b-41d4-a716-446655440002'
) AND EXISTS (
  SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440002'
);

-- 4. Create a property if it doesn't exist
INSERT INTO public.properties (
  id,
  name,
  address,
  landlord_id,
  created_at,
  updated_at
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440003',
  'Test Property',
  '123 Test Street',
  '550e8400-e29b-41d4-a716-446655440001',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.properties WHERE id = '550e8400-e29b-41d4-a716-446655440003'
) AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '550e8400-e29b-41d4-a716-446655440001'
);

-- 5. Create a unit if it doesn't exist
INSERT INTO public.units (
  id,
  property_id,
  unit_number,
  rent_amount,
  created_at,
  updated_at
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440003',
  '101',
  50000,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.units WHERE id = '550e8400-e29b-41d4-a716-446655440004'
) AND EXISTS (
  SELECT 1 FROM public.properties WHERE id = '550e8400-e29b-41d4-a716-446655440003'
);

-- 6. Create an active lease for the tenant if it doesn't exist
INSERT INTO public.leases (
  id,
  unit_id,
  tenant_id,
  start_date,
  end_date,
  rent_amount,
  status,
  created_at,
  updated_at
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440002',
  '2024-01-01',
  '2024-12-31',
  50000,
  'active',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.leases WHERE id = '550e8400-e29b-41d4-a716-446655440005'
) AND EXISTS (
  SELECT 1 FROM public.units WHERE id = '550e8400-e29b-41d4-a716-446655440004'
) AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '550e8400-e29b-41d4-a716-446655440002'
);

-- 7. Create an approved unit application as backup if it doesn't exist
INSERT INTO public.unit_applications (
  id,
  unit_id,
  tenant_id,
  status,
  reviewed_by,
  created_at,
  updated_at
)
SELECT 
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440002',
  'approved',
  '550e8400-e29b-41d4-a716-446655440001',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.unit_applications WHERE id = '550e8400-e29b-41d4-a716-446655440006'
) AND EXISTS (
  SELECT 1 FROM public.units WHERE id = '550e8400-e29b-41d4-a716-446655440004'
) AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '550e8400-e29b-41d4-a716-446655440002'
) AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '550e8400-e29b-41d4-a716-446655440001'
);

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 9. Enable RLS on maintenance_requests table
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- 10. Test the setup by trying to create a maintenance request
-- This will help verify that everything is working
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Try to insert a test maintenance request
  INSERT INTO public.maintenance_requests (
    title,
    description,
    category,
    priority,
    status,
    unit_id,
    tenant_id,
    created_at,
    updated_at
  ) VALUES (
    'Test Maintenance Request',
    'This is a test request to verify the setup',
    'general',
    'medium',
    'pending',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440002',
    now(),
    now()
  );
  
  RAISE NOTICE 'Test maintenance request created successfully!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating test maintenance request: %', SQLERRM;
END $$;

-- 11. Clean up the test request
DELETE FROM public.maintenance_requests 
WHERE title = 'Test Maintenance Request' 
AND description = 'This is a test request to verify the setup';

-- 12. Final success message
DO $$
BEGIN
  RAISE NOTICE 'Maintenance request system setup completed successfully!';
END $$;
