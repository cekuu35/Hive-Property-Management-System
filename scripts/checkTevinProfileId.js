import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTevinProfileId() {
  try {
    console.log('🔍 Checking Tevin\'s profile_id issue...');
    
    // Get Tevin's tenant_info
    const { data: tevinInfo, error: tevinError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('email', 'tevinmokaya@gmail.com')
      .single();

    if (tevinError) {
      console.error('❌ Error fetching Tevin:', tevinError);
      return;
    }

    console.log('📊 Tevin\'s tenant_info record:');
    console.log('=====================================');
    console.log(`ID: ${tevinInfo.id}`);
    console.log(`Name: ${tevinInfo.first_name} ${tevinInfo.last_name}`);
    console.log(`Email: ${tevinInfo.email}`);
    console.log(`Profile ID: ${tevinInfo.profile_id || 'NULL'}`);
    console.log(`Auth User ID: ${tevinInfo.auth_user_id || 'NULL'}`);
    console.log(`Landlord ID: ${tevinInfo.landlord_id}`);

    // Get Tevin's auth user
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    const tevinAuthUser = authUsers.users.find(user => user.email === 'tevinmokaya@gmail.com');
    
    if (tevinAuthUser) {
      console.log('\n🔐 Tevin\'s Auth User:');
      console.log('=====================================');
      console.log(`Auth User ID: ${tevinAuthUser.id}`);
      console.log(`Email: ${tevinAuthUser.email}`);
      console.log(`Created: ${tevinAuthUser.created_at}`);
      console.log(`Email Confirmed: ${tevinAuthUser.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Check if there's a profile record for this auth user
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', tevinAuthUser.id)
        .single();

      if (profileError) {
        console.log('\n❌ No profile record found for Tevin\'s auth user');
        console.log('This is why the tenant portal can\'t find his lease!');
      } else {
        console.log('\n✅ Profile record found:');
        console.log(`Profile ID: ${profile.id}`);
        console.log(`Role: ${profile.role}`);
        console.log(`Created: ${profile.created_at}`);
      }
    } else {
      console.log('\n❌ No auth user found for Tevin');
    }

    // The issue: tenant_info.profile_id is NULL but should be the auth_user_id
    if (!tevinInfo.profile_id && tevinInfo.auth_user_id) {
      console.log('\n🔧 FIXING: Updating tenant_info.profile_id to match auth_user_id...');
      
      const { error: updateError } = await supabaseAdmin
        .from('tenant_info')
        .update({ profile_id: tevinInfo.auth_user_id })
        .eq('id', tevinInfo.id);

      if (updateError) {
        console.error('❌ Error updating profile_id:', updateError);
      } else {
        console.log('✅ Successfully updated profile_id!');
        console.log('Now the tenant portal should be able to find Tevin\'s lease.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTevinProfileId();
