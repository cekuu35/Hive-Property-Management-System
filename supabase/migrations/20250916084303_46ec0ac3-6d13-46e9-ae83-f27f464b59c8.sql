-- Fix security vulnerability: Restrict profile visibility to authorized users only

-- First, drop the overly permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create more secure policies for profile access

-- 1. Landlords can view profiles of their tenants (through active leases)
CREATE POLICY "Landlords can view their tenants profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT l.tenant_id 
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles landlord_profile ON p.landlord_id = landlord_profile.id
    WHERE landlord_profile.user_id = auth.uid()
    AND l.status = 'active'
  )
);

-- 2. Tenants can view their landlord's profile (through their active lease)
CREATE POLICY "Tenants can view their landlords profile" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT p.landlord_id 
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles tenant_profile ON l.tenant_id = tenant_profile.id
    WHERE tenant_profile.user_id = auth.uid()
    AND l.status = 'active'
  )
);

-- 3. Caretakers and security can view profiles of people in properties they work on
-- (This would require additional tables to track which properties caretakers/security are assigned to)
-- For now, we'll allow them to see profiles related to maintenance requests they're assigned to
CREATE POLICY "Caretakers can view profiles for assigned work" 
ON public.profiles 
FOR SELECT 
USING (
  (role = 'caretaker' AND auth.uid() = user_id) OR
  (role = 'security' AND auth.uid() = user_id) OR
  id IN (
    SELECT mr.tenant_id 
    FROM maintenance_requests mr
    JOIN profiles caretaker_profile ON mr.assigned_to = caretaker_profile.id
    WHERE caretaker_profile.user_id = auth.uid()
  )
);

-- 4. Allow viewing profiles involved in maintenance requests (for coordination)
CREATE POLICY "Users can view profiles in shared maintenance requests" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    -- Tenant can see assigned caretaker's profile
    SELECT mr.assigned_to 
    FROM maintenance_requests mr
    JOIN profiles tenant_profile ON mr.tenant_id = tenant_profile.id
    WHERE tenant_profile.user_id = auth.uid()
    AND mr.assigned_to IS NOT NULL
  ) OR
  id IN (
    -- Landlord can see tenant's profile for maintenance requests in their properties
    SELECT mr.tenant_id 
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles landlord_profile ON p.landlord_id = landlord_profile.id
    WHERE landlord_profile.user_id = auth.uid()
  )
);