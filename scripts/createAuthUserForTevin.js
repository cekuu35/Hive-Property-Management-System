import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAuthUserForTevin() {
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

    // Generate a password
    const password = generateRandomPassword();
    console.log('🔑 Generated password:', password);

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'tevinmokaya@gmail.com',
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: 'Tevin',
        last_name: 'Mokaya',
        phone: tenantInfo.phone,
        role: 'tenant'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user?.id);

    // Update tenant_info with auth_user_id
    const { error: updateError } = await supabaseAdmin
      .from('tenant_info')
      .update({ auth_user_id: authData.user?.id })
      .eq('id', tenantInfo.id);

    if (updateError) {
      console.error('❌ Error linking auth user to tenant:', updateError);
      return;
    }

    console.log('✅ Auth user linked to tenant');

    console.log('\n🎉 SUCCESS! Tenant login credentials:');
    console.log('Email:', 'tevinmokaya@gmail.com');
    console.log('Password:', password);
    console.log('\nThe tenant can now login with these credentials!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
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

createAuthUserForTevin();
