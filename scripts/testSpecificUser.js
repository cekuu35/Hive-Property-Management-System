import { supabaseAdmin } from './supabaseAdmin.js';

async function testSpecificUser() {
  console.log('🧪 Testing Specific User: the.apollofelix.g@gmail.com\n');

  try {
    // 1. Find the user by email
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const targetUser = users.users.find(user => user.email === 'the.apollofelix.g@gmail.com');
    
    if (!targetUser) {
      console.log('❌ User not found in auth.users');
      return;
    }

    console.log(`✅ Found user: ${targetUser.email}`);
    console.log(`   ID: ${targetUser.id}`);
    console.log(`   Created: ${new Date(targetUser.created_at).toLocaleString()}`);
    console.log(`   Last Sign In: ${targetUser.last_sign_in_at ? new Date(targetUser.last_sign_in_at).toLocaleString() : 'Never'}\n`);

    // 2. Check profile data
    console.log('📋 Checking Profile Data:');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', targetUser.id)
      .single();

    if (profileError) {
      console.log('❌ No profile found:', profileError.message);
    } else {
      console.log('✅ Profile found:');
      console.log(`   Role: ${profile.role}`);
      console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`   Phone: ${profile.phone || 'Not set'}`);
    }

    // 3. Check tenant data
    console.log('\n🏠 Checking Tenant Data:');
    const { data: tenantInfo, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('profile_id', targetUser.id)
      .single();

    if (tenantError) {
      console.log('❌ No tenant info found:', tenantError.message);
    } else {
      console.log('✅ Tenant info found:');
      console.log(`   Name: ${tenantInfo.first_name} ${tenantInfo.last_name}`);
      console.log(`   Email: ${tenantInfo.email}`);
      console.log(`   Phone: ${tenantInfo.phone}`);
      console.log(`   Status: ${tenantInfo.tenant_status}`);
      console.log(`   Landlord ID: ${tenantInfo.landlord_id}`);
    }

    // 4. Check if user has multiple roles
    console.log('\n🔄 Role Analysis:');
    if (profile && tenantInfo) {
      console.log('✅ MULTIPLE ROLES DETECTED!');
      console.log(`   Primary Role (Profile): ${profile.role}`);
      console.log(`   Secondary Role: Tenant`);
      console.log('   This user should see the role switcher on login');
    } else if (profile) {
      console.log(`📋 Single Role: ${profile.role}`);
    } else if (tenantInfo) {
      console.log('🏠 Single Role: Tenant');
    } else {
      console.log('❓ No role data found');
    }

    // 5. Test the role determination logic
    console.log('\n🧠 Testing Role Determination Logic:');
    
    if (profile && tenantInfo) {
      console.log('   Both profile and tenant data exist');
      console.log('   Current logic prioritizes profile role:', profile.role);
      console.log('   Role switcher should be shown');
    } else if (tenantInfo) {
      console.log('   Only tenant data exists');
      console.log('   Should show tenant dashboard directly');
    } else if (profile) {
      console.log('   Only profile data exists');
      console.log('   Should show', profile.role, 'dashboard directly');
    }

    // 6. Show what should happen on login
    console.log('\n🎯 Expected Login Behavior:');
    if (profile && tenantInfo) {
      console.log('1. User logs in with the.apollofelix.g@gmail.com');
      console.log('2. System detects both caretaker and tenant roles');
      console.log('3. Role switcher is displayed');
      console.log('4. User can choose between:');
      console.log('   - Caretaker Dashboard (current default)');
      console.log('   - Tenant Dashboard');
      console.log('5. Selected role determines which dashboard is shown');
    } else {
      console.log('User should go directly to their single role dashboard');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSpecificUser();
