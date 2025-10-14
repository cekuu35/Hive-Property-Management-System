-- Create staff_assignments table to manage property assignments for security and caretaker staff
CREATE TABLE public.staff_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('security', 'caretaker')),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, property_id, role)
);

-- Enable RLS
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for staff_assignments
CREATE POLICY "Landlords can manage staff assignments for their properties" 
ON public.staff_assignments 
FOR ALL 
USING (
  property_id IN (
    SELECT p.id FROM public.properties p 
    JOIN public.profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view their own assignments" 
ON public.staff_assignments 
FOR SELECT 
USING (
  staff_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_staff_assignments_staff_id ON public.staff_assignments(staff_id);
CREATE INDEX idx_staff_assignments_property_id ON public.staff_assignments(property_id);
CREATE INDEX idx_staff_assignments_role ON public.staff_assignments(role);
CREATE INDEX idx_staff_assignments_active ON public.staff_assignments(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_staff_assignments_updated_at
  BEFORE UPDATE ON public.staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create staff member with property assignment
CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_landlord_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_role TEXT,
  p_property_ids UUID[],
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_profile_id UUID;
  v_password TEXT;
  v_property_id UUID;
  v_result JSONB;
BEGIN
  -- Validate role
  IF p_role NOT IN ('security', 'caretaker') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role. Must be security or caretaker.'
    );
  END IF;

  -- Generate random password
  v_password := substring(md5(random()::text) from 1 for 12) || 'A1!';

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
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at,
    app_metadata,
    user_metadata,
    is_sso_user,
    deleted_at
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
    '{}',
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', p_role
    ),
    false,
    now(),
    '{}',
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', p_role
    ),
    false,
    null
  ) RETURNING id INTO v_auth_user_id;

  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    role,
    first_name,
    last_name,
    phone
  ) VALUES (
    v_auth_user_id,
    p_role,
    p_first_name,
    p_last_name,
    p_phone
  ) RETURNING id INTO v_profile_id;

  -- Create property assignments
  FOREACH v_property_id IN ARRAY p_property_ids
  LOOP
    INSERT INTO public.staff_assignments (
      staff_id,
      property_id,
      role,
      assigned_by,
      notes
    ) VALUES (
      v_profile_id,
      v_property_id,
      p_role,
      p_landlord_id,
      p_notes
    );
  END LOOP;

  -- Return success with credentials
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'auth_user_id', v_auth_user_id,
    'email', p_email,
    'password', v_password,
    'role', p_role,
    'assigned_properties', p_property_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Clean up auth user if profile creation fails
    IF v_auth_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_auth_user_id;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

