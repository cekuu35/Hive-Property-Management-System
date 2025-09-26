-- SQL Script to apply database modifications in Supabase SQL Editor
-- Copy and paste this into your Supabase SQL Editor at: https://supabase.com/dashboard/project/kozhlejudselgtmohdfm/sql

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

-- 7. Create function to get tenant's landlord
CREATE OR REPLACE FUNCTION public.get_tenant_landlord(tenant_profile_id UUID)
RETURNS TABLE (
  landlord_id UUID,
  landlord_first_name TEXT,
  landlord_last_name TEXT,
  landlord_avatar_url TEXT,
  property_name TEXT,
  unit_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as landlord_id,
    p.first_name as landlord_first_name,
    p.last_name as landlord_last_name,
    p.avatar_url as landlord_avatar_url,
    prop.name as property_name,
    u.unit_number
  FROM public.leases l
  JOIN public.units u ON l.unit_id = u.id
  JOIN public.properties prop ON u.property_id = prop.id
  JOIN public.profiles p ON prop.landlord_id = p.id
  WHERE (l.tenant_id = tenant_profile_id OR l.tenant_info_id IN (
    SELECT id FROM public.tenant_info WHERE profile_id = tenant_profile_id
  ))
  AND l.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create function to get landlord's tenants
CREATE OR REPLACE FUNCTION public.get_landlord_tenants(landlord_profile_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_first_name TEXT,
  tenant_last_name TEXT,
  tenant_avatar_url TEXT,
  property_name TEXT,
  unit_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as tenant_id,
    p.first_name as tenant_first_name,
    p.last_name as tenant_last_name,
    p.avatar_url as tenant_avatar_url,
    prop.name as property_name,
    u.unit_number
  FROM public.leases l
  JOIN public.units u ON l.unit_id = u.id
  JOIN public.properties prop ON u.property_id = prop.id
  JOIN public.profiles p ON l.tenant_id = p.id
  WHERE prop.landlord_id = landlord_profile_id
  AND l.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
