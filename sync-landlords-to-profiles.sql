-- Sync Existing Landlords to Profiles Table
-- This creates profile records for all existing landlords

-- ============================================
-- 1. Check existing landlords structure
-- ============================================
-- Run this first to see what data you have
SELECT 
  id,
  email,
  first_name,
  last_name,
  phone_number,
  created_at
FROM landlords
ORDER BY created_at DESC;

-- ============================================
-- 2. Create profiles for all existing landlords
-- ============================================
-- This inserts profile records for any landlords that don't have one

INSERT INTO profiles (id, email, role, first_name, last_name, phone_number, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  l.first_name,
  l.last_name,
  l.phone_number,
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);

-- ============================================
-- 3. Verify the sync worked
-- ============================================
-- Check that all landlords now have profiles
SELECT 
  l.id,
  l.email,
  l.first_name || ' ' || l.last_name as landlord_name,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Has Profile'
    ELSE '❌ Missing Profile'
  END as profile_status
FROM landlords l
LEFT JOIN profiles p ON l.id = p.id
ORDER BY l.created_at DESC;

-- ============================================
-- 4. Fix RLS Policies for Subscription System
-- ============================================

-- subscription_plans - Allow everyone to read
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans FOR SELECT TO public USING (true);

-- landlord_subscriptions - Landlords manage their own
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
-- 5. Create auto-sync trigger (optional but recommended)
-- ============================================
-- This automatically creates a profile when a new landlord is added

CREATE OR REPLACE FUNCTION sync_landlord_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, first_name, last_name, phone_number, created_at)
  VALUES (NEW.id, NEW.email, 'landlord', NEW.first_name, NEW.last_name, NEW.phone_number, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_landlord_to_profile_trigger ON landlords;
CREATE TRIGGER sync_landlord_to_profile_trigger
AFTER INSERT OR UPDATE ON landlords
FOR EACH ROW
EXECUTE FUNCTION sync_landlord_to_profile();

-- ============================================
-- 6. Final verification query
-- ============================================
-- Run this to confirm everything is set up correctly

SELECT 
  'Total Landlords' as metric,
  COUNT(*) as count
FROM landlords
UNION ALL
SELECT 
  'Landlords with Profiles' as metric,
  COUNT(*) as count
FROM landlords l
INNER JOIN profiles p ON l.id = p.id
UNION ALL
SELECT 
  'Landlords WITHOUT Profiles' as metric,
  COUNT(*) as count
FROM landlords l
LEFT JOIN profiles p ON l.id = p.id
WHERE p.id IS NULL;

-- ============================================
-- Expected output after running this:
-- ============================================
-- Total Landlords: X
-- Landlords with Profiles: X (should equal total)
-- Landlords WITHOUT Profiles: 0 (should be zero)

