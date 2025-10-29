-- Enhance the get_tenant_landlord function to include contact details
CREATE OR REPLACE FUNCTION public.get_tenant_landlord(tenant_profile_id UUID)
RETURNS TABLE (
  landlord_id UUID,
  landlord_first_name TEXT,
  landlord_last_name TEXT,
  landlord_avatar_url TEXT,
  landlord_email TEXT,
  landlord_phone TEXT,
  landlord_company_name TEXT,
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
    p.email as landlord_email,
    p.phone as landlord_phone,
    p.company_name as landlord_company_name,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_landlord TO authenticated;

