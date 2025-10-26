-- ============================================
-- COMPLETE SETUP - CLEAN VERSION
-- Drops existing policies before creating new ones
-- ============================================

-- Add Profile Columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Sync Landlords to Profiles (ONLY if they have auth.users record)
INSERT INTO profiles (id, user_id, email, role, first_name, last_name, phone, created_at)
SELECT 
  l.id, l.id as user_id, l.email, 'landlord',
  SPLIT_PART(l.name, ' ', 1),
  NULLIF(SUBSTRING(l.name FROM POSITION(' ' IN l.name) + 1), ''),
  l.phone, l.created_at
FROM landlords l
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = l.id)
AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = l.id);

-- Fix Subscription RLS Policies
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
CREATE POLICY "Landlords can view their own subscriptions"
ON landlord_subscriptions FOR SELECT TO authenticated USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Landlords can create their own subscriptions" ON landlord_subscriptions;
CREATE POLICY "Landlords can create their own subscriptions"
ON landlord_subscriptions FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;
CREATE POLICY "Landlords can update their own subscriptions"
ON landlord_subscriptions FOR UPDATE TO authenticated
USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing storage policies for profile-avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;

-- Create NEW storage policies
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-avatars')
WITH CHECK (bucket_id = 'profile-avatars');

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-avatars');

-- Auto-Sync Trigger
CREATE OR REPLACE FUNCTION sync_landlord_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    INSERT INTO profiles (id, user_id, email, role, first_name, last_name, phone, created_at)
    VALUES (
      NEW.id, NEW.id, NEW.email, 'landlord',
      SPLIT_PART(NEW.name, ' ', 1),
      NULLIF(SUBSTRING(NEW.name FROM POSITION(' ' IN NEW.name) + 1), ''),
      NEW.phone, NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name, phone = EXCLUDED.phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_landlord_to_profile_trigger ON landlords;
CREATE TRIGGER sync_landlord_to_profile_trigger
AFTER INSERT OR UPDATE ON landlords
FOR EACH ROW EXECUTE FUNCTION sync_landlord_to_profile();

-- DONE! Verify with these queries:

SELECT 'Landlords Synced' as status, COUNT(*) 
FROM landlords l INNER JOIN profiles p ON l.id = p.id
UNION ALL
SELECT 'Landlords Skipped (No Auth)', COUNT(*) 
FROM landlords l LEFT JOIN auth.users u ON l.id = u.id WHERE u.id IS NULL;

