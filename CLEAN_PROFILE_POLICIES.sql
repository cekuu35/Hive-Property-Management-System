-- ============================================
-- CLEAN UP ALL PROFILE POLICIES
-- Remove duplicates and add proper WITH CHECK clauses
-- ============================================

-- Drop ALL existing profile policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "service_role_manage_profiles" ON profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile_clean" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- Create clean, comprehensive policies

-- 1. Service role has full access
CREATE POLICY "service_role_manage_profiles"
ON profiles FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 2. Users can read their own profile (by id OR user_id)
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR user_id = auth.uid()
);

-- 3. Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid() 
  OR user_id = auth.uid()
);

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid() 
  OR user_id = auth.uid()
)
WITH CHECK (
  id = auth.uid() 
  OR user_id = auth.uid()
);

-- Verify the clean policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

