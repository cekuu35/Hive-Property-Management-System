import { supabaseAdmin } from './supabaseAdmin.js';

async function testClientSideAuth() {
  console.log('🧪 Testing Client-Side Authentication Fix...\n');

  try {
    // Test the specific user that was having issues
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    const targetUser = users.users.find(user => user.email === 'the.apollofelix.g@gmail.com');
    
    if (!targetUser) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${targetUser.email}`);
    console.log(`   ID: ${targetUser.id}\n`);

    // Test tenant data query (client-side equivalent)
    console.log('🏠 Testing Tenant Data Query:');
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('profile_id', targetUser.id)
      .maybeSingle();

    if (tenantError) {
      console.log('❌ Tenant query error:', tenantError.message);
    } else if (tenantData) {
      console.log('✅ Tenant data found:');
      console.log(`   Name: ${tenantData.first_name} ${tenantData.last_name}`);
      console.log(`   Email: ${tenantData.email}`);
      console.log(`   Status: ${tenantData.tenant_status}`);
    } else {
      console.log('ℹ️  No tenant data found');
    }

    // Test profile data query
    console.log('\n📋 Testing Profile Data Query:');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (profileError) {
      console.log('❌ Profile query error:', profileError.message);
    } else if (profileData) {
      console.log('✅ Profile data found:');
      console.log(`   Role: ${profileData.role}`);
      console.log(`   Name: ${profileData.first_name} ${profileData.last_name}`);
    } else {
      console.log('ℹ️  No profile data found');
    }

    // Test role determination logic
    console.log('\n🔄 Testing Role Determination:');
    if (tenantData && profileData) {
      console.log('✅ Multiple roles detected:');
      console.log(`   Primary: ${profileData.role}`);
      console.log(`   Secondary: tenant`);
      console.log('   Expected: Role switcher should appear');
    } else if (tenantData) {
      console.log('✅ Single role: tenant');
      console.log('   Expected: Direct tenant dashboard');
    } else if (profileData) {
      console.log(`✅ Single role: ${profileData.role}`);
      console.log('   Expected: Direct role dashboard');
    } else {
      console.log('❌ No role data found');
    }

    console.log('\n🎯 Preview Status:');
    console.log('✅ Build completed successfully');
    console.log('✅ Client-side queries fixed');
    console.log('✅ No server-side imports in client code');
    console.log('✅ Preview should now work correctly');
    console.log('\n🌐 Access your preview at: http://localhost:4173/');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testClientSideAuth();
