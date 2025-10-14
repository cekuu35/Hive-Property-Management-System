import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateLandlordsMpesaConfig() {
  console.log('🚀 Updating landlords with M-Pesa configuration...\n');

  try {
    // 1. Check current landlords
    console.log('📋 Fetching current landlords...');
    const { data: landlords, error: fetchError } = await supabase
      .from('landlords')
      .select('id, name, email, paybill_number, account_reference')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching landlords:', fetchError);
      return;
    }

    console.log(`✅ Found ${landlords.length} landlords`);
    
    // 2. Check which landlords need M-Pesa configuration
    const landlordsNeedingConfig = landlords.filter(landlord => 
      !landlord.paybill_number || !landlord.account_reference
    );

    console.log(`📊 Landlords needing M-Pesa config: ${landlordsNeedingConfig.length}`);
    
    if (landlordsNeedingConfig.length === 0) {
      console.log('✅ All landlords already have M-Pesa configuration!');
      return;
    }

    // 3. Display landlords that need configuration
    console.log('\n📋 Landlords needing M-Pesa configuration:');
    landlordsNeedingConfig.forEach((landlord, index) => {
      console.log(`${index + 1}. ${landlord.name} (${landlord.email})`);
      console.log(`   Current paybill: ${landlord.paybill_number || 'Not set'}`);
      console.log(`   Current account ref: ${landlord.account_reference || 'Not set'}`);
    });

    // 4. Update landlords with default M-Pesa configuration
    console.log('\n🔧 Updating landlords with default M-Pesa configuration...');
    
    const updatePromises = landlordsNeedingConfig.map(landlord => {
      const defaultPaybill = '174379'; // Sandbox paybill
      const defaultAccountRef = `RENT_${landlord.name.toUpperCase().replace(/\s+/g, '_')}`;
      
      console.log(`   Updating ${landlord.name}:`);
      console.log(`     Paybill: ${defaultPaybill}`);
      console.log(`     Account Reference: ${defaultAccountRef}`);
      
      return supabase
        .from('landlords')
        .update({
          paybill_number: defaultPaybill,
          account_reference: defaultAccountRef
        })
        .eq('id', landlord.id);
    });

    const results = await Promise.all(updatePromises);
    
    // 5. Check results
    const errors = results.filter(result => result.error);
    const successful = results.filter(result => !result.error);
    
    console.log(`\n📊 Update Results:`);
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error.message}`);
      });
    }

    // 6. Verify final state
    console.log('\n🔍 Verifying final state...');
    const { data: updatedLandlords, error: verifyError } = await supabase
      .from('landlords')
      .select('id, name, paybill_number, account_reference')
      .order('created_at', { ascending: true });

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
      return;
    }

    const fullyConfigured = updatedLandlords.filter(landlord => 
      landlord.paybill_number && landlord.account_reference
    );

    console.log(`✅ Final verification:`);
    console.log(`   Total landlords: ${updatedLandlords.length}`);
    console.log(`   Fully configured: ${fullyConfigured.length}`);
    console.log(`   Configuration rate: ${Math.round((fullyConfigured.length / updatedLandlords.length) * 100)}%`);

    console.log('\n🎉 M-Pesa configuration update complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Access the admin portal at http://localhost:8080/admin');
    console.log('2. Review and customize M-Pesa configurations for each landlord');
    console.log('3. Update paybill numbers with real M-Pesa Business accounts');
    console.log('4. Test M-Pesa STK Push payments');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the update
updateLandlordsMpesaConfig().catch(console.error);

