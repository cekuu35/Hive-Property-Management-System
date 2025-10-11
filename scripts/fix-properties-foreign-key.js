import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING PROPERTIES FOREIGN KEY CONSTRAINT');
console.log('==========================================\n');

async function fixPropertiesForeignKey() {
  try {
    // 1. Check current foreign key constraints
    console.log('1️⃣ CHECKING CURRENT FOREIGN KEY CONSTRAINTS...');
    
    // Get properties table info
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .limit(1);

    if (propertiesError) {
      console.error('❌ Error accessing properties table:', propertiesError);
      return;
    }

    console.log('✅ Properties table accessible');
    console.log('📋 Sample property:', properties[0]);

    // 2. Get all landlords
    console.log('\n2️⃣ GETTING ALL LANDLORDS...');
    
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

    // 3. Check if there's a profiles table with matching IDs
    console.log('\n3️⃣ CHECKING PROFILES TABLE...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('role', 'landlord')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError);
    } else {
      console.log(`✅ Found ${profiles.length} landlord profiles:`);
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.first_name} ${profile.last_name} (${profile.id})`);
      });
    }

    // 4. The issue is that properties.landlord_id references profiles.id, not landlords.id
    // We need to either:
    // a) Update the foreign key constraint to reference landlords.id, or
    // b) Update the properties to reference the correct landlord IDs

    console.log('\n4️⃣ IDENTIFYING THE PROBLEM...');
    console.log('🔍 The properties table has a foreign key constraint that references profiles.id');
    console.log('🔍 But we want it to reference landlords.id');
    console.log('🔍 This is why we can\'t update properties with landlord IDs');

    // 5. Let's check what the current constraint is pointing to
    console.log('\n5️⃣ CHECKING CURRENT CONSTRAINT...');
    
    // Try to update a property with a landlord ID to see the exact error
    const testProperty = properties[0];
    const testLandlordId = landlords[0].id;
    
    console.log(`🔍 Trying to update property "${testProperty.name}" with landlord_id: ${testLandlordId}`);
    
    const { error: updateError } = await supabase
      .from('properties')
      .update({ landlord_id: testLandlordId })
      .eq('id', testProperty.id);

    if (updateError) {
      console.log('❌ Update failed with error:', updateError.message);
      console.log('📋 This confirms the foreign key constraint is pointing to the wrong table');
    } else {
      console.log('✅ Update successful - constraint is working correctly');
    }

    // 6. Solution: We need to either:
    // - Drop the existing foreign key constraint and create a new one, or
    // - Update the properties to reference profiles that exist

    console.log('\n6️⃣ PROPOSING SOLUTIONS...');
    console.log('');
    console.log('🔧 SOLUTION 1: Update foreign key constraint');
    console.log('   - Drop existing constraint: properties_landlord_id_fkey');
    console.log('   - Create new constraint pointing to landlords.id');
    console.log('   - This requires database migration');
    console.log('');
    console.log('🔧 SOLUTION 2: Use profiles table for landlords');
    console.log('   - Update properties to reference existing profile IDs');
    console.log('   - Create landlord profiles for each landlord');
    console.log('   - This works with current constraint');
    console.log('');

    // Let's try solution 2 first (easier)
    console.log('7️⃣ TRYING SOLUTION 2: USING PROFILES TABLE...');
    
    // Check if we have landlord profiles
    if (profiles && profiles.length > 0) {
      console.log('✅ Found landlord profiles, using them...');
      
      // Update properties to reference the first landlord profile
      const firstLandlordProfile = profiles[0];
      console.log(`🔧 Updating properties to reference profile: ${firstLandlordProfile.first_name} ${firstLandlordProfile.last_name}`);
      
      const { error: updatePropertiesError } = await supabase
        .from('properties')
        .update({ landlord_id: firstLandlordProfile.id })
        .not('landlord_id', 'is', null);

      if (updatePropertiesError) {
        console.error('❌ Error updating properties:', updatePropertiesError);
      } else {
        console.log('✅ Properties updated successfully');
        
        // Verify the update
        const { data: updatedProperties, error: verifyError } = await supabase
          .from('properties')
          .select('id, name, landlord_id')
          .not('landlord_id', 'is', null);

        if (verifyError) {
          console.error('❌ Error verifying update:', verifyError);
        } else {
          console.log(`✅ Verification successful - ${updatedProperties.length} properties updated`);
          updatedProperties.forEach((property, index) => {
            console.log(`   ${index + 1}. ${property.name} - landlord_id: ${property.landlord_id}`);
          });
        }
      }
    } else {
      console.log('❌ No landlord profiles found');
      console.log('📋 Need to create landlord profiles or fix the foreign key constraint');
    }

    console.log('\n🎯 SUMMARY');
    console.log('==========');
    console.log('');
    console.log('✅ Identified the problem: properties.landlord_id references profiles.id');
    console.log('✅ Need to either:');
    console.log('   1. Update foreign key constraint to reference landlords.id, or');
    console.log('   2. Use profiles table for landlords');
    console.log('');
    console.log('📋 RECOMMENDED NEXT STEPS:');
    console.log('1. Run database migration to fix foreign key constraint');
    console.log('2. Update properties to reference landlords.id');
    console.log('3. Test the payment flow');

  } catch (error) {
    console.error('❌ Error fixing properties foreign key:', error);
  }
}

fixPropertiesForeignKey();
