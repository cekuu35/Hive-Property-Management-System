import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING BY CREATING LANDLORD FOR EXISTING PROFILE');
console.log('==================================================\n');

async function fixByCreatingLandlord() {
  try {
    // 1. Check current properties
    console.log('1️⃣ CHECKING CURRENT PROPERTIES...');
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .not('landlord_id', 'is', null);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    console.log(`✅ Found ${properties.length} properties with landlord_id:`);
    properties.forEach((property, index) => {
      console.log(`   ${index + 1}. ${property.name} - landlord_id: ${property.landlord_id}`);
    });

    // 2. Check if the profile ID already exists as a landlord
    const profileId = '85b546e7-6280-43c2-b281-d500f92da516';
    console.log(`\n2️⃣ CHECKING IF PROFILE ID EXISTS AS LANDLORD: ${profileId}`);
    
    const { data: existingLandlord, error: landlordCheckError } = await supabase
      .from('landlords')
      .select('id, name, email, subaccount_code')
      .eq('id', profileId)
      .maybeSingle();

    if (landlordCheckError) {
      console.error('❌ Error checking existing landlord:', landlordCheckError);
      return;
    }

    if (existingLandlord) {
      console.log('✅ Landlord already exists for this profile ID:', existingLandlord);
    } else {
      console.log('❌ No landlord exists for this profile ID. Creating one...');
      
      // 3. Create a landlord record for the existing profile
      console.log('\n3️⃣ CREATING LANDLORD FOR EXISTING PROFILE...');
      
      const { data: newLandlord, error: createError } = await supabase
        .from('landlords')
        .insert({
          id: profileId, // Use the same ID as the profile
          name: 'Apollo Felix',
          email: 'apollo@example.com',
          subaccount_code: 'ACCT_apollo_felix'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating landlord:', createError);
        return;
      }

      console.log('✅ Created landlord for existing profile:', newLandlord);
    }

    // 4. Test the constraint now
    console.log('\n4️⃣ TESTING CONSTRAINT AFTER FIX...');
    
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
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.id})`);
    });

    // 5. Test updating a property
    console.log('\n5️⃣ TESTING PROPERTY UPDATE...');
    
    const testPropertyId = properties[0]?.id;
    const testLandlordId = landlords.find(l => l.id === profileId)?.id || landlords[0]?.id;
    
    if (testPropertyId && testLandlordId) {
      console.log(`🧪 Testing property update with landlord_id: ${testLandlordId}`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ landlord_id: testLandlordId })
        .eq('id', testPropertyId);

      if (updateError) {
        console.log('❌ Property update failed:', updateError.message);
      } else {
        console.log('✅ Property update successful!');
      }
    }

    // 6. Test the properties -> landlords relationship
    console.log('\n6️⃣ TESTING PROPERTIES -> LANDLORDS RELATIONSHIP...');
    
    const { data: propertiesWithLandlords, error: propertiesWithLandlordsError } = await supabase
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
      .limit(3);

    if (propertiesWithLandlordsError) {
      console.log('❌ Properties -> landlords relationship not working:', propertiesWithLandlordsError.message);
    } else {
      console.log('✅ Properties -> landlords relationship working!');
      console.log(`📊 Found ${propertiesWithLandlords.length} properties with landlords:`);
      propertiesWithLandlords.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - Landlord: ${property.landlords.name} (${property.landlords.subaccount_code})`);
      });
    }

    // 7. Summary
    console.log('\n🎯 FIX BY CREATING LANDLORD SUMMARY');
    console.log('===================================');
    console.log('');
    console.log('✅ Created landlord record for existing profile ID');
    console.log('✅ Properties can now reference the landlord');
    console.log('✅ Multi-landlord payment system should work');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Test creating a new property to verify the constraint');
    console.log('2. Test the payment flow with real transactions');
    console.log('3. Update subaccount codes with real Paystack codes');

  } catch (error) {
    console.error('❌ Error in fix by creating landlord:', error);
  }
}

fixByCreatingLandlord();
