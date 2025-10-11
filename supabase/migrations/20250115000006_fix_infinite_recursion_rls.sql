-- Fix infinite recursion in RLS policies

-- 1. Drop all problematic policies first
DROP POLICY IF EXISTS "Landlords can view rent payments for their properties" ON rent_payments;
DROP POLICY IF EXISTS "Landlords can view units for their properties" ON units;
DROP POLICY IF EXISTS "Landlords can view their own properties" ON properties;
DROP POLICY IF EXISTS "Landlords can view leases for their properties" ON leases;
DROP POLICY IF EXISTS "Landlords can view maintenance requests for their properties" ON maintenance_requests;

-- 2. Create simple, non-recursive policies

-- Properties: Simple landlord check
CREATE POLICY "Landlords can view their own properties" 
ON properties 
FOR SELECT 
USING (landlord_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Units: Simple property ownership check
CREATE POLICY "Landlords can view units for their properties" 
ON units 
FOR SELECT 
USING (property_id IN (
  SELECT id FROM properties WHERE landlord_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
));

-- Leases: Simple unit ownership check
CREATE POLICY "Landlords can view leases for their properties" 
ON leases 
FOR SELECT 
USING (unit_id IN (
  SELECT id FROM units WHERE property_id IN (
    SELECT id FROM properties WHERE landlord_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
));

-- Rent payments: Simple lease ownership check
CREATE POLICY "Landlords can view rent payments for their properties" 
ON rent_payments 
FOR SELECT 
USING (lease_id IN (
  SELECT id FROM leases WHERE unit_id IN (
    SELECT id FROM units WHERE property_id IN (
      SELECT id FROM properties WHERE landlord_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  )
));

-- Maintenance requests: Simple unit ownership check
CREATE POLICY "Landlords can view maintenance requests for their properties" 
ON maintenance_requests 
FOR SELECT 
USING (unit_id IN (
  SELECT id FROM units WHERE property_id IN (
    SELECT id FROM properties WHERE landlord_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
));

