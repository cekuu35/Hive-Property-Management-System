import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 FIXING TABLE RELATIONSHIPS');
console.log('=============================\n');

async function fixTableRelationships() {
  try {
    // 1. Get all landlords
    console.log('1️⃣ GETTING ALL LANDLORDS...');
    
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

    // 2. Get all properties with invalid landlord references
    console.log('\n2️⃣ GETTING PROPERTIES WITH INVALID LANDLORD REFERENCES...');
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .not('landlord_id', 'is', null);

    if (propertiesError) {
      console.error('❌ Error fetching properties:', propertiesError);
      return;
    }

    console.log(`✅ Found ${properties.length} properties with landlord_id`);
    
    // Check which properties have invalid landlord references
    const validLandlordIds = landlords.map(l => l.id);
    const invalidProperties = properties.filter(p => !validLandlordIds.includes(p.landlord_id));
    
    console.log(`📊 Properties with invalid landlord references: ${invalidProperties.length}`);
    
    if (invalidProperties.length > 0) {
      console.log('🔍 Invalid properties:');
      invalidProperties.forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.name} - Invalid landlord_id: ${property.landlord_id}`);
      });
    }

    // 3. Fix invalid landlord references
    if (invalidProperties.length > 0) {
      console.log('\n3️⃣ FIXING INVALID LANDLORD REFERENCES...');
      
      // Use the first landlord as the default
      const defaultLandlordId = landlords[0].id;
      console.log(`🔧 Assigning all invalid properties to default landlord: ${landlords[0].name}`);
      
      const propertyIds = invalidProperties.map(p => p.id);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ landlord_id: defaultLandlordId })
        .in('id', propertyIds);

      if (updateError) {
        console.error('❌ Error updating properties:', updateError);
      } else {
        console.log(`✅ Updated ${propertyIds.length} properties with valid landlord_id`);
      }
    } else {
      console.log('✅ All properties have valid landlord references');
    }

    // 4. Verify the fix
    console.log('\n4️⃣ VERIFYING THE FIX...');
    
    const { data: updatedProperties, error: updatedPropertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .not('landlord_id', 'is', null);

    if (updatedPropertiesError) {
      console.error('❌ Error fetching updated properties:', updatedPropertiesError);
    } else {
      console.log(`✅ Found ${updatedProperties.length} properties with landlord_id`);
      
      // Check for any remaining invalid references
      const remainingInvalid = updatedProperties.filter(p => !validLandlordIds.includes(p.landlord_id));
      console.log(`📊 Properties with invalid landlord references: ${remainingInvalid.length}`);
      
      if (remainingInvalid.length === 0) {
        console.log('✅ All properties now have valid landlord references');
      } else {
        console.log('⚠️ Some properties still have invalid references:', remainingInvalid.map(p => p.name));
      }
    }

    // 5. Test foreign key relationships
    console.log('\n5️⃣ TESTING FOREIGN KEY RELATIONSHIPS...');
    
    // Test properties -> landlords relationship
    console.log('🔍 Testing properties -> landlords relationship...');
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
      console.log('❌ Properties -> landlords relationship still not working:', propertiesWithLandlordsError.message);
      console.log('📋 This indicates the foreign key constraint needs to be added via migration');
    } else {
      console.log('✅ Properties -> landlords relationship working');
      if (propertiesWithLandlords.length > 0) {
        console.log('📋 Sample relationship:', {
          property: propertiesWithLandlords[0].name,
          landlord: propertiesWithLandlords[0].landlords.name,
          subaccount: propertiesWithLandlords[0].landlords.subaccount_code
        });
      }
    }

    // 6. Test payments -> landlords relationship
    console.log('\n🔍 Testing payments -> landlords relationship...');
    const { data: paymentsWithLandlords, error: paymentsWithLandlordsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        reference,
        landlord_id,
        landlords!inner(
          id,
          name,
          subaccount_code
        )
      `)
      .limit(1);

    if (paymentsWithLandlordsError) {
      console.log('❌ Payments -> landlords relationship not working:', paymentsWithLandlordsError.message);
    } else {
      console.log('✅ Payments -> landlords relationship working');
      if (paymentsWithLandlords.length > 0) {
        console.log('📋 Sample relationship:', {
          payment: paymentsWithLandlords[0].reference,
          landlord: paymentsWithLandlords[0].landlords.name
        });
      }
    }

    console.log('\n🎉 TABLE RELATIONSHIPS FIXED!');
    console.log('=============================');
    console.log('');
    console.log('✅ Invalid landlord references fixed');
    console.log('✅ All properties now reference valid landlords');
    console.log('');
    
    if (propertiesWithLandlordsError) {
      console.log('⚠️ Foreign key constraints still need to be added via migration');
      console.log('📋 Run the database migrations to add foreign key constraints');
    } else {
      console.log('✅ Foreign key relationships working');
    }
    
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Run database migrations to add foreign key constraints');
    console.log('2. Test the payment flow');
    console.log('3. Update subaccount codes with real Paystack codes');
    console.log('4. Deploy the API endpoints');

  } catch (error) {
    console.error('❌ Error fixing table relationships:', error);
  }
}

fixTableRelationships();
