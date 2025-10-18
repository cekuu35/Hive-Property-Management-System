-- Fix storage RLS policies for photo uploads
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can view property photos" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can upload maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can view maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public photos" ON storage.objects;

-- Create new policies that allow uploads
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own avatar" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Landlords can upload property photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Landlords can view property photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'property-photos');

CREATE POLICY "Tenants can upload maintenance photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tenants can view maintenance photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'maintenance-photos');

-- Allow anyone to view public photos
CREATE POLICY "Anyone can view public photos" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('avatars', 'property-photos', 'maintenance-photos'));

-- Allow updates for existing files
CREATE POLICY "Users can update their own files" 
ON storage.objects FOR UPDATE 
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow deletes for own files
CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (auth.uid()::text = (storage.foldername(name))[1]);
