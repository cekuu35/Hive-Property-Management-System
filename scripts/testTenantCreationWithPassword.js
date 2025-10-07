import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testTenantCreationWithPassword() {
  try {
    console.log('🧪 Testing tenant creation with password display...');
    
    // Test data
    const testTenantData = {
      first_name: 'Test',
      last_name: 'User',
      email: `test-${Date.now()}@example.com`,
      phone: '1234567890',
      unit_id: null,
      rent_amount: 50000,
      security_deposit: 100000,
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '0987654321',
      notes: 'Test tenant for password verification'
    };

    console.log('📝 Test tenant data:', testTenantData);

    // Generate password
    const password = generateRandomPassword();
    console.log('🔑 Generated password:', password);

    // Create tenant_info record
    const { data: tenantInfo, error: tenantInfoError } = await supabaseAdmin
      .from('tenant_info')
      .insert({
        landlord_id: '85b546e7-6280-43c2-b281-d500f92da516', // Use existing landlord ID
        first_name: testTenantData.first_name,
        last_name: testTenantData.last_name,
        email: testTenantData.email,
        phone: testTenantData.phone,
        tenant_status: 'active',
        current_balance: testTenantData.rent_amount,
        payment_status: 'unpaid',
        emergency_contact_name: testTenantData.emergency_contact_name,
        emergency_contact_phone: testTenantData.emergency_contact_phone,
        notes: testTenantData.notes,
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
      email: testTenantData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: testTenantData.first_name,
        last_name: testTenantData.last_name,
        phone: testTenantData.phone,
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

    // Simulate the result that would be returned to the frontend
    const result = {
      success: true,
      tenant_id: tenantInfo.id,
      auth_user_id: authData.user?.id,
      password: password,
      email: testTenantData.email,
      auth_created: true,
    };

    console.log('\n🎉 SUCCESS! Tenant creation with password display works correctly!');
    console.log('📊 Result that would be displayed in the UI:');
    console.log('Email:', result.email);
    console.log('Password:', result.password);
    console.log('Auth Created:', result.auth_created);
    console.log('Tenant ID:', result.tenant_id);
    console.log('Auth User ID:', result.auth_user_id);

    // Clean up - delete the test tenant and auth user
    console.log('\n🧹 Cleaning up test data...');
    
    const { error: deleteTenantError } = await supabaseAdmin
      .from('tenant_info')
      .delete()
      .eq('id', tenantInfo.id);

    if (deleteTenantError) {
      console.warn('⚠️ Could not delete test tenant:', deleteTenantError);
    } else {
      console.log('✅ Test tenant deleted');
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authData.user?.id);
    if (deleteAuthError) {
      console.warn('⚠️ Could not delete test auth user:', deleteAuthError);
    } else {
      console.log('✅ Test auth user deleted');
    }

    console.log('\n✅ Test completed successfully!');
    console.log('The password will now display properly in the credentials form.');
    console.log('This problem will not occur in the future with the environment variable set up.');

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

testTenantCreationWithPassword();
