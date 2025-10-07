import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function linkTevinAuthUser() {
  try {
    console.log('🔍 Looking for tenant: Tevin Mokaya...');
    
    // First, find the tenant by email
    const { data: tenantInfo, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('email', 'tevinmokaya@gmail.com')
      .single();

    if (tenantError) {
      console.error('❌ Error finding tenant:', tenantError);
      return;
    }

    if (!tenantInfo) {
      console.error('❌ Tenant not found');
      return;
    }

    console.log('✅ Found tenant:', tenantInfo);

    // Find the existing auth user by email
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError);
      return;
    }

    const tevinAuthUser = authUsers.users.find(user => user.email === 'tevinmokaya@gmail.com');
    
    if (!tevinAuthUser) {
      console.error('❌ Auth user not found for tevinmokaya@gmail.com');
      return;
    }

    console.log('✅ Found auth user:', tevinAuthUser.id);

    // Update tenant_info with auth_user_id
    const { error: updateError } = await supabaseAdmin
      .from('tenant_info')
      .update({ auth_user_id: tevinAuthUser.id })
      .eq('id', tenantInfo.id);

    if (updateError) {
      console.error('❌ Error linking auth user to tenant:', updateError);
      return;
    }

    console.log('✅ Auth user linked to tenant');

    // Reset the password for the auth user
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      tevinAuthUser.id,
      { password: 'Tevin123!' }
    );

    if (resetError) {
      console.error('❌ Error resetting password:', resetError);
      return;
    }

    console.log('✅ Password reset successfully');

    console.log('\n🎉 SUCCESS! Tenant login credentials:');
    console.log('Email:', 'tevinmokaya@gmail.com');
    console.log('Password:', 'Tevin123!');
    console.log('\nThe tenant can now login with these credentials!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

linkTevinAuthUser();
