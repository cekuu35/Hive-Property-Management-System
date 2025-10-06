-- Enhance tenant workflow with proper relationships and auth integration

-- First, let's ensure we have a proper landlords table structure
-- The profiles table already exists, but let's add any missing fields for landlords
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update tenant_info table to include auth_user_id and improve structure
ALTER TABLE tenant_info 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create a proper tenants table that links to both profiles and tenant_info
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_info_id UUID NOT NULL REFERENCES tenant_info(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  rent_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  security_deposit DECIMAL(10,2) NOT NULL DEFAULT 0,
  lease_start_date DATE,
  lease_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'terminated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique tenant per landlord
  UNIQUE(landlord_id, tenant_info_id),
  -- Ensure unique auth user
  UNIQUE(auth_user_id)
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenants table
CREATE POLICY "Landlords can manage their tenants" 
ON tenants 
FOR ALL 
USING (landlord_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Tenants can view their own record" 
ON tenants 
FOR SELECT 
USING (auth_user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_landlord_id ON tenants(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenants_auth_user_id ON tenants(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_info_id ON tenants(tenant_info_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Add trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to automatically create tenant with auth user
CREATE OR REPLACE FUNCTION create_tenant_with_auth(
  p_landlord_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_unit_id UUID DEFAULT NULL,
  p_rent_amount DECIMAL DEFAULT 0,
  p_security_deposit DECIMAL DEFAULT 0,
  p_lease_start_date DATE DEFAULT NULL,
  p_lease_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_info_id UUID;
  v_auth_user_id UUID;
  v_tenant_id UUID;
  v_password TEXT;
  v_result JSON;
BEGIN
  -- Generate a random password
  v_password := encode(gen_random_bytes(12), 'base64');
  
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_auth_user_id;
  
  -- Create tenant_info record
  INSERT INTO tenant_info (
    landlord_id,
    first_name,
    last_name,
    email,
    phone,
    auth_user_id,
    tenant_status,
    current_balance,
    payment_status
  ) VALUES (
    p_landlord_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    v_auth_user_id,
    'active',
    0,
    'unpaid'
  ) RETURNING id INTO v_tenant_info_id;
  
  -- Create tenant record
  INSERT INTO tenants (
    landlord_id,
    tenant_info_id,
    auth_user_id,
    unit_id,
    rent_amount,
    security_deposit,
    lease_start_date,
    lease_end_date,
    status
  ) VALUES (
    p_landlord_id,
    v_tenant_info_id,
    v_auth_user_id,
    p_unit_id,
    p_rent_amount,
    p_security_deposit,
    p_lease_start_date,
    p_lease_end_date,
    'active'
  ) RETURNING id INTO v_tenant_id;
  
  -- Return result with password for emailing
  v_result := json_build_object(
    'tenant_id', v_tenant_id,
    'auth_user_id', v_auth_user_id,
    'tenant_info_id', v_tenant_info_id,
    'password', v_password,
    'email', p_email,
    'success', true
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Clean up on error
    IF v_auth_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_auth_user_id;
    END IF;
    IF v_tenant_info_id IS NOT NULL THEN
      DELETE FROM tenant_info WHERE id = v_tenant_info_id;
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create a function to get tenant by auth user
CREATE OR REPLACE FUNCTION get_tenant_by_auth_user(p_auth_user_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  landlord_id UUID,
  tenant_info_id UUID,
  unit_id UUID,
  rent_amount DECIMAL,
  security_deposit DECIMAL,
  status TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  unit_number TEXT,
  property_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    t.landlord_id,
    t.tenant_info_id,
    t.unit_id,
    t.rent_amount,
    t.security_deposit,
    t.status,
    ti.first_name,
    ti.last_name,
    ti.email,
    ti.phone,
    u.unit_number,
    p.name as property_name
  FROM tenants t
  JOIN tenant_info ti ON t.tenant_info_id = ti.id
  LEFT JOIN units u ON t.unit_id = u.id
  LEFT JOIN properties p ON u.property_id = p.id
  WHERE t.auth_user_id = p_auth_user_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_tenant_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_by_auth_user TO authenticated;
