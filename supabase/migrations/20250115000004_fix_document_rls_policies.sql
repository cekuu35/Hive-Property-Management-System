-- Fix RLS policies for document access

-- 1. Fix the property_notices policy for tenants
DROP POLICY IF EXISTS "Tenants can view notices for their units" ON property_notices;

CREATE POLICY "Tenants can view notices for their units" 
ON property_notices 
FOR SELECT 
USING (
  is_active = true AND
  (unit_id IS NULL OR unit_id IN (
    SELECT l.unit_id 
    FROM leases l
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    JOIN profiles pr ON ti.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND l.status = 'active'
  ))
);

-- 2. Add RLS policy for tenants to view properties (for policies_documents)
CREATE POLICY "Tenants can view properties they lease from" 
ON properties 
FOR SELECT 
USING (
  id IN (
    SELECT DISTINCT u.property_id
    FROM units u
    JOIN leases l ON u.id = l.unit_id
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    JOIN profiles pr ON ti.profile_id = pr.id
    WHERE pr.user_id = auth.uid() AND l.status = 'active'
  )
);

-- 3. Add RLS policy for tenants to view storage objects (property documents)
CREATE POLICY "Tenants can view property documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-documents' AND
  EXISTS (
    SELECT 1
    FROM properties p
    JOIN units u ON p.id = u.property_id
    JOIN leases l ON u.id = l.unit_id
    JOIN tenant_info ti ON l.tenant_info_id = ti.id
    JOIN profiles pr ON ti.profile_id = pr.id
    WHERE pr.user_id = auth.uid() 
    AND l.status = 'active'
    AND (storage.foldername(name))[2] = p.id::text
  )
);

