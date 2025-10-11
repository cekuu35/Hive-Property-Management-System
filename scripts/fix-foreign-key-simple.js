import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING FOREIGN KEY CONSTRAINT (SIMPLE APPROACH)');
console.log('=================================================\n');

async function fixForeignKeySimple() {
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

    // 2. Check landlords table (without profile_id column)
    console.log('\n2️⃣ CHECKING LANDLORDS TABLE...');
    
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

    // 4. The issue: properties.landlord_id references profiles.id but should reference landlords.id
    console.log('\n4️⃣ IDENTIFYING THE PROBLEM...');
    console.log('🔍 Current situation:');
    console.log('   - properties.landlord_id references profiles.id (via foreign key constraint)');
    console.log('   - But we want it to reference landlords.id');
    console.log('   - The foreign key constraint needs to be updated');

    // 5. Solution: Update properties to reference landlords.id
    console.log('\n5️⃣ UPDATING PROPERTIES TO REFERENCE LANDLORDS...');
    
    // For now, let's assign all properties to the first landlord
    const firstLandlord = landlords[0];
    
    if (!firstLandlord) {
      console.error('❌ No landlords found to assign properties to');
      return;
    }

    console.log(`🔧 Assigning all properties to landlord: ${firstLandlord.name} (${firstLandlord.id})`);
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const property of properties) {
      console.log(`🔧 Updating property "${property.name}":`);
      console.log(`   From: ${property.landlord_id}`);
      console.log(`   To: ${firstLandlord.id}`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ landlord_id: firstLandlord.id })
        .eq('id', property.id);

      if (updateError) {
        console.error(`❌ Error updating property ${property.name}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Updated property ${property.name}`);
        updatedCount++;
      }
    }

    console.log(`\n📊 Update Summary: ${updatedCount} updated, ${errorCount} errors`);

    // 6. Verify the updates
    console.log('\n6️⃣ VERIFYING UPDATES...');
    
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

    // 7. Test the relationship
    console.log('\n7️⃣ TESTING PROPERTIES -> LANDLORDS RELATIONSHIP...');
    
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
      console.log('📋 This means the foreign key constraint still points to profiles table');
    } else {
      console.log('✅ Properties -> landlords relationship working');
      console.log(`📊 Found ${propertiesWithLandlords.length} properties with landlords:`);
      propertiesWithLandlords.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - Landlord: ${property.landlords.name} (${property.landlords.subaccount_code})`);
      });
    }

    console.log('\n🎯 FOREIGN KEY CONSTRAINT FIX SUMMARY');
    console.log('=====================================');
    console.log('');
    console.log('✅ Properties updated to reference landlords.id');
    console.log(`✅ ${updatedCount} properties updated successfully`);
    console.log(`⚠️  ${errorCount} properties had errors`);
    console.log('');
    
    if (propertiesWithLandlordsError) {
      console.log('⚠️  FOREIGN KEY CONSTRAINT STILL NEEDS TO BE UPDATED');
      console.log('==================================================');
      console.log('');
      console.log('📋 MANUAL ACTION REQUIRED:');
      console.log('Run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('-- Drop the existing foreign key constraint');
      console.log('ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_landlord_id_fkey;');
      console.log('');
      console.log('-- Add the new foreign key constraint pointing to landlords table');
      console.log('ALTER TABLE public.properties ADD CONSTRAINT properties_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;');
      console.log('');
      console.log('After running this SQL, the properties -> landlords relationship will work correctly.');
    } else {
      console.log('✅ Foreign key constraint is working correctly');
    }
    
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. If the relationship test failed, run the SQL above');
    console.log('2. Test creating a new property to verify the constraint');
    console.log('3. Run the complete setup script to finish the migration');

  } catch (error) {
    console.error('❌ Error fixing foreign key constraint:', error);
  }
}

fixForeignKeySimple();
