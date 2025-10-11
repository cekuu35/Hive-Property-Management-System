-- Add profile_id column to landlords table and create auto-landlord creation system
-- This migration implements automatic landlord creation when a user signs up with role="landlord"

-- 1. Add profile_id column to landlords table
ALTER TABLE public.landlords 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_landlords_profile_id ON public.landlords(profile_id);

-- 3. Create function to auto-create landlord records
CREATE OR REPLACE FUNCTION create_landlord_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create landlord record if the profile role is 'landlord'
  IF NEW.role = 'landlord' THEN
    INSERT INTO public.landlords (
      name, 
      email, 
      subaccount_code, 
      profile_id,
      phone
    )
    VALUES (
      CONCAT(NEW.first_name, ' ', NEW.last_name),
      NEW.email,
      CONCAT('ACCT_', SUBSTRING(NEW.id::text, 1, 8), '_', EXTRACT(EPOCH FROM NOW())::bigint),
      NEW.id,
      NULL -- Phone will be updated later by the user
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to automatically create landlord records
DROP TRIGGER IF EXISTS create_landlord_trigger ON public.profiles;
CREATE TRIGGER create_landlord_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_landlord_for_profile();

-- 5. Create landlord records for existing landlord profiles
INSERT INTO public.landlords (name, email, subaccount_code, profile_id, phone)
SELECT 
  CONCAT(p.first_name, ' ', p.last_name) as name,
  p.email,
  CONCAT('ACCT_', SUBSTRING(p.id::text, 1, 8), '_', EXTRACT(EPOCH FROM NOW())::bigint) as subaccount_code,
  p.id as profile_id,
  NULL as phone
FROM public.profiles p
WHERE p.role = 'landlord'
  AND NOT EXISTS (
    SELECT 1 FROM public.landlords l 
    WHERE l.profile_id = p.id
  );

-- 6. Update properties to reference landlords.id instead of profiles.id
-- First, create a temporary mapping of profile_id to landlord_id
WITH landlord_mapping AS (
  SELECT 
    l.profile_id,
    l.id as landlord_id
  FROM public.landlords l
  WHERE l.profile_id IS NOT NULL
)
UPDATE public.properties p
SET landlord_id = lm.landlord_id
FROM landlord_mapping lm
WHERE p.landlord_id = lm.profile_id;

-- 7. Add foreign key constraint for properties.landlord_id -> landlords.id
-- First drop the existing constraint if it exists
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_landlord_id_fkey;

-- Add the new constraint
ALTER TABLE public.properties 
ADD CONSTRAINT properties_landlord_id_fkey 
FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;

-- 8. Create RLS policies for landlords table
CREATE POLICY "Landlords can view their own data" ON public.landlords
  FOR SELECT
  USING (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Landlords can update their own data" ON public.landlords
  FOR UPDATE
  USING (profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all landlords" ON public.landlords
  FOR ALL
  USING (auth.role() = 'service_role');

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.landlords TO authenticated;
GRANT ALL ON public.landlords TO service_role;

-- 10. Verify the setup
DO $$
DECLARE
  landlord_count INTEGER;
  profile_count INTEGER;
  property_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO landlord_count FROM public.landlords WHERE profile_id IS NOT NULL;
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE role = 'landlord';
  SELECT COUNT(*) INTO property_count FROM public.properties WHERE landlord_id IS NOT NULL;
  
  RAISE NOTICE 'Landlords with profiles: %', landlord_count;
  RAISE NOTICE 'Landlord profiles: %', profile_count;
  RAISE NOTICE 'Properties with landlords: %', property_count;
  
  IF landlord_count = profile_count THEN
    RAISE NOTICE 'SUCCESS: All landlord profiles have corresponding landlord records';
  ELSE
    RAISE WARNING 'WARNING: Mismatch between landlord profiles and landlord records';
  END IF;
END $$;
