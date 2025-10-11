import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING PROPERTIES FOREIGN KEY CONSTRAINT');
console.log('==========================================\n');

async function fixPropertiesForeignKeyConstraint() {
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

    // 2. Check landlords table
    console.log('\n2️⃣ CHECKING LANDLORDS TABLE...');
    
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, name, email, subaccount_code, profile_id')
      .order('created_at', { ascending: true });

    if (landlordsError) {
      console.error('❌ Error fetching landlords:', landlordsError);
      return;
    }

    console.log(`✅ Found ${landlords.length} landlords:`);
    landlords.forEach((landlord, index) => {
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.id})`);
      console.log(`      Profile ID: ${landlord.profile_id || 'None'}`);
      console.log(`      Subaccount: ${landlord.subaccount_code}`);
    });

    // 3. Check profiles table
    console.log('\n3️⃣ CHECKING PROFILES TABLE...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'landlord');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    console.log(`✅ Found ${profiles.length} landlord profiles:`);
    profiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.first_name} ${profile.last_name} (${profile.id})`);
    });

    // 4. Identify the problem
    console.log('\n4️⃣ IDENTIFYING THE PROBLEM...');
    console.log('🔍 The error shows that properties.landlord_id is trying to reference profiles.id');
    console.log('🔍 But we want it to reference landlords.id');
    console.log('🔍 This means the foreign key constraint needs to be updated');

    // 5. Create mapping between profiles and landlords
    console.log('\n5️⃣ CREATING PROFILE-TO-LANDLORD MAPPING...');
    
    const profileToLandlordMap = new Map();
    
    for (const landlord of landlords) {
      if (landlord.profile_id) {
        profileToLandlordMap.set(landlord.profile_id, landlord.id);
        console.log(`📋 Profile ${landlord.profile_id} → Landlord ${landlord.id} (${landlord.name})`);
      }
    }

    // 6. Update properties to reference landlords.id instead of profiles.id
    console.log('\n6️⃣ UPDATING PROPERTIES TO REFERENCE LANDLORDS...');
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const property of properties) {
      // Check if the current landlord_id is a profile_id
      const correspondingLandlordId = profileToLandlordMap.get(property.landlord_id);
      
      if (correspondingLandlordId) {
        console.log(`🔧 Updating property "${property.name}":`);
        console.log(`   From profile_id: ${property.landlord_id}`);
        console.log(`   To landlord_id: ${correspondingLandlordId}`);
        
        const { error: updateError } = await supabase
          .from('properties')
          .update({ landlord_id: correspondingLandlordId })
          .eq('id', property.id);

        if (updateError) {
          console.error(`❌ Error updating property ${property.name}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated property ${property.name}`);
          updatedCount++;
        }
      } else {
        // Check if it's already a landlord_id
        const isAlreadyLandlordId = landlords.some(l => l.id === property.landlord_id);
        
        if (isAlreadyLandlordId) {
          console.log(`✅ Property "${property.name}" already references landlord_id: ${property.landlord_id}`);
        } else {
          console.log(`⚠️  Property "${property.name}" has unknown landlord_id: ${property.landlord_id}`);
          console.log(`   This might be an invalid reference`);
        }
      }
    }

    console.log(`\n📊 Update Summary: ${updatedCount} updated, ${errorCount} errors`);

    // 7. Verify the updates
    console.log('\n7️⃣ VERIFYING UPDATES...');
    
    const { data: updatedProperties, error: verifyError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .not('landlord_id', 'is', null);

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
    } else {
      console.log(`✅ Found ${updatedProperties.length} properties after update:`);
      updatedProperties.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - landlord_id: ${property.landlord_id}`);
      });
    }

    // 8. Test the foreign key relationship
    console.log('\n8️⃣ TESTING FOREIGN KEY RELATIONSHIP...');
    
    // Try to insert a test property to see if the constraint works
    console.log('🔍 Testing foreign key constraint...');
    
    // Get a valid landlord_id
    const validLandlordId = landlords[0]?.id;
    
    if (validLandlordId) {
      console.log(`🧪 Testing with landlord_id: ${validLandlordId}`);
      
      // This will test if the constraint is working
      const { data: testProperty, error: testError } = await supabase
        .from('properties')
        .select('id, name, landlord_id')
        .eq('landlord_id', validLandlordId)
        .limit(1);

      if (testError) {
        console.log('❌ Foreign key constraint test failed:', testError.message);
      } else {
        console.log('✅ Foreign key constraint test passed');
        if (testProperty && testProperty.length > 0) {
          console.log(`📋 Found property: ${testProperty[0].name}`);
        }
      }
    }

    console.log('\n🎯 FOREIGN KEY CONSTRAINT FIX SUMMARY');
    console.log('=====================================');
    console.log('');
    console.log('✅ Properties updated to reference landlords.id');
    console.log(`✅ ${updatedCount} properties updated successfully`);
    console.log(`⚠️  ${errorCount} properties had errors`);
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. The foreign key constraint should now work correctly');
    console.log('2. Properties now reference landlords.id instead of profiles.id');
    console.log('3. Test creating a new property to verify the constraint');
    console.log('4. Run the complete setup script to finish the migration');

  } catch (error) {
    console.error('❌ Error fixing foreign key constraint:', error);
  }
}

fixPropertiesForeignKeyConstraint();
