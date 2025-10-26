-- Add Profile Fields and Storage Bucket
-- Run this to enable profile completion features

-- ============================================
-- 1. Add missing columns to profiles table
-- ============================================

-- Check which columns exist first
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Add columns if they don't exist (run these one by one, ignore errors if column exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============================================
-- 2. Create storage bucket for profile avatars
-- ============================================

-- Create profile-avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Set up RLS policies for storage
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow everyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

-- ============================================
-- 4. Update landlords trigger to include new fields
-- ============================================

CREATE OR REPLACE FUNCTION sync_landlord_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, first_name, last_name, phone_number, created_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    'landlord', 
    SPLIT_PART(NEW.name, ' ', 1),
    NULLIF(SUBSTRING(NEW.name FROM POSITION(' ' IN NEW.name) + 1), ''),
    NEW.phone,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    -- Don't overwrite these fields if they already exist
    address = COALESCE(profiles.address, EXCLUDED.address),
    city = COALESCE(profiles.city, EXCLUDED.city),
    company_name = COALESCE(profiles.company_name, EXCLUDED.company_name),
    bio = COALESCE(profiles.bio, EXCLUDED.bio),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Verify everything is set up
-- ============================================

-- Check profile columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('avatar_url', 'address', 'city', 'company_name', 'bio')
ORDER BY column_name;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'profile-avatars';

-- Check storage policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE '%avatar%';

-- Expected output:
-- ✅ 5 columns should be listed (avatar_url, address, bio, city, company_name)
-- ✅ profile-avatars bucket should exist with public = true
-- ✅ 4 policies should be listed for avatar operations

