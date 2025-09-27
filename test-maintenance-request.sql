-- Test script to verify maintenance request creation works
-- Run this in Supabase SQL Editor to ensure basic data exists

-- Check if we have any profiles
SELECT 'Profiles count:' as info, COUNT(*) as count FROM public.profiles;

-- Check if we have any properties
SELECT 'Properties count:' as info, COUNT(*) as count FROM public.properties;

-- Check if we have any units
SELECT 'Units count:' as info, COUNT(*) as count FROM public.units;

-- Check if we have any leases
SELECT 'Leases count:' as info, COUNT(*) as count FROM public.leases;

-- Check if we have any caretakers
SELECT 'Caretakers count:' as info, COUNT(*) as count FROM public.profiles WHERE role = 'caretaker';

-- If no basic data exists, create some test data
INSERT INTO public.profiles (id, user_id, role, first_name, last_name, phone) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'landlord', 'John', 'Smith', '+1234567890'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'tenant', 'Jane', 'Doe', '+1234567891'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'caretaker', 'Mike', 'Handyman', '+1234567892')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.properties (id, landlord_id, name, address, description, total_units) VALUES
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Sunset Apartments', '123 Main St, City, State', 'Beautiful apartment complex with modern amenities', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.units (id, property_id, unit_number, type, rent_amount, deposit_amount, status, square_feet) VALUES
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '101', '1BR', 1200.00, 1200.00, 'occupied', 800),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', '102', '2BR', 1500.00, 1500.00, 'vacant', 1000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leases (id, tenant_id, unit_id, status, start_date, end_date, rent_amount) VALUES
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'active', '2024-01-01', '2024-12-31', 1200.00)
ON CONFLICT (id) DO NOTHING;

-- Test creating a maintenance request
INSERT INTO public.maintenance_requests (
  title, 
  description, 
  category, 
  priority, 
  status, 
  unit_id, 
  tenant_id, 
  images
) VALUES (
  'Test Maintenance Request',
  'This is a test maintenance request to verify the system works',
  'general',
  'medium',
  'pending',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440002',
  '[]'
);

-- Check if the maintenance request was created
SELECT 'Maintenance requests count:' as info, COUNT(*) as count FROM public.maintenance_requests;

-- Show the created maintenance request
SELECT * FROM public.maintenance_requests ORDER BY created_at DESC LIMIT 1;
