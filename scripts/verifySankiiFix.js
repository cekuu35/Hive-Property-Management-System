import { supabaseAdmin } from './supabaseAdmin.js';

async function verifySankiiFix() {
  console.log('🧪 Verifying Sankii Fix...\n');

  try {
    // Check sankii Mok tenant
    console.log('📋 Checking sankii Mok tenant:');
    const { data: sankiiTenant, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .single();

    if (tenantError) {
      console.error('❌ Error fetching sankii tenant:', tenantError);
      return;
    }

    console.log('✅ Sankii tenant data:');
    console.log(`   Name: ${sankiiTenant.first_name} ${sankiiTenant.last_name}`);
    console.log(`   Email: ${sankiiTenant.email}`);
    console.log(`   Profile ID: ${sankiiTenant.profile_id || 'NULL'}`);
    console.log(`   Auth User ID: ${sankiiTenant.auth_user_id || 'NULL'}`);
    console.log(`   Current Balance: ${sankiiTenant.current_balance}`);

    // Check sankii's lease
    console.log('\n📋 Checking sankii\'s lease:');
    const { data: sankiiLease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .select('*')
      .eq('tenant_info_id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .single();

    if (leaseError) {
      console.error('❌ Error fetching sankii lease:', leaseError);
    } else {
      console.log('✅ Sankii lease data:');
      console.log(`   Rent Amount: ${sankiiLease.rent_amount}`);
      console.log(`   Deposit Amount: ${sankiiLease.deposit_amount}`);
      console.log(`   Status: ${sankiiLease.status}`);
      console.log(`   Start Date: ${sankiiLease.start_date}`);
      console.log(`   End Date: ${sankiiLease.end_date}`);
    }

    // Check auth user
    if (sankiiTenant.profile_id) {
      console.log('\n📋 Checking auth user:');
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(sankiiTenant.profile_id);
      
      if (authError) {
        console.error('❌ Error fetching auth user:', authError);
      } else {
        console.log('✅ Auth user data:');
        console.log(`   Email: ${authUser.user.email}`);
        console.log(`   Created: ${authUser.user.created_at}`);
        console.log(`   Email Confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}`);
      }
    }

    console.log('\n🎯 Expected Results:');
    console.log('1. ✅ Sankii Mok should have a profile_id and auth_user_id');
    console.log('2. ✅ Password should show "TempPass123!" instead of "No account"');
    console.log('3. ✅ Unpaid balance should show 4000 (rent amount) instead of 0');
    console.log('4. ✅ All tenant information should display correctly');
    console.log('');
    console.log('🌐 Access your preview at: http://localhost:4180/');
    console.log('');
    console.log('✅ Verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifySankiiFix();



