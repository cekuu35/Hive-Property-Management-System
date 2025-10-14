-- Setup Storage Policies for Photo Upload System
-- This migration creates comprehensive RLS policies for all storage buckets

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
DECLARE
    policy_name TEXT;
    policy_names TEXT[] := ARRAY[
        'Users can upload their own avatar',
        'Users can view their own avatar',
        'Users can update their own avatar',
        'Users can delete their own avatar',
        'Landlords can upload property photos',
        'Landlords can view property photos',
        'Landlords can update property photos',
        'Landlords can delete property photos',
        'Landlords can upload unit photos',
        'Landlords can view unit photos',
        'Landlords can update unit photos',
        'Landlords can delete unit photos',
        'Tenants can upload maintenance photos',
        'Tenants can view maintenance photos',
        'Tenants can update maintenance photos',
        'Tenants can delete maintenance photos',
        'Landlords can view maintenance photos',
        'Landlords can upload documents',
        'Landlords can view documents',
        'Landlords can update documents',
        'Landlords can delete documents',
        'Tenants can view documents',
        'Public can view avatars',
        'Public can view property photos',
        'Public can view unit photos',
        'Public can view maintenance photos',
        'Public can view documents'
    ];
BEGIN
    FOREACH policy_name IN ARRAY policy_names
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    END LOOP;
END $$;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('property-photos', 'property-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('unit-photos', 'unit-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('maintenance-photos', 'maintenance-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('documents', 'documents', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- AVATARS BUCKET POLICIES
-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view their own avatar
CREATE POLICY "Users can view their own avatar" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Public can view avatars (for cross-visibility)
CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- PROPERTY PHOTOS BUCKET POLICIES
-- Landlords can upload property photos
CREATE POLICY "Landlords can upload property photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'property-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can view property photos
CREATE POLICY "Landlords can view property photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'property-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can update property photos
CREATE POLICY "Landlords can update property photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'property-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can delete property photos
CREATE POLICY "Landlords can delete property photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'property-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Public can view property photos
CREATE POLICY "Public can view property photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'property-photos');

-- UNIT PHOTOS BUCKET POLICIES
-- Landlords can upload unit photos
CREATE POLICY "Landlords can upload unit photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'unit-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can view unit photos
CREATE POLICY "Landlords can view unit photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'unit-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can update unit photos
CREATE POLICY "Landlords can update unit photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'unit-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can delete unit photos
CREATE POLICY "Landlords can delete unit photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'unit-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Public can view unit photos
CREATE POLICY "Public can view unit photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'unit-photos');

-- MAINTENANCE PHOTOS BUCKET POLICIES
-- Tenants can upload maintenance photos
CREATE POLICY "Tenants can upload maintenance photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'maintenance-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'tenant'
        )
    );

-- Tenants can view maintenance photos
CREATE POLICY "Tenants can view maintenance photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'maintenance-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'tenant'
        )
    );

-- Tenants can update maintenance photos
CREATE POLICY "Tenants can update maintenance photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'maintenance-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'tenant'
        )
    );

-- Tenants can delete maintenance photos
CREATE POLICY "Tenants can delete maintenance photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'maintenance-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'tenant'
        )
    );

-- Landlords can view maintenance photos (for cross-visibility)
CREATE POLICY "Landlords can view maintenance photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'maintenance-photos' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Public can view maintenance photos
CREATE POLICY "Public can view maintenance photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'maintenance-photos');

-- DOCUMENTS BUCKET POLICIES
-- Landlords can upload documents
CREATE POLICY "Landlords can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can view documents
CREATE POLICY "Landlords can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can update documents
CREATE POLICY "Landlords can update documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Landlords can delete documents
CREATE POLICY "Landlords can delete documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'landlord'
        )
    );

-- Tenants can view documents (for lease documents, etc.)
CREATE POLICY "Tenants can view documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'tenant'
        )
    );

-- Public can view documents
CREATE POLICY "Public can view documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
