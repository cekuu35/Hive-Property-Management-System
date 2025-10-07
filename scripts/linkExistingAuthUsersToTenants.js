import { supabaseAdmin } from './supabaseAdmin.js';

async function linkExistingAuthUsersToTenants() {
  console.log('🔗 Linking Existing Auth Users to Tenants...\n');

  try {
    // Get all tenants without auth users
    const { data: tenantsWithoutAuth, error: fetchError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .is('profile_id', null);

    if (fetchError) {
      console.error('❌ Error fetching tenants:', fetchError);
      return;
    }

    if (!tenantsWithoutAuth || tenantsWithoutAuth.length === 0) {
      console.log('✅ All tenants already have auth users linked!');
      return;
    }

    console.log(`Found ${tenantsWithoutAuth.length} tenants without linked auth users:`);
    tenantsWithoutAuth.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.first_name} ${tenant.last_name} (${tenant.email})`);
    });

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    console.log(`\nFound ${authUsers.users.length} auth users in the system`);

    console.log('\n🔗 Linking tenants to existing auth users...\n');

    let linkedCount = 0;
    let createdCount = 0;

    for (const tenant of tenantsWithoutAuth) {
      try {
        // Find matching auth user by email
        const matchingAuthUser = authUsers.users.find(user => user.email === tenant.email);
        
        if (matchingAuthUser) {
          // Link existing auth user
          console.log(`Linking ${tenant.first_name} ${tenant.last_name} to existing auth user...`);
          
          const { error: updateError } = await supabaseAdmin
            .from('tenant_info')
            .update({
              profile_id: matchingAuthUser.id,
              auth_user_id: matchingAuthUser.id,
              tenant_status: 'active'
            })
            .eq('id', tenant.id);

          if (updateError) {
            console.error(`❌ Failed to link tenant ${tenant.email}:`, updateError.message);
            continue;
          }

          console.log(`✅ Linked ${tenant.first_name} ${tenant.last_name} to existing auth user`);
          console.log(`   Auth User ID: ${matchingAuthUser.id}`);
          console.log(`   Email: ${matchingAuthUser.email}`);
          console.log(`   Created: ${matchingAuthUser.created_at}`);
          console.log('');
          
          linkedCount++;
        } else {
          // Create new auth user
          console.log(`Creating new auth user for ${tenant.first_name} ${tenant.last_name}...`);
          
          const password = generateRandomPassword();
          const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

          // Link new auth user
          const { error: updateError } = await supabaseAdmin
            .from('tenant_info')
            .update({
              profile_id: newAuthUser.user.id,
              auth_user_id: newAuthUser.user.id,
              tenant_status: 'active'
            })
            .eq('id', tenant.id);

          if (updateError) {
            console.error(`❌ Failed to link new auth user for ${tenant.email}:`, updateError.message);
            // Clean up the auth user
            await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
            continue;
          }

          console.log(`✅ Created and linked new auth user for ${tenant.first_name} ${tenant.last_name}`);
          console.log(`   Email: ${tenant.email}`);
          console.log(`   Password: ${password}`);
          console.log(`   Auth User ID: ${newAuthUser.user.id}`);
          console.log('');
          
          createdCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing ${tenant.email}:`, error.message);
      }
    }

    console.log('🎉 Linking completed!');
    console.log('\n📋 Summary:');
    console.log(`   • Linked to existing auth users: ${linkedCount}`);
    console.log(`   • Created new auth users: ${createdCount}`);
    console.log(`   • Total processed: ${linkedCount + createdCount}`);
    console.log('\n✅ All tenants now have proper auth user links!');

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
linkExistingAuthUsersToTenants();



