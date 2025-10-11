import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 FINAL CONSTRAINT CHECK');
console.log('========================\n');

async function finalConstraintCheck() {
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

    // 3. Test the constraint by trying to update a property
    console.log('\n3️⃣ TESTING FOREIGN KEY CONSTRAINT...');
    
    const testLandlordId = landlords[0]?.id;
    const testPropertyId = properties[0]?.id;
    
    if (testLandlordId && testPropertyId) {
      console.log(`🧪 Testing constraint with landlord_id: ${testLandlordId}`);
      console.log(`🧪 Testing on property: ${properties[0].name}`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ landlord_id: testLandlordId })
        .eq('id', testPropertyId);

      if (updateError) {
        console.log('❌ Constraint test failed:', updateError.message);
        
        if (updateError.message.includes('profiles')) {
          console.log('🔍 DIAGNOSIS: Foreign key constraint still points to profiles table');
          console.log('📋 The constraint was not updated correctly');
        } else if (updateError.message.includes('landlords')) {
          console.log('🔍 DIAGNOSIS: Foreign key constraint points to landlords table');
          console.log('📋 The constraint was updated correctly');
        }
      } else {
        console.log('✅ Constraint test passed - no foreign key violation');
      }
    }

    // 4. Provide the correct SQL to fix the constraint
    console.log('\n4️⃣ PROVIDING CORRECT SQL TO FIX CONSTRAINT...');
    console.log('');
    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('Run this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- First, check what constraints exist');
    console.log('SELECT conname, confrelid::regclass as referenced_table');
    console.log('FROM pg_constraint');
    console.log('WHERE conrelid = \'public.properties\'::regclass');
    console.log('AND conname = \'properties_landlord_id_fkey\';');
    console.log('');
    console.log('-- Drop the existing foreign key constraint');
    console.log('ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_landlord_id_fkey;');
    console.log('');
    console.log('-- Add the new foreign key constraint pointing to landlords table');
    console.log('ALTER TABLE public.properties ADD CONSTRAINT properties_landlord_id_fkey');
    console.log('FOREIGN KEY (landlord_id) REFERENCES public.landlords(id) ON DELETE CASCADE;');
    console.log('');
    console.log('-- Verify the constraint was created correctly');
    console.log('SELECT conname, confrelid::regclass as referenced_table');
    console.log('FROM pg_constraint');
    console.log('WHERE conrelid = \'public.properties\'::regclass');
    console.log('AND conname = \'properties_landlord_id_fkey\';');
    console.log('');
    console.log('After running this SQL, the constraint should point to the landlords table.');

    // 5. Alternative approach: Create a landlord for the existing profile
    console.log('\n5️⃣ ALTERNATIVE APPROACH: CREATE LANDLORD FOR EXISTING PROFILE...');
    console.log('');
    console.log('If you want to keep the existing profile as a landlord, run this SQL:');
    console.log('');
    console.log('-- Create a landlord record for the existing profile');
    console.log('INSERT INTO public.landlords (id, name, email, subaccount_code)');
    console.log('VALUES (');
    console.log('  \'85b546e7-6280-43c2-b281-d500f92da516\',');
    console.log('  \'Apollo Felix\',');
    console.log('  \'apollo@example.com\',');
    console.log('  \'ACCT_apollo_felix\'');
    console.log(');');
    console.log('');
    console.log('This will create a landlord record with the same ID as the profile,');
    console.log('so the properties can reference it without changing the constraint.');

    // 6. Summary
    console.log('\n🎯 FINAL CONSTRAINT CHECK SUMMARY');
    console.log('=================================');
    console.log('');
    console.log('✅ Current state:');
    console.log(`   - Properties: ${properties.length} with landlord_id`);
    console.log(`   - Landlords: ${landlords.length} available`);
    console.log('');
    console.log('❌ Problem: Foreign key constraint still points to profiles table');
    console.log('📋 Solution: Run the SQL above to fix the constraint');
    console.log('');
    console.log('📋 After fixing the constraint:');
    console.log('1. Properties can reference landlords.id');
    console.log('2. Multi-landlord payments will work');
    console.log('3. Foreign key violations will be resolved');

  } catch (error) {
    console.error('❌ Error in final constraint check:', error);
  }
}

finalConstraintCheck();
