import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING PROPERTIES LANDLORD REFERENCES');
console.log('=======================================\n');

async function fixPropertiesLandlord() {
  try {
    // 1. Check if landlords table exists and has data
    console.log('1️⃣ CHECKING LANDLORDS TABLE...');
    
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, name, email, subaccount_code')
      .order('created_at', { ascending: true });

    if (landlordsError) {
      console.error('❌ Error fetching landlords:', landlordsError);
      return;
    }

    console.log(`✅ Found ${landlords.length} landlords:`);
    landlords.forEach((landlord, index) => {
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.email}) - ${landlord.subaccount_code}`);
    });

    if (landlords.length === 0) {
      console.log('⚠️ No landlords found. Creating a default landlord...');
      
      const { data: defaultLandlord, error: createError } = await supabase
        .from('landlords')
        .insert({
          name: 'Default Landlord',
          email: 'default@landlord.com',
          phone: '+254700000000',
          subaccount_code: 'ACCT_default_landlord'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating default landlord:', createError);
        return;
      }

      console.log('✅ Created default landlord:', defaultLandlord);
      landlords.push(defaultLandlord);
    }

    const defaultLandlordId = landlords[0].id;
    console.log(`✅ Using default landlord ID: ${defaultLandlordId}`);

    // 2. Check properties without landlord_id
    console.log('\n2️⃣ CHECKING PROPERTIES WITHOUT LANDLORD_ID...');
    
    const { data: propertiesWithoutLandlord, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .is('landlord_id', null);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    console.log(`✅ Found ${propertiesWithoutLandlord.length} properties without landlord_id:`);
    propertiesWithoutLandlord.forEach((property, index) => {
      console.log(`   ${index + 1}. ${property.name} (ID: ${property.id})`);
    });

    // 3. Update properties to reference the default landlord
    if (propertiesWithoutLandlord.length > 0) {
      console.log('\n3️⃣ UPDATING PROPERTIES TO REFERENCE DEFAULT LANDLORD...');
      
      const propertyIds = propertiesWithoutLandlord.map(p => p.id);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ landlord_id: defaultLandlordId })
        .in('id', propertyIds);

      if (updateError) {
        console.error('❌ Error updating properties:', updateError);
        return;
      }

      console.log(`✅ Updated ${propertyIds.length} properties to reference default landlord`);
    }

    // 4. Verify the fix
    console.log('\n4️⃣ VERIFYING FIX...');
    
    const { data: allProperties, error: allPropertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        landlord_id,
        landlords!inner(
          id,
          name,
          subaccount_code
        )
      `)
      .limit(10);

    if (allPropertiesError) {
      console.error('❌ Error fetching all properties:', allPropertiesError);
    } else {
      console.log(`✅ Found ${allProperties.length} properties with landlords:`);
      allProperties.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - Landlord: ${property.landlords.name} (${property.landlords.subaccount_code})`);
      });
    }

    // 5. Check for any remaining null landlord_id values
    const { data: nullLandlordProperties, error: nullError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .is('landlord_id', null);

    if (nullError) {
      console.error('❌ Error checking for null landlord_id:', nullError);
    } else if (nullLandlordProperties.length > 0) {
      console.log(`⚠️ Warning: ${nullLandlordProperties.length} properties still have null landlord_id`);
      nullLandlordProperties.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} (ID: ${property.id})`);
      });
    } else {
      console.log('✅ All properties now have a landlord_id assigned');
    }

    console.log('\n🎉 PROPERTIES LANDLORD REFERENCES FIXED!');
    console.log('========================================');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Run the database migrations to add constraints');
    console.log('2. Update landlord information with real Paystack subaccount codes');
    console.log('3. Test the multi-landlord payment flow');

  } catch (error) {
    console.error('❌ Error fixing properties landlord references:', error);
  }
}

fixPropertiesLandlord();
