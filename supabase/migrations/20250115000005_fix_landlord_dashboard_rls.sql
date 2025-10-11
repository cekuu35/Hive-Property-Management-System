-- Fix RLS policies for landlord dashboard data access

-- 1. Fix rent_payments access for landlords
DROP POLICY IF EXISTS "Landlords can view rent payments for their properties" ON rent_payments;

CREATE POLICY "Landlords can view rent payments for their properties" 
ON rent_payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid() 
    AND l.id = rent_payments.lease_id
  )
);

-- 2. Fix units access for landlords
DROP POLICY IF EXISTS "Landlords can view units for their properties" ON units;

CREATE POLICY "Landlords can view units for their properties" 
ON units 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM properties p
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid() 
    AND p.id = units.property_id
  )
);

-- 3. Fix properties access for landlords
DROP POLICY IF EXISTS "Landlords can view their own properties" ON properties;

CREATE POLICY "Landlords can view their own properties" 
ON properties 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles pr
    WHERE pr.user_id = auth.uid() 
    AND pr.id = properties.landlord_id
  )
);

-- 4. Fix leases access for landlords
DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON leases;

CREATE POLICY "Landlords can view leases for their properties" 
ON leases 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid() 
    AND u.id = leases.unit_id
  )
);

-- 5. Fix maintenance_requests access for landlords
DROP POLICY IF EXISTS "Landlords can view maintenance requests for their properties" ON maintenance_requests;

CREATE POLICY "Landlords can view maintenance requests for their properties" 
ON maintenance_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid() 
    AND u.id = maintenance_requests.unit_id
  )
);

