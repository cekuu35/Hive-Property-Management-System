-- Simplified migration for messaging and maintenance request access
-- Breaking into essential components to avoid deadlocks

-- 1. Create function to get tenant's landlord for messaging
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

-- 2. Create function to get landlord's tenants for messaging
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