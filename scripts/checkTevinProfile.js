import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTevinProfile() {
  try {
    console.log('🔍 Checking Tevin\'s profile record...');
    
    // Get Tevin's auth user ID
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    const tevinAuthUser = authUsers.users.find(user => user.email === 'tevinmokaya@gmail.com');
    
    if (!tevinAuthUser) {
      console.error('❌ Tevin\'s auth user not found');
      return;
    }

    console.log('🔐 Tevin\'s Auth User ID:', tevinAuthUser.id);

    // Get Tevin's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', tevinAuthUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }

    console.log('✅ Tevin\'s Profile:');
    console.log('=====================================');
    console.log(`Profile ID: ${profile.id}`);
    console.log(`User ID: ${profile.user_id}`);
    console.log(`Role: ${profile.role}`);
    console.log(`First Name: ${profile.first_name}`);
    console.log(`Last Name: ${profile.last_name}`);
    console.log(`Created: ${profile.created_at}`);

    // Now check if tenant_info.profile_id matches profile.id
    const { data: tevinInfo, error: tevinError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('email', 'tevinmokaya@gmail.com')
      .single();

    if (tevinError) {
      console.error('❌ Error fetching tenant_info:', tevinError);
      return;
    }

    console.log('\n📊 Tevin\'s tenant_info:');
    console.log('=====================================');
    console.log(`Tenant Info ID: ${tevinInfo.id}`);
    console.log(`Profile ID: ${tevinInfo.profile_id}`);
    console.log(`Auth User ID: ${tevinInfo.auth_user_id}`);

    if (tevinInfo.profile_id === profile.id) {
      console.log('\n✅ Profile IDs match! The tenant portal should work now.');
    } else {
      console.log('\n❌ Profile IDs don\'t match! This is the problem.');
      console.log(`tenant_info.profile_id: ${tevinInfo.profile_id}`);
      console.log(`profiles.id: ${profile.id}`);
      
      // Fix it
      console.log('\n🔧 Fixing profile_id mismatch...');
      const { error: updateError } = await supabaseAdmin
        .from('tenant_info')
        .update({ profile_id: profile.id })
        .eq('id', tevinInfo.id);

      if (updateError) {
        console.error('❌ Error updating profile_id:', updateError);
      } else {
        console.log('✅ Successfully updated profile_id!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTevinProfile();
