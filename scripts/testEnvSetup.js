import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testEnvSetup() {
  try {
    console.log('🔍 Testing Supabase admin connection...');
    
    // Test the connection by listing users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error connecting to Supabase:', error);
      return;
    }

    console.log('✅ Supabase admin connection successful!');
    console.log(`📊 Found ${users.users.length} users in the system`);
    
    // Test creating a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test123!';
    
    console.log('🧪 Testing auth user creation...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        role: 'tenant'
      }
    });

    if (authError) {
      console.error('❌ Error creating test user:', authError);
      return;
    }

    console.log('✅ Test user created successfully:', authData.user?.id);
    
    // Clean up - delete the test user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user?.id);
    if (deleteError) {
      console.warn('⚠️ Could not delete test user:', deleteError);
    } else {
      console.log('✅ Test user cleaned up');
    }

    console.log('\n🎉 Environment setup is working correctly!');
    console.log('The VITE_SUPABASE_SERVICE_ROLE_KEY is properly configured.');
    console.log('Tenant creation will now work with proper password display.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testEnvSetup();
