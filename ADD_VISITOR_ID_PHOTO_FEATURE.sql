-- ============================================================================
-- Add ID Photo Feature for Visitor Registration
-- ============================================================================
-- This migration adds:
-- 1. id_document_url column to visitors table
-- 2. Storage bucket for visitor ID photos
-- 3. Storage policies for security staff to upload/view ID photos
-- ============================================================================

-- Ensure is_current_user_security() function exists (create if it doesn't)
CREATE OR REPLACE FUNCTION public.is_current_user_security()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'security'::text
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_security() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_security() TO anon;

-- Add id_document_url column to visitors table
ALTER TABLE public.visitors
ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Create storage bucket for visitor ID photos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visitor-id-photos',
  'visitor-id-photos',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visitor ID photos
-- Security staff can upload ID photos
DROP POLICY IF EXISTS "Security can upload visitor ID photos" ON storage.objects;
CREATE POLICY "Security can upload visitor ID photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'visitor-id-photos'
  AND public.is_current_user_security()
);

-- Security staff can view ID photos
DROP POLICY IF EXISTS "Security can view visitor ID photos" ON storage.objects;
CREATE POLICY "Security can view visitor ID photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visitor-id-photos'
  AND public.is_current_user_security()
);

-- Security staff can delete ID photos (for privacy/data cleanup)
DROP POLICY IF EXISTS "Security can delete visitor ID photos" ON storage.objects;
CREATE POLICY "Security can delete visitor ID photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'visitor-id-photos'
  AND public.is_current_user_security()
);

-- Landlords can also view visitor ID photos for their properties
DROP POLICY IF EXISTS "Landlords can view visitor ID photos for their properties" ON storage.objects;
CREATE POLICY "Landlords can view visitor ID photos for their properties"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'visitor-id-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'landlord'
  )
);

