-- Add fields for property policies and documents
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS policies_documents jsonb DEFAULT '[]'::jsonb;

-- Create property notices table for public notices
CREATE TABLE IF NOT EXISTS property_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL,
  unit_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  landlord_id uuid NOT NULL
);

-- Enable RLS on property_notices
ALTER TABLE property_notices ENABLE ROW LEVEL SECURITY;

-- Create policies for property notices
CREATE POLICY "Landlords can manage their property notices" 
ON property_notices 
FOR ALL 
USING (landlord_id IN (
  SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()
));

-- Create policy for tenants to view notices for their units
CREATE POLICY "Tenants can view notices for their units" 
ON property_notices 
FOR SELECT 
USING (
  is_active = true AND
  (unit_id IS NULL OR unit_id IN (
    SELECT l.unit_id 
    FROM leases l
    JOIN profiles pr ON l.tenant_id = pr.id
    WHERE pr.user_id = auth.uid() AND l.status = 'active'
  ))
);

-- Create storage bucket for property documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for property documents
CREATE POLICY "Landlords can upload property documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Landlords can view their property documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'property-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Landlords can update their property documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'property-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Landlords can delete their property documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'property-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_property_notices_updated_at
BEFORE UPDATE ON property_notices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();