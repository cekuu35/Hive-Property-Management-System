-- ============================================
-- FIX PROFILE RLS FOR SUBSCRIPTION SYSTEM
-- Allows users to read their own profiles by both id and user_id
-- ============================================

-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;

-- Create comprehensive profile policies
-- 1. Users can read their own profile (by id OR user_id)
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR user_id = auth.uid()
);

-- 2. Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid() 
  OR user_id = auth.uid()
);

-- 3. Users can update their own profile
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

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

