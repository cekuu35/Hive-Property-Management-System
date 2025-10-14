import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSubaccount() {
  console.log('🔧 Fixing subaccount codes...\n');

  try {
    // 1. List current subaccount codes
    console.log('1️⃣ Current subaccount codes in database:');
    const { data: landlords, error: landlordError } = await supabase
      .from('landlords')
      .select('id, name, email, subaccount_code')
      .order('created_at', { ascending: false });

    if (landlordError) {
      console.error('❌ Error fetching landlords:', landlordError);
      return;
    }

    landlords.forEach((landlord, index) => {
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.email})`);
      console.log(`      Current: ${landlord.subaccount_code || 'NOT SET'}`);
    });

    // 2. Update with valid subaccount code
    console.log('\n2️⃣ Updating with valid subaccount code...');
    
    // Update the first landlord (Apollo Felix) with the valid subaccount
    const validSubaccount = 'ACCT_ostc0wp0o85key6';
    
    const { error: updateError } = await supabase
      .from('landlords')
      .update({ subaccount_code: validSubaccount })
      .eq('id', '85b546e7-6280-43c2-b281-d500f92da516'); // Apollo Felix's ID

    if (updateError) {
      console.error('❌ Error updating landlord:', updateError);
      return;
    }

    console.log(`✅ Updated Apollo Felix with valid subaccount: ${validSubaccount}`);

    // 3. Verify the update
    console.log('\n3️⃣ Verifying update...');
    const { data: updatedLandlord, error: verifyError } = await supabase
      .from('landlords')
      .select('id, name, subaccount_code')
      .eq('id', '85b546e7-6280-43c2-b281-d500f92da516')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log(`✅ Verification successful:`);
    console.log(`   Landlord: ${updatedLandlord.name}`);
    console.log(`   Subaccount: ${updatedLandlord.subaccount_code}`);

    console.log('\n🎉 Subaccount fixed! The payment should now work.');
    console.log('💡 Try the payment again in your application.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixSubaccount().catch(console.error);

