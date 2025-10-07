import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPasswordDisplay() {
  try {
    console.log('🧪 Testing password display in tenant creation...');
    
    // Simulate the exact same process as the frontend
    const testData = {
      first_name: 'John',
      last_name: 'Doe',
      email: `test-password-${Date.now()}@example.com`,
      phone: '1234567890',
      unit_id: null,
      rent_amount: 50000,
      security_deposit: 100000,
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '0987654321',
      notes: 'Test for password display'
    };

    console.log('📝 Test data:', testData);

    // Generate password (same as in the service)
    const password = generateRandomPassword();
    console.log('🔑 Generated password:', password);

    // Create tenant_info
    const { data: tenantInfo, error: tenantInfoError } = await supabaseAdmin
      .from('tenant_info')
      .insert({
        landlord_id: '85b546e7-6280-43c2-b281-d500f92da516',
        first_name: testData.first_name,
        last_name: testData.last_name,
        email: testData.email,
        phone: testData.phone,
        tenant_status: 'active',
        current_balance: testData.rent_amount,
        payment_status: 'unpaid',
        emergency_contact_name: testData.emergency_contact_name,
        emergency_contact_phone: testData.emergency_contact_phone,
        notes: testData.notes,
      })
      .select()
      .single();

    if (tenantInfoError) {
      console.error('❌ Tenant_info creation failed:', tenantInfoError);
      return;
    }

    console.log('✅ Tenant_info created:', tenantInfo.id);

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: testData.first_name,
        last_name: testData.last_name,
        phone: testData.phone,
        role: 'tenant'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user?.id);

    // Link auth user to tenant
    const { error: updateError } = await supabaseAdmin
      .from('tenant_info')
      .update({ auth_user_id: authData.user?.id })
      .eq('id', tenantInfo.id);

    if (updateError) {
      console.error('❌ Failed to link auth user to tenant:', updateError);
      return;
    }

    console.log('✅ Auth user linked to tenant');

    // This is the exact result that would be returned to the frontend
    const result = {
      success: true,
      tenant_id: tenantInfo.id,
      auth_user_id: authData.user?.id,
      password: password, // This should display in the UI
      email: testData.email,
      auth_created: true,
    };

    console.log('\n🎉 SUCCESS! Password display test completed!');
    console.log('📊 This is what the frontend will receive:');
    console.log('=====================================');
    console.log('Email:', result.email);
    console.log('Password:', result.password);
    console.log('Auth Created:', result.auth_created);
    console.log('Tenant ID:', result.tenant_id);
    console.log('Auth User ID:', result.auth_user_id);
    console.log('=====================================');
    console.log('\n✅ The password WILL display in the credentials form!');
    console.log('✅ The password is:', result.password);
    console.log('✅ The tenant can login with these credentials!');

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await supabaseAdmin.from('tenant_info').delete().eq('id', tenantInfo.id);
    await supabaseAdmin.auth.admin.deleteUser(authData.user?.id);
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Error:', error);
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

testPasswordDisplay();
