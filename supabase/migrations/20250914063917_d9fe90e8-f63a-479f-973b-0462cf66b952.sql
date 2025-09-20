-- Allow authenticated users to read basic profile info for messaging and financial displays
-- Adds a permissive SELECT policy on public.profiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);
