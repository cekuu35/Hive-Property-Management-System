import { supabaseAdmin } from './supabaseAdmin.js';

async function testRoleSwitching() {
  console.log('🧪 Testing Role Switching Functionality...\n');

  try {
    // 1. List all auth users
    console.log('📋 Current Auth Users:');
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    users.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      console.log('');
    });

    // 2. Check for users with multiple roles
    console.log('🔍 Checking for users with multiple roles...\n');
    
    for (const user of users.users) {
      console.log(`Checking ${user.email}:`);
      
      // Check if user has a profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, first_name, last_name')
        .eq('id', user.id)
        .single();

      // Check if user has tenant info
      const { data: tenantInfo } = await supabaseAdmin
        .from('tenant_info')
        .select('id, first_name, last_name, landlord_id')
        .eq('profile_id', user.id)
        .single();

      if (profile && tenantInfo) {
        console.log(`  ✅ MULTIPLE ROLES DETECTED:`);
        console.log(`     Profile Role: ${profile.role}`);
        console.log(`     Tenant: ${tenantInfo.first_name} ${tenantInfo.last_name}`);
        console.log(`     This user can switch between ${profile.role} and tenant roles`);
      } else if (profile) {
        console.log(`  📋 Profile Role: ${profile.role}`);
      } else if (tenantInfo) {
        console.log(`  🏠 Tenant: ${tenantInfo.first_name} ${tenantInfo.last_name}`);
      } else {
        console.log(`  ❓ No role data found`);
      }
      console.log('');
    }

    // 3. Test email availability check
    console.log('📧 Testing Email Availability Check...\n');
    
    const testEmails = [
      'test@example.com',
      'admin@example.com',
      'security@example.com'
    ];

    for (const email of testEmails) {
      console.log(`Checking availability for: ${email}`);
      
      // Simulate the email availability check
      const userExists = users.users.find(user => user.email === email);
      
      if (userExists) {
        // Check if this user is already linked to a tenant
        const { data: existingTenant } = await supabaseAdmin
          .from('tenant_info')
          .select('id, profile_id')
          .eq('profile_id', userExists.id)
          .single();

        if (existingTenant) {
          console.log(`  ❌ Already registered as tenant`);
        } else {
          // Check if this user has a profile with a different role
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('id', userExists.id)
            .single();

          if (existingProfile && existingProfile.role !== 'tenant') {
            console.log(`  ⚠️  Already registered as ${existingProfile.role} - can create tenant with role switching`);
          } else {
            console.log(`  ✅ Available for tenant creation`);
          }
        }
      } else {
        console.log(`  ✅ Available for tenant creation`);
      }
      console.log('');
    }

    // 4. Show role switching instructions
    console.log('🔄 Role Switching Instructions:');
    console.log('');
    console.log('When a user with multiple roles logs in:');
    console.log('1. The system will detect they have multiple roles');
    console.log('2. A role switcher component will be displayed');
    console.log('3. The user can choose which role to use for the session');
    console.log('4. The appropriate dashboard will be shown based on their choice');
    console.log('');
    console.log('This prevents conflicts when the same email is used for different roles!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRoleSwitching();
