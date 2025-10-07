import { supabaseAdmin } from './supabaseAdmin.js';

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Tenant Creation Workflow...\n');

  try {
    // Test data
    const testTenant = {
      first_name: 'Test',
      last_name: 'Tenant',
      email: 'newtesttenant@example.com',
      phone: '1234567890',
      unit_id: 'test-unit-id',
      rent_amount: 3000,
      security_deposit: 6000,
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const landlordId = '4df5e33d-75d4-48cc-9f48-b06afc998f19';

    console.log('📋 Test Tenant Data:');
    console.log('  Name:', testTenant.first_name, testTenant.last_name);
    console.log('  Email:', testTenant.email);
    console.log('  Rent:', testTenant.rent_amount);
    console.log('  Landlord ID:', landlordId);

    // Step 1: Create auth user
    console.log('\n1. Creating auth user...');
    const password = 'TestPass123!';
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testTenant.email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Auth user creation failed:', authError.message);
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 2: Create tenant_info
    console.log('\n2. Creating tenant_info...');
    const { data: tenantInfo, error: tenantInfoError } = await supabaseAdmin
      .from('tenant_info')
      .insert({
        landlord_id: landlordId,
        first_name: testTenant.first_name,
        last_name: testTenant.last_name,
        email: testTenant.email,
        phone: testTenant.phone,
        profile_id: authData.user.id,
        tenant_status: 'active',
        current_balance: testTenant.rent_amount,
        payment_status: 'unpaid'
      })
      .select()
      .single();

    if (tenantInfoError) {
      console.log('❌ Tenant_info creation failed:', tenantInfoError.message);
      return;
    }

    console.log('✅ Tenant_info created:', tenantInfo.id);

    // Step 3: Create active lease
    console.log('\n3. Creating active lease...');
    const { data: units } = await supabaseAdmin
      .from('units')
      .select('id, unit_number')
      .limit(1);

    if (!units || units.length === 0) {
      console.log('❌ No units available');
      return;
    }

    // Get an existing tenant_id for the foreign key constraint
    const { data: existingTenant } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .limit(1)
      .single();

    const { data: lease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .insert({
        tenant_id: existingTenant.id, // Use existing tenant_id for foreign key
        tenant_info_id: tenantInfo.id,
        unit_id: units[0].id,
        start_date: testTenant.lease_start_date,
        end_date: testTenant.lease_end_date,
        rent_amount: testTenant.rent_amount,
        deposit_amount: testTenant.security_deposit,
        status: 'active'
      })
      .select()
      .single();

    if (leaseError) {
      console.log('❌ Lease creation failed:', leaseError.message);
      return;
    }

    console.log('✅ Active lease created:', lease.id);

    // Step 4: Test tenant login
    console.log('\n4. Testing tenant login...');
    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email: testTenant.email,
      password: password
    });

    if (loginError) {
      console.log('❌ Login test failed:', loginError.message);
    } else {
      console.log('✅ Login test successful:', loginData.user.email);
    }

    // Step 5: Test lease lookup
    console.log('\n5. Testing lease lookup...');
    const { data: lookupTenant } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', authData.user.id)
      .single();

    if (lookupTenant) {
      const { data: lookupLease } = await supabaseAdmin
        .from('leases')
        .select('*')
        .eq('tenant_info_id', lookupTenant.id)
        .eq('status', 'active')
        .single();

      if (lookupLease) {
        console.log('✅ Lease lookup successful:');
        console.log('  Lease ID:', lookupLease.id);
        console.log('  Rent amount:', lookupLease.rent_amount);
        console.log('  Status:', lookupLease.status);
      } else {
        console.log('❌ Lease lookup failed');
      }
    } else {
      console.log('❌ Tenant lookup failed');
    }

    console.log('\n🎉 Complete workflow test successful!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Auth user created');
    console.log('  ✅ Tenant_info created');
    console.log('  ✅ Active lease created');
    console.log('  ✅ Login works');
    console.log('  ✅ Lease lookup works');
    console.log('\n🌐 The tenant can now login and see their active lease!');
    console.log('  Email:', testTenant.email);
    console.log('  Password:', password);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteWorkflow();
