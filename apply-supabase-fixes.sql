-- Apply this SQL script in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/kozhlejudselgtmohdfm/sql

-- 1. Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure all necessary triggers exist for updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at 
  BEFORE UPDATE ON public.properties 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_units_updated_at ON public.units;
CREATE TRIGGER update_units_updated_at 
  BEFORE UPDATE ON public.units 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leases_updated_at ON public.leases;
CREATE TRIGGER update_leases_updated_at 
  BEFORE UPDATE ON public.leases 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON public.messages 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON public.notifications 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_unit_applications_updated_at ON public.unit_applications;
CREATE TRIGGER update_unit_applications_updated_at 
  BEFORE UPDATE ON public.unit_applications 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create function for message notifications
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url
  )
  VALUES (
    NEW.receiver_id,
    'New Message',
    'You have received a new message: ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
    'message',
    '/dashboard?tab=messages'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger for message notifications
DROP TRIGGER IF EXISTS trigger_notify_message_received ON public.messages;
CREATE TRIGGER trigger_notify_message_received
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_received();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 8. Create test data for development
-- Insert test profiles
INSERT INTO public.profiles (id, user_id, role, first_name, last_name, phone, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'landlord', 'John', 'Smith', '+1234567890', null),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'tenant', 'Jane', 'Doe', '+1234567891', null)
ON CONFLICT (id) DO NOTHING;

-- Insert test property
INSERT INTO public.properties (id, landlord_id, name, address, description, total_units) VALUES
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Sunset Apartments', '123 Main St, City, State', 'Beautiful apartment complex with modern amenities', 20)
ON CONFLICT (id) DO NOTHING;

-- Insert test unit
INSERT INTO public.units (id, property_id, unit_number, type, rent_amount, deposit_amount, status, square_feet) VALUES
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '101', '1BR', 1200.00, 1200.00, 'vacant', 800)
ON CONFLICT (id) DO NOTHING;

-- Insert test application
INSERT INTO public.unit_applications (id, tenant_id, unit_id, property_id, status, application_message, reviewed_by) VALUES
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'approved', 'I am interested in renting this unit', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

-- Insert test lease
INSERT INTO public.leases (id, tenant_id, unit_id, status, start_date, end_date, rent_amount) VALUES
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'active', '2024-01-01', '2024-12-31', 1200.00)
ON CONFLICT (id) DO NOTHING;

-- 9. Create contractors table for landlord contractor management
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for contractors
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Create policies for contractors
DROP POLICY IF EXISTS "Landlords can manage their contractors" ON public.contractors;
CREATE POLICY "Landlords can manage their contractors" 
ON public.contractors 
FOR ALL 
USING (landlord_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Add trigger for updated_at on contractors
DROP TRIGGER IF EXISTS update_contractors_updated_at ON public.contractors;
CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_landlord_id ON public.contractors(landlord_id);
CREATE INDEX IF NOT EXISTS idx_contractors_specialty ON public.contractors(specialty);
CREATE INDEX IF NOT EXISTS idx_contractors_active ON public.contractors(is_active);

-- Insert test contractors data
INSERT INTO public.contractors (id, landlord_id, name, specialty, phone, email, rating, rating_count, hourly_rate, description, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'Mike Johnson', 'Plumbing', '+254 712 123 456', 'mike@example.com', 4.8, 15, 800.00, 'Experienced plumber with 10+ years in residential maintenance', true),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'Sarah Wilson', 'General Repairs', '+254 723 234 567', 'sarah@example.com', 4.9, 22, 600.00, 'General handyperson specializing in quick repairs and maintenance', true),
('550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'David Kim', 'HVAC', '+254 734 345 678', 'david@example.com', 4.7, 18, 1200.00, 'HVAC specialist with certification in modern cooling systems', true)
ON CONFLICT (id) DO NOTHING;