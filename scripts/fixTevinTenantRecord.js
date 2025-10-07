import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTevinTenantRecord() {
  try {
    console.log('🔧 Fixing Tevin\'s tenant record...');
    
    // Get Tevin's tenant_info
    const { data: tevinInfo, error: tevinError } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('email', 'tevinmokaya@gmail.com')
      .single();

    if (tevinError) {
      console.error('❌ Error finding Tevin:', tevinError);
      return;
    }

    console.log('✅ Found Tevin\'s tenant_info:', tevinInfo.id);

    // Check if tenants record already exists
    const { data: existingTenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('tenant_info_id', tevinInfo.id)
      .single();

    if (existingTenant) {
      console.log('✅ Tenants record already exists:', existingTenant.id);
      return;
    }

    if (tenantError && tenantError.code !== 'PGRST116') {
      console.error('❌ Error checking existing tenant:', tenantError);
      return;
    }

    // Create tenants record
    const { data: tenantRecord, error: createError } = await supabaseAdmin
      .from('tenants')
      .insert({
        landlord_id: tevinInfo.landlord_id,
        tenant_info_id: tevinInfo.id,
        auth_user_id: tevinInfo.auth_user_id,
        unit_id: null, // No unit assigned yet
        rent_amount: 0,
        security_deposit: 0,
        lease_start_date: null,
        lease_end_date: null,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating tenants record:', createError);
      return;
    }

    console.log('✅ Created tenants record:', tenantRecord.id);
    console.log('🎉 Tevin\'s tenant record is now fixed!');
    console.log('   He can now be assigned to units through the edit form.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixTevinTenantRecord();
