-- Fix Profiles Table and Sync with Landlords
-- Run this step by step

-- ============================================
-- STEP 1: Check current profiles table structure
-- ============================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: Add ALL missing columns to profiles table
-- ============================================

-- Basic columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Profile completion columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- ============================================
-- STEP 3: Now sync landlords to profiles with correct columns
-- ============================================

INSERT INTO profiles (id, email, role, first_name, last_name, phone, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  SPLIT_PART(l.name, ' ', 1) as first_name,
  NULLIF(SUBSTRING(l.name FROM POSITION(' ' IN l.name) + 1), '') as last_name,
  l.phone,
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);

-- ============================================
-- STEP 4: Fix RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Landlords can view their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can create their own subscriptions" ON landlord_subscriptions;
DROP POLICY IF EXISTS "Landlords can update their own subscriptions" ON landlord_subscriptions;

CREATE POLICY "Landlords can view their own subscriptions"
ON landlord_subscriptions FOR SELECT TO authenticated USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can create their own subscriptions"
ON landlord_subscriptions FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can update their own subscriptions"
ON landlord_subscriptions FOR UPDATE TO authenticated
USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());

-- ============================================
-- STEP 5: Update the sync trigger with correct columns
-- ============================================

CREATE OR REPLACE FUNCTION sync_landlord_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, first_name, last_name, phone, created_at)
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
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_landlord_to_profile_trigger ON landlords;
CREATE TRIGGER sync_landlord_to_profile_trigger
AFTER INSERT OR UPDATE ON landlords
FOR EACH ROW
EXECUTE FUNCTION sync_landlord_to_profile();

-- ============================================
-- STEP 6: Verify everything worked
-- ============================================

-- Check profiles table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('phone', 'phone_number', 'avatar_url', 'address', 'city', 'company_name', 'bio', 'first_name', 'last_name')
ORDER BY column_name;

-- Verify sync worked
SELECT 
  'Total Landlords' as metric, COUNT(*) as count FROM landlords
UNION ALL
SELECT 
  'Landlords with Profiles', COUNT(*) FROM landlords l INNER JOIN profiles p ON l.id = p.id
UNION ALL
SELECT 
  'Landlords WITHOUT Profiles', COUNT(*) FROM landlords l LEFT JOIN profiles p ON l.id = p.id WHERE p.id IS NULL;

-- Check a sample
SELECT 
  l.name as landlord_name,
  p.first_name,
  p.last_name,
  p.phone,
  p.email
FROM landlords l
LEFT JOIN profiles p ON l.id = p.id
LIMIT 5;

