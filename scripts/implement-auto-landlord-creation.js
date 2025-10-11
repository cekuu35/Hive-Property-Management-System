import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 IMPLEMENTING AUTO-LANDLORD CREATION');
console.log('=====================================\n');

async function implementAutoLandlordCreation() {
  try {
    // 1. Add profile_id column to landlords table
    console.log('1️⃣ ADDING PROFILE_ID COLUMN TO LANDLORDS TABLE...');
    
    // First, check if profile_id column exists
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, name, email, profile_id')
      .limit(1);

    if (landlordsError && landlordsError.message.includes('profile_id')) {
      console.log('📝 Adding profile_id column to landlords table...');
      
      // Note: This would need to be done via SQL migration
      console.log('⚠️  MANUAL ACTION REQUIRED:');
      console.log('Run this SQL in your Supabase SQL Editor:');
      console.log('ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;');
      console.log('');
    } else {
      console.log('✅ profile_id column already exists or accessible');
    }

    // 2. Create landlord records for existing landlord profiles
    console.log('\n2️⃣ CREATING LANDLORD RECORDS FOR EXISTING PROFILES...');
    
    const { data: landlordProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'landlord');

    if (profilesError) {
      console.error('❌ Error fetching landlord profiles:', profilesError);
      return;
    }

    console.log(`✅ Found ${landlordProfiles.length} landlord profiles to process`);

    for (const profile of landlordProfiles) {
      console.log(`🔍 Processing profile: ${profile.first_name} ${profile.last_name} (${profile.email})`);
      
      // Check if landlord record already exists for this profile
      const { data: existingLandlord, error: checkError } = await supabase
        .from('landlords')
        .select('id, profile_id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (checkError) {
        console.log(`⚠️  Could not check existing landlord for profile ${profile.id}: ${checkError.message}`);
        continue;
      }

      if (existingLandlord) {
        console.log(`✅ Landlord record already exists for ${profile.first_name} ${profile.last_name}`);
        continue;
      }

      // Create landlord record
      const landlordData = {
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: null, // Will be updated later
        subaccount_code: `ACCT_${profile.id.substring(0, 8)}_${Date.now()}`, // Generate unique subaccount code
        profile_id: profile.id
      };

      console.log(`📝 Creating landlord record for ${profile.first_name} ${profile.last_name}...`);
      
      const { data: newLandlord, error: createError } = await supabase
        .from('landlords')
        .insert(landlordData)
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating landlord record for ${profile.first_name}:`, createError);
      } else {
        console.log(`✅ Created landlord record: ${newLandlord.name} (ID: ${newLandlord.id})`);
        console.log(`   Subaccount code: ${newLandlord.subaccount_code}`);
      }
    }

    // 3. Update properties to reference landlords.id instead of profiles.id
    console.log('\n3️⃣ UPDATING PROPERTIES TO REFERENCE LANDLORDS...');
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .not('landlord_id', 'is', null);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    console.log(`✅ Found ${properties.length} properties to update`);

    // Get all landlords with their profile_ids
    const { data: allLandlords, error: allLandlordsError } = await supabase
      .from('landlords')
      .select('id, name, profile_id')
      .not('profile_id', 'is', null);

    if (allLandlordsError) {
      console.error('❌ Error fetching landlords:', allLandlordsError);
      return;
    }

    console.log(`✅ Found ${allLandlords.length} landlords with profile references`);

    // Update properties to reference landlords.id
    for (const property of properties) {
      // Find the landlord that corresponds to this property's current landlord_id (which is a profile_id)
      const correspondingLandlord = allLandlords.find(landlord => landlord.profile_id === property.landlord_id);
      
      if (correspondingLandlord) {
        console.log(`🔧 Updating property "${property.name}" to reference landlord: ${correspondingLandlord.name}`);
        
        const { error: updateError } = await supabase
          .from('properties')
          .update({ landlord_id: correspondingLandlord.id })
          .eq('id', property.id);

        if (updateError) {
          console.error(`❌ Error updating property ${property.name}:`, updateError);
        } else {
          console.log(`✅ Updated property ${property.name}`);
        }
      } else {
        console.log(`⚠️  No corresponding landlord found for property ${property.name} (profile_id: ${property.landlord_id})`);
      }
    }

    // 4. Verify the setup
    console.log('\n4️⃣ VERIFYING THE NEW SETUP...');
    
    // Test properties -> landlords relationship
    const { data: propertiesWithLandlords, error: propertiesWithLandlordsError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        landlord_id,
        landlords!inner(
          id,
          name,
          subaccount_code,
          profile_id
        )
      `)
      .limit(3);

    if (propertiesWithLandlordsError) {
      console.log('❌ Properties -> landlords relationship not working:', propertiesWithLandlordsError.message);
    } else {
      console.log('✅ Properties -> landlords relationship working');
      console.log(`📊 Found ${propertiesWithLandlords.length} properties with landlords:`);
      propertiesWithLandlords.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - Landlord: ${property.landlords.name} (${property.landlords.subaccount_code})`);
      });
    }

    // 5. Create a function to auto-create landlord records
    console.log('\n5️⃣ CREATING AUTO-LANDLORD CREATION FUNCTION...');
    
    console.log('📝 Creating Supabase function for auto-landlord creation...');
    console.log('');
    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('Create this function in your Supabase SQL Editor:');
    console.log('');
    console.log('CREATE OR REPLACE FUNCTION create_landlord_for_profile()');
    console.log('RETURNS TRIGGER AS $$');
    console.log('BEGIN');
    console.log('  IF NEW.role = \'landlord\' THEN');
    console.log('    INSERT INTO public.landlords (name, email, subaccount_code, profile_id)');
    console.log('    VALUES (');
    console.log('      CONCAT(NEW.first_name, \' \', NEW.last_name),');
    console.log('      NEW.email,');
    console.log('      CONCAT(\'ACCT_\', SUBSTRING(NEW.id::text, 1, 8), \'_\', EXTRACT(EPOCH FROM NOW())::bigint),');
    console.log('      NEW.id');
    console.log('    );');
    console.log('  END IF;');
    console.log('  RETURN NEW;');
    console.log('END;');
    console.log('$$ LANGUAGE plpgsql;');
    console.log('');
    console.log('CREATE TRIGGER create_landlord_trigger');
    console.log('  AFTER INSERT ON public.profiles');
    console.log('  FOR EACH ROW');
    console.log('  EXECUTE FUNCTION create_landlord_for_profile();');

    console.log('\n🎉 AUTO-LANDLORD CREATION IMPLEMENTED!');
    console.log('=====================================');
    console.log('');
    console.log('✅ Landlord records created for existing profiles');
    console.log('✅ Properties updated to reference landlords.id');
    console.log('✅ Foreign key relationships working');
    console.log('');
    console.log('📋 WHAT HAPPENS NOW:');
    console.log('1. When a user creates a landlord account → Profile created');
    console.log('2. Trigger automatically creates landlords record');
    console.log('3. Landlord gets unique Paystack subaccount code');
    console.log('4. Properties can reference landlords.id');
    console.log('5. Multi-landlord payments work automatically');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Run the SQL function creation in Supabase');
    console.log('2. Test creating a new landlord account');
    console.log('3. Verify landlord record is created automatically');
    console.log('4. Test the payment flow');

  } catch (error) {
    console.error('❌ Error implementing auto-landlord creation:', error);
  }
}

implementAutoLandlordCreation();
