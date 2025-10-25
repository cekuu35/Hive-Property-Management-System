-- Delete user felixsankii@gmail.com and all related records
-- Run this in Supabase Dashboard SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_tenant_info_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'felixsankii@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User felixsankii@gmail.com not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user ID: %', v_user_id;

  -- Get profile ID
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = v_user_id;

  -- Get tenant_info ID
  SELECT id INTO v_tenant_info_id
  FROM tenant_info
  WHERE auth_user_id = v_user_id OR profile_id = v_user_id;

  -- Delete in proper order (respecting foreign key constraints)

  -- 1. Delete leases
  IF v_tenant_info_id IS NOT NULL THEN
    DELETE FROM leases WHERE tenant_info_id = v_tenant_info_id;
    RAISE NOTICE 'Deleted leases for tenant_info_id: %', v_tenant_info_id;
  END IF;

  -- 2. Delete security deposit deductions
  IF v_tenant_info_id IS NOT NULL THEN
    DELETE FROM security_deposit_deductions WHERE tenant_id = v_tenant_info_id;
    RAISE NOTICE 'Deleted security deposit deductions';
  END IF;

  -- 3. Delete rent payments
  IF v_tenant_info_id IS NOT NULL THEN
    DELETE FROM rent_payments WHERE tenant_id = v_tenant_info_id;
    RAISE NOTICE 'Deleted rent payments';
  END IF;

  -- 4. Delete maintenance requests
  IF v_tenant_info_id IS NOT NULL THEN
    DELETE FROM maintenance_requests WHERE tenant_id = v_tenant_info_id;
    RAISE NOTICE 'Deleted maintenance requests';
  END IF;

  -- 5. Delete unit applications
  IF v_profile_id IS NOT NULL THEN
    DELETE FROM unit_applications WHERE tenant_id = v_profile_id;
    RAISE NOTICE 'Deleted unit applications';
  END IF;

  -- 6. Delete tenant_info
  IF v_tenant_info_id IS NOT NULL THEN
    DELETE FROM tenant_info WHERE id = v_tenant_info_id;
    RAISE NOTICE 'Deleted tenant_info';
  END IF;

  -- 7. Delete profile
  IF v_profile_id IS NOT NULL THEN
    DELETE FROM profiles WHERE id = v_profile_id;
    RAISE NOTICE 'Deleted profile';
  END IF;

  -- 8. Delete auth user (this will cascade to some tables)
  DELETE FROM auth.users WHERE id = v_user_id;
  RAISE NOTICE 'Deleted auth user';

  RAISE NOTICE 'Successfully deleted user felixsankii@gmail.com and all related records';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error occurred: %', SQLERRM;
  RAISE;
END $$;

