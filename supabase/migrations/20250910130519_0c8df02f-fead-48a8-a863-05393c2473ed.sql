-- Enable INSERT operations for maintenance_requests table
-- Users can create maintenance requests for their own tenancy or if they are landlords for their properties

CREATE POLICY "Tenants can create maintenance requests for their units" 
ON public.maintenance_requests 
FOR INSERT 
WITH CHECK (
  tenant_id IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
  OR 
  unit_id IN (
    SELECT u.id 
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Enable UPDATE operations for maintenance requests
-- Users can update requests they created or if they are landlords/assigned staff
CREATE POLICY "Users can update relevant maintenance requests" 
ON public.maintenance_requests 
FOR UPDATE 
USING (
  tenant_id IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
  OR 
  assigned_to IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
  OR 
  unit_id IN (
    SELECT u.id 
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);