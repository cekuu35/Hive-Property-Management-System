-- Create storage buckets for property and unit images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Create RLS policies for property images storage
CREATE POLICY "Property owners can upload images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-images' AND 
  auth.uid() IN (
    SELECT pr.user_id FROM profiles pr 
    JOIN properties p ON p.landlord_id = pr.id 
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

CREATE POLICY "Property images are viewable by owners and tenants" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-images' AND (
    auth.uid() IN (
      SELECT pr.user_id FROM profiles pr 
      JOIN properties p ON p.landlord_id = pr.id 
      WHERE (storage.foldername(name))[1] = p.id::text
    ) OR
    auth.uid() IN (
      SELECT pr.user_id FROM profiles pr 
      JOIN leases l ON l.tenant_id = pr.id 
      JOIN units u ON l.unit_id = u.id 
      WHERE (storage.foldername(name))[1] = u.property_id::text AND l.status = 'active'
    )
  )
);

CREATE POLICY "Property owners can update their images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-images' AND 
  auth.uid() IN (
    SELECT pr.user_id FROM profiles pr 
    JOIN properties p ON p.landlord_id = pr.id 
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

CREATE POLICY "Property owners can delete their images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-images' AND 
  auth.uid() IN (
    SELECT pr.user_id FROM profiles pr 
    JOIN properties p ON p.landlord_id = pr.id 
    WHERE (storage.foldername(name))[1] = p.id::text
  )
);

-- Enable INSERT and UPDATE for properties table for landlords
CREATE POLICY "Landlords can insert properties" 
ON properties 
FOR INSERT 
WITH CHECK (landlord_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can update their properties" 
ON properties 
FOR UPDATE 
USING (landlord_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Enable INSERT and UPDATE for units table for landlords
CREATE POLICY "Landlords can insert units" 
ON units 
FOR INSERT 
WITH CHECK (
  property_id IN (
    SELECT p.id FROM properties p 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can update units" 
ON units 
FOR UPDATE 
USING (
  property_id IN (
    SELECT p.id FROM properties p 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can delete units" 
ON units 
FOR DELETE 
USING (
  property_id IN (
    SELECT p.id FROM properties p 
    JOIN profiles pr ON p.landlord_id = pr.id 
    WHERE pr.user_id = auth.uid()
  )
);