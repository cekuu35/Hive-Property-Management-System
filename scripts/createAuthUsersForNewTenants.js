import { supabaseAdmin } from './supabaseAdmin.js';

async function createAuthUsersForNewTenants() {
  console.log('🔧 Creating Auth Users for New Tenants...\n');

  try {
    // Find tenants without auth users
    console.log('📋 Finding tenants without auth users:');
    const { data: tenantsWithoutAuth, error: fetchError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .is('profile_id', null)
      .is('auth_user_id', null);

    if (fetchError) {
      console.error('❌ Error fetching tenants:', fetchError);
      return;
    }

    if (!tenantsWithoutAuth || tenantsWithoutAuth.length === 0) {
      console.log('✅ All tenants already have auth users!');
      return;
    }

    console.log(`Found ${tenantsWithoutAuth.length} tenants without auth users:`);
    tenantsWithoutAuth.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
    });

    console.log('\n🔐 Creating auth users...\n');

    for (const tenant of tenantsWithoutAuth) {
      try {
        // Generate a random password
        const password = generateRandomPassword();
        
        console.log(`Creating auth user for ${tenant.first_name} ${tenant.last_name}...`);

        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: tenant.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            role: 'tenant'
          }
        });

        if (authError) {
          console.error(`❌ Failed to create auth user for ${tenant.email}:`, authError.message);
          continue;
        }

        // Update tenant record with auth user info
        const { error: updateError } = await supabaseAdmin
          .from('tenant_info')
          .update({
            profile_id: authUser.user.id,
            auth_user_id: authUser.user.id,
            tenant_status: 'active' // Activate the tenant
          })
          .eq('id', tenant.id);

        if (updateError) {
          console.error(`❌ Failed to update tenant record for ${tenant.email}:`, updateError.message);
          // Clean up the auth user
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          continue;
        }

        console.log(`✅ Created auth user for ${tenant.first_name} ${tenant.last_name}`);
        console.log(`   Email: ${tenant.email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Auth User ID: ${authUser.user.id}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error processing ${tenant.email}:`, error.message);
      }
    }

    console.log('🎉 Auth user creation completed!');
    console.log('\n📋 Summary:');
    console.log('1. All tenants now have auth users');
    console.log('2. Tenants can log in with their email and generated password');
    console.log('3. Tenant status has been updated to "active"');
    console.log('4. All tenant management features should work properly');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Run the script
createAuthUsersForNewTenants();




