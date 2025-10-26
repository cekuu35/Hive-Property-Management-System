-- ============================================
-- COMPLETE FIX for Landlords → Profiles Sync
-- Based on your actual table structure
-- ============================================

-- STEP 1: Sync all landlords to profiles table
-- ============================================

INSERT INTO profiles (id, email, role, first_name, last_name, phone_number, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  -- Split name into first and last (if it has a space)
  SPLIT_PART(l.name, ' ', 1) as first_name,
  NULLIF(SUBSTRING(l.name FROM POSITION(' ' IN l.name) + 1), '') as last_name,
  l.phone as phone_number,
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);

-- STEP 2: Fix RLS Policies
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

-- STEP 3: Create auto-sync trigger for future landlords
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
    phone_number = EXCLUDED.phone_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_landlord_to_profile_trigger ON landlords;
CREATE TRIGGER sync_landlord_to_profile_trigger
AFTER INSERT OR UPDATE ON landlords
FOR EACH ROW
EXECUTE FUNCTION sync_landlord_to_profile();

-- STEP 4: Verify everything worked
-- ============================================

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

-- Expected result:
-- All three numbers should show your total landlords count
-- The "WITHOUT Profiles" should be 0

-- STEP 5: Check one landlord to see the result
-- ============================================

SELECT 
  l.name as landlord_name,
  p.first_name,
  p.last_name,
  p.email,
  p.phone_number,
  p.role
FROM landlords l
INNER JOIN profiles p ON l.id = p.id
LIMIT 5;

