import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🏠 CREATING SAMPLE LANDLORDS');
console.log('============================\n');

async function createSampleLandlords() {
  try {
    // Sample landlords with Paystack subaccount codes
    const sampleLandlords = [
      {
        name: 'John Smith Properties',
        email: 'john@smithproperties.com',
        phone: '+254712345678',
        subaccount_code: 'ACCT_landlord1_1234567890' // Replace with actual Paystack subaccount code
      },
      {
        name: 'Mary Johnson Real Estate',
        email: 'mary@johnsonrealestate.com',
        phone: '+254723456789',
        subaccount_code: 'ACCT_landlord2_0987654321' // Replace with actual Paystack subaccount code
      },
      {
        name: 'David Wilson Holdings',
        email: 'david@wilsonholdings.com',
        phone: '+254734567890',
        subaccount_code: 'ACCT_landlord3_1122334455' // Replace with actual Paystack subaccount code
      }
    ];

    console.log('1️⃣ CREATING SAMPLE LANDLORDS...');
    
    for (const landlord of sampleLandlords) {
      console.log(`🔍 Creating landlord: ${landlord.name}`);
      
      const { data, error } = await supabase
        .from('landlords')
        .insert(landlord)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating landlord ${landlord.name}:`, error);
      } else {
        console.log(`✅ Created landlord: ${data.name} (ID: ${data.id})`);
      }
    }

    console.log('\n2️⃣ UPDATING EXISTING PROPERTIES...');
    
    // Get all properties that don't have a landlord_id
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .is('landlord_id', null)
      .limit(10);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
    } else {
      console.log(`Found ${properties.length} properties without landlord_id`);
      
      // Get the first landlord to assign to properties
      const { data: firstLandlord } = await supabase
        .from('landlords')
        .select('id')
        .limit(1)
        .single();

      if (firstLandlord) {
        for (const property of properties) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ landlord_id: firstLandlord.id })
            .eq('id', property.id);

          if (updateError) {
            console.error(`❌ Error updating property ${property.name}:`, updateError);
          } else {
            console.log(`✅ Updated property: ${property.name}`);
          }
        }
      }
    }

    console.log('\n3️⃣ VERIFYING SETUP...');
    
    // Check landlords
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, name, email, subaccount_code')
      .order('created_at', { ascending: false });

    if (landlordsError) {
      console.error('❌ Error fetching landlords:', landlordsError);
    } else {
      console.log(`✅ Found ${landlords.length} landlords:`);
      landlords.forEach((landlord, index) => {
        console.log(`   ${index + 1}. ${landlord.name} (${landlord.email}) - ${landlord.subaccount_code}`);
      });
    }

    // Check properties with landlords
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
      .not('landlord_id', 'is', null)
      .limit(5);

    if (propertiesWithLandlordsError) {
      console.error('❌ Error fetching properties with landlords:', propertiesWithLandlordsError);
    } else {
      console.log(`✅ Found ${propertiesWithLandlords.length} properties with landlords:`);
      propertiesWithLandlords.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - Landlord: ${property.landlords.name} (${property.landlords.subaccount_code})`);
      });
    }

    console.log('\n🎉 SAMPLE LANDLORDS CREATED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Update the subaccount_code values with real Paystack subaccount codes');
    console.log('2. Test the payment flow with different landlords');
    console.log('3. Verify that payments are routed to the correct subaccounts');
    console.log('');
    console.log('⚠️  IMPORTANT: Replace the sample subaccount codes with real Paystack subaccount codes!');

  } catch (error) {
    console.error('❌ Error creating sample landlords:', error);
  }
}

createSampleLandlords();
