-- ============================================
-- CREATE PROFILE FOR CURRENT LOGGED-IN USER
-- Run this to fix "Profile not found" error
-- ============================================

-- First, check if you're in the landlords table
SELECT 
  'Your account in landlords table:' as status,
  id, name, email, phone
FROM landlords
WHERE id = '1bc4328b-234b-40bf-9b28-620c7eaa2b20';

-- Check if you have a profile
SELECT 
  'Your profile record:' as status,
  id, email, first_name, last_name, role
FROM profiles
WHERE id = '1bc4328b-234b-40bf-9b28-620c7eaa2b20';

-- If landlord exists but profile doesn't, create it:
DO $$
DECLARE
  landlord_record RECORD;
BEGIN
  -- Get landlord data
  SELECT * INTO landlord_record
  FROM landlords
  WHERE id = '1bc4328b-234b-40bf-9b28-620c7eaa2b20';
  
  IF FOUND THEN
    -- Create profile from landlord data
    INSERT INTO profiles (id, user_id, email, role, first_name, last_name, phone, created_at)
    VALUES (
      landlord_record.id,
      landlord_record.id,
      landlord_record.email,
      'landlord',
      SPLIT_PART(landlord_record.name, ' ', 1),
      NULLIF(SUBSTRING(landlord_record.name FROM POSITION(' ' IN landlord_record.name) + 1), ''),
      landlord_record.phone,
      landlord_record.created_at
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone;
    
    RAISE NOTICE '✅ Profile created successfully!';
  ELSE
    RAISE NOTICE '❌ Landlord record not found. You may need to sign up as a landlord first.';
  END IF;
END $$;

-- Verify it worked
SELECT 
  '✅ Final verification:' as status,
  p.id, p.email, p.first_name, p.last_name, p.role,
  l.name as landlord_name
FROM profiles p
LEFT JOIN landlords l ON l.id = p.id
WHERE p.id = '1bc4328b-234b-40bf-9b28-620c7eaa2b20';

