-- ============================================================================
-- URGENT FIX: Revert broken profiles policies
-- ============================================================================
-- Your previous changes broke RLS by revoking execute from helper functions
-- This quick fix reverts profiles policies to working state
-- ============================================================================

DROP POLICY IF EXISTS "Landlords can update their own data" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view their own data" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate safe policies (NO helper function needed for profiles!)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Success log
INSERT INTO cron_log (message, created_at) 
VALUES ('✅ Reverted broken profiles policies to auth.uid() = user_id', NOW());

-- ============================================================================
-- NOW run FINAL_FIX_ALL_RLS_COMPLETE.sql to fix the rest!
-- ============================================================================

