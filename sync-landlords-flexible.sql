-- FLEXIBLE Landlords to Profiles Sync
-- This works with different column structures

-- ============================================
-- STEP 1: Check your landlords table structure
-- ============================================
-- Run this FIRST to see what columns you have:

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'landlords'
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: Choose the correct sync query based on your columns
-- ============================================

-- OPTION A: If you have 'name' column (single name field)
-- --------------------------------------------------------
INSERT INTO profiles (id, email, role, first_name, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  COALESCE(l.name, l.email) as first_name,  -- Use name or email as fallback
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);

-- OPTION B: If you have 'full_name' column
-- --------------------------------------------------------
-- Uncomment this if you have 'full_name':
/*
INSERT INTO profiles (id, email, role, first_name, last_name, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  SPLIT_PART(l.full_name, ' ', 1) as first_name,  -- First word
  NULLIF(SUBSTRING(l.full_name FROM POSITION(' ' IN l.full_name) + 1), '') as last_name,  -- Rest
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);
*/

-- OPTION C: If you only have 'email' and 'id'
-- --------------------------------------------------------
-- Uncomment this if you only have basic fields:
/*
INSERT INTO profiles (id, email, role, first_name, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  SPLIT_PART(l.email, '@', 1) as first_name,  -- Use email username part
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);
*/

-- OPTION D: If you have 'username' column
-- --------------------------------------------------------
-- Uncomment this if you have 'username':
/*
INSERT INTO profiles (id, email, role, first_name, created_at)
SELECT 
  l.id,
  l.email,
  'landlord' as role,
  l.username as first_name,
  l.created_at
FROM landlords l
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = l.id
);
*/

-- ============================================
-- STEP 3: Fix RLS Policies (Run this regardless)
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
-- STEP 4: Auto-sync trigger (Run this regardless)
-- ============================================

-- This will be updated based on your actual column structure
-- For now, using a basic version that works with just id and email:

CREATE OR REPLACE FUNCTION sync_landlord_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic sync with just id, email, role
  INSERT INTO profiles (id, email, role, created_at)
  VALUES (NEW.id, NEW.email, 'landlord', COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_landlord_to_profile_trigger ON landlords;
CREATE TRIGGER sync_landlord_to_profile_trigger
AFTER INSERT OR UPDATE ON landlords
FOR EACH ROW
EXECUTE FUNCTION sync_landlord_to_profile();

-- ============================================
-- STEP 5: Verify (Run this after sync)
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
INNER JOIN profiles p ON l.id = p.id;

