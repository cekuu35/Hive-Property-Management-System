-- Drop the recursive policy causing infinite recursion
DROP POLICY IF EXISTS "Security can view all profiles" ON public.profiles;

-- Drop duplicate policies (keeping the cleaner versions)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Ensure the security function-based policy exists (should already exist from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Security users can view all profiles'
  ) THEN
    CREATE POLICY "Security users can view all profiles" 
    ON public.profiles 
    FOR SELECT 
    USING (is_security_user());
  END IF;
END $$;

-- Keep simplified, non-recursive policies:
-- "Users can insert their own profile" - allows users to create their profile
-- "Users can update their own profile" - allows users to update their profile
-- "Users can view all profiles" - allows viewing (might want to restrict this later)
-- "Security users can view all profiles" - uses safe function