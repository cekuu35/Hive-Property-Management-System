-- Complete SQL script to fix Supabase backend integration
-- Apply this in your Supabase SQL Editor: https://supabase.com/dashboard/project/kozhlejudselgtmohdfm/sql

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

-- 7. Fix RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- 8. Fix RLS policies for messages table
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;

CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT USING (
  sender_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  ) OR
  receiver_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  sender_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (
  receiver_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

-- 9. Fix RLS policies for properties table
DROP POLICY IF EXISTS "Landlords can manage their properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by authenticated users for browsing" ON public.properties;

CREATE POLICY "Landlords can manage their properties" ON public.properties FOR ALL USING (
  landlord_id IN (
    SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Properties are viewable by authenticated users for browsing" ON public.properties FOR SELECT USING (true);

-- 10. Fix RLS policies for units table
DROP POLICY IF EXISTS "Landlords can manage units for their properties" ON public.units;
DROP POLICY IF EXISTS "Units are viewable by authenticated users for browsing" ON public.units;

CREATE POLICY "Landlords can manage units for their properties" ON public.units FOR ALL USING (
  property_id IN (
    SELECT p.id FROM properties p 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Units are viewable by authenticated users for browsing" ON public.units FOR SELECT USING (true);

-- 11. Fix RLS policies for unit_applications table
DROP POLICY IF EXISTS "Tenants can view their own applications" ON public.unit_applications;
DROP POLICY IF EXISTS "Tenants can create applications" ON public.unit_applications;
DROP POLICY IF EXISTS "Tenants can update their pending applications" ON public.unit_applications;
DROP POLICY IF EXISTS "Landlords can view applications for their properties" ON public.unit_applications;
DROP POLICY IF EXISTS "Landlords can update applications for their properties" ON public.unit_applications;

CREATE POLICY "Tenants can view their own applications" ON public.unit_applications FOR SELECT USING (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Tenants can create applications" ON public.unit_applications FOR INSERT WITH CHECK (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Tenants can update their pending applications" ON public.unit_applications FOR UPDATE USING (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND status = 'pending'
);

CREATE POLICY "Landlords can view applications for their properties" ON public.unit_applications FOR SELECT USING (
  property_id IN (
    SELECT p.id FROM properties p 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can update applications for their properties" ON public.unit_applications FOR UPDATE USING (
  property_id IN (
    SELECT p.id FROM properties p 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

-- 12. Fix RLS policies for leases table
DROP POLICY IF EXISTS "Landlords can manage leases for their properties" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their own leases" ON public.leases;

CREATE POLICY "Landlords can manage leases for their properties" ON public.leases FOR ALL USING (
  unit_id IN (
    SELECT u.id FROM units u 
    JOIN properties p ON u.property_id = p.id 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view their own leases" ON public.leases FOR SELECT USING (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- 13. Fix RLS policies for notifications table
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 15. Create test data (this will work after RLS policies are fixed)
INSERT INTO public.profiles (id, user_id, role, first_name, last_name, phone) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'landlord', 'John', 'Smith', '+1234567890'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'tenant', 'Jane', 'Doe', '+1234567891')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.properties (id, landlord_id, name, address, description, total_units) VALUES
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Sunset Apartments', '123 Main St, City, State', 'Beautiful apartment complex with modern amenities', 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.units (id, property_id, unit_number, type, rent_amount, deposit_amount, status, square_feet) VALUES
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '101', '1BR', 1200.00, 1200.00, 'occupied', 800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.unit_applications (id, tenant_id, unit_id, property_id, status, application_message, reviewed_by) VALUES
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'approved', 'I am interested in renting this unit', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leases (id, tenant_id, unit_id, status, start_date, end_date, rent_amount) VALUES
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'active', '2024-01-01', '2024-12-31', 1200.00)
ON CONFLICT (id) DO NOTHING;
