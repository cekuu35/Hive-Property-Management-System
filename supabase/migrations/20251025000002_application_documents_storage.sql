-- Create storage bucket for application documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tenants can upload application documents" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can view own application documents" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can view application documents" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can update own application documents" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can delete own application documents" ON storage.objects;

-- Policy: Tenants can upload their own application documents
CREATE POLICY "Tenants can upload application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Tenants can view their own application documents
CREATE POLICY "Tenants can view own application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Landlords can view application documents for their properties
CREATE POLICY "Landlords can view application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents' AND
  EXISTS (
    SELECT 1
    FROM unit_applications ua
    JOIN profiles p ON ua.tenant_id = p.id
    JOIN properties prop ON ua.property_id = prop.id
    JOIN profiles landlord_p ON prop.landlord_id = landlord_p.id
    WHERE landlord_p.user_id = auth.uid()
    AND (storage.foldername(name))[1] = p.user_id::text
  )
);

-- Policy: Tenants can update their own application documents
CREATE POLICY "Tenants can update own application documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'application-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Tenants can delete their own application documents
CREATE POLICY "Tenants can delete own application documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
