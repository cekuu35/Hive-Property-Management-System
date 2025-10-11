import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkLandlordsData() {
  console.log('🔍 CHECKING LANDLORDS DATA');
  console.log('==========================\n');

  try {
    // Check if landlords table exists and has data
    console.log('1. Checking landlords table...');
    const { data: landlords, error: landlordsError } = await supabaseAdmin
      .from('landlords')
      .select('*')
      .limit(10);

    if (landlordsError) {
      console.error('❌ Error fetching landlords:', landlordsError);
      return;
    }

    console.log('✅ Landlords table accessible');
    console.log(`📊 Found ${landlords?.length || 0} landlords`);
    
    if (landlords && landlords.length > 0) {
      console.log('\n📋 Landlords data:');
      landlords.forEach((landlord, index) => {
        console.log(`${index + 1}. ${landlord.name} (${landlord.email})`);
        console.log(`   ID: ${landlord.id}`);
        console.log(`   Subaccount: ${landlord.subaccount_code || 'None'}`);
        console.log(`   Profile ID: ${landlord.profile_id || 'None'}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No landlords found in database');
      console.log('\n🔧 Creating test landlord...');
      
      const { data: testLandlord, error: createError } = await supabaseAdmin
        .from('landlords')
        .insert({
          name: 'Test Landlord',
          email: 'test@landlord.com',
          phone: '+254700000000',
          subaccount_code: 'ACCT_test123',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test landlord:', createError);
      } else {
        console.log('✅ Test landlord created:', testLandlord);
      }
    }

    // Check properties table
    console.log('\n2. Checking properties table...');
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('id, name, landlord_id')
      .limit(5);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
    } else {
      console.log(`✅ Found ${properties?.length || 0} properties`);
      if (properties && properties.length > 0) {
        properties.forEach((prop, index) => {
          console.log(`${index + 1}. ${prop.name} (Landlord ID: ${prop.landlord_id})`);
        });
      }
    }

    // Check tenant_info table
    console.log('\n3. Checking tenant_info table...');
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select('id, first_name, last_name')
      .limit(5);

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError);
    } else {
      console.log(`✅ Found ${tenants?.length || 0} tenants`);
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkLandlordsData();
