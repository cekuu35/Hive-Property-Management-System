-- FIX LEASE TENANT_ID FOREIGN KEY CONSTRAINT
-- Currently: tenant_id REFERENCES tenant_info(id) ❌
-- Should be: tenant_id REFERENCES profiles(id) ✅

-- Step 1: Update all existing leases to use profile.id instead of tenant_info.id
DO $$
DECLARE
  lease_record RECORD;
  profile_id_value UUID;
BEGIN
  RAISE NOTICE 'Fixing existing lease tenant_id values...';
  
  FOR lease_record IN 
    SELECT id, tenant_id, tenant_info_id
    FROM leases
  LOOP
    -- Check if tenant_id is actually pointing to tenant_info (wrong)
    IF EXISTS (SELECT 1 FROM tenant_info WHERE id = lease_record.tenant_id) THEN
      -- Get the profile_id from tenant_info
      SELECT profile_id INTO profile_id_value
      FROM tenant_info
      WHERE id = lease_record.tenant_id;
      
      IF profile_id_value IS NOT NULL THEN
        -- Update to use profile_id
        UPDATE leases
        SET tenant_id = profile_id_value,
            tenant_info_id = lease_record.tenant_id  -- Move old value here
        WHERE id = lease_record.id;
        
        RAISE NOTICE 'Fixed lease %: tenant_id % → %', 
          lease_record.id, lease_record.tenant_id, profile_id_value;
      ELSE
        RAISE WARNING 'Lease % has tenant_info with null profile_id, skipping', lease_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Step 2: Drop the old foreign key constraint (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'leases_tenant_id_fkey' 
      AND table_name = 'leases'
  ) THEN
    ALTER TABLE leases DROP CONSTRAINT leases_tenant_id_fkey;
    RAISE NOTICE 'Dropped old tenant_id foreign key constraint';
  END IF;
END $$;

-- Step 3: Add the correct foreign key constraint
ALTER TABLE leases
ADD CONSTRAINT leases_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

RAISE NOTICE '✅ Added new tenant_id foreign key constraint → profiles(id)';

-- Step 4: Verify the fix
DO $$
DECLARE
  bad_count INTEGER;
  good_count INTEGER;
BEGIN
  -- Count leases with tenant_id not in profiles
  SELECT COUNT(*) INTO bad_count
  FROM leases l
  WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = l.tenant_id);
  
  -- Count leases with tenant_id in profiles
  SELECT COUNT(*) INTO good_count
  FROM leases l
  WHERE EXISTS (SELECT 1 FROM profiles WHERE id = l.tenant_id);
  
  RAISE NOTICE 'Verification: % leases with correct tenant_id, % with incorrect',
    good_count, bad_count;
  
  IF bad_count > 0 THEN
    RAISE WARNING 'Still have % leases with invalid tenant_id!', bad_count;
  ELSE
    RAISE NOTICE '✅ All leases have valid tenant_id values!';
  END IF;
END $$;

