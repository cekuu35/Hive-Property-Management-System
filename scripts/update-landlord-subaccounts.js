import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 LANDLORD SUBACCOUNT MANAGEMENT');
console.log('================================\n');

async function updateLandlordSubaccounts() {
  try {
    // 1. Display current landlords and their subaccount codes
    console.log('1️⃣ CURRENT LANDLORDS AND SUBACCOUNT CODES...');
    
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
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.email})`);
      console.log(`      Current subaccount: ${landlord.subaccount_code}`);
      console.log(`      Profile ID: ${landlord.profile_id || 'None'}`);
      console.log('');
    });

    // 2. Provide instructions for updating subaccount codes
    console.log('2️⃣ HOW TO UPDATE SUBACCOUNT CODES...');
    console.log('');
    console.log('📋 You can update subaccount codes in two ways:');
    console.log('');
    console.log('🔧 METHOD 1: Update via Supabase Dashboard');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Table Editor → landlords');
    console.log('3. Edit the subaccount_code column for each landlord');
    console.log('4. Replace the placeholder codes with real Paystack subaccount codes');
    console.log('');
    console.log('🔧 METHOD 2: Update via SQL (Recommended)');
    console.log('Run this SQL in your Supabase SQL Editor:');
    console.log('');
    
    // Generate SQL for each landlord
    landlords.forEach((landlord, index) => {
      console.log(`-- Update subaccount for ${landlord.name}`);
      console.log(`UPDATE public.landlords`);
      console.log(`SET subaccount_code = 'YOUR_PAYSTACK_SUBACCOUNT_CODE_HERE'`);
      console.log(`WHERE id = '${landlord.id}';`);
      console.log('');
    });

    // 3. Show example of what real subaccount codes look like
    console.log('3️⃣ EXAMPLE OF REAL PAYSTACK SUBACCOUNT CODES...');
    console.log('');
    console.log('Real Paystack subaccount codes typically look like:');
    console.log('  - ACCT_1234567890abcdef');
    console.log('  - ACCT_abcdef1234567890');
    console.log('  - ACCT_1a2b3c4d5e6f7g8h');
    console.log('');
    console.log('Current placeholder codes:');
    landlords.forEach((landlord, index) => {
      console.log(`  - ${landlord.subaccount_code} (${landlord.name})`);
    });

    // 4. Test the payment flow with updated codes
    console.log('\n4️⃣ TESTING PAYMENT FLOW WITH UPDATED CODES...');
    console.log('');
    console.log('After updating the subaccount codes:');
    console.log('1. ✅ Rent payments will route to correct landlord subaccounts');
    console.log('2. ✅ Split payments will work automatically');
    console.log('3. ✅ Each landlord gets their share of the payment');
    console.log('4. ✅ Transaction logging will include correct subaccount codes');
    console.log('');

    // 5. Provide verification steps
    console.log('5️⃣ VERIFICATION STEPS...');
    console.log('');
    console.log('After updating subaccount codes:');
    console.log('1. Run: node scripts/test-final-system.js');
    console.log('2. Check that subaccount codes are updated');
    console.log('3. Test a rent payment to verify routing');
    console.log('4. Check Paystack dashboard for split payments');
    console.log('');

    // 6. Summary
    console.log('🎯 SUBACCOUNT CODE UPDATE SUMMARY');
    console.log('=================================');
    console.log('');
    console.log('✅ Current landlords displayed above');
    console.log('✅ SQL commands provided for easy updates');
    console.log('✅ Example subaccount codes shown');
    console.log('✅ Verification steps provided');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Get real Paystack subaccount codes from your Paystack dashboard');
    console.log('2. Update the subaccount_code column for each landlord');
    console.log('3. Test the payment flow to verify split payments work');
    console.log('4. Monitor Paystack dashboard for successful split payments');

  } catch (error) {
    console.error('❌ Error in subaccount management:', error);
  }
}

updateLandlordSubaccounts();
