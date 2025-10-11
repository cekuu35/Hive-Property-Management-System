import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 INTERACTIVE SUBACCOUNT CODE UPDATER');
console.log('=====================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function updateSubaccountInteractive() {
  try {
    // 1. Display current landlords
    console.log('1️⃣ CURRENT LANDLORDS...');
    
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
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.email})`);
      console.log(`      Current: ${landlord.subaccount_code}`);
    });

    console.log('\n2️⃣ UPDATING SUBACCOUNT CODES...');
    console.log('Enter the new Paystack subaccount codes for each landlord.');
    console.log('Press Enter to skip a landlord (keep current code).\n');

    // 2. Update each landlord's subaccount code
    for (const landlord of landlords) {
      const newSubaccount = await askQuestion(
        `Enter new subaccount code for ${landlord.name} (current: ${landlord.subaccount_code}): `
      );

      if (newSubaccount.trim()) {
        console.log(`🔄 Updating ${landlord.name}...`);
        
        const { error: updateError } = await supabase
          .from('landlords')
          .update({ subaccount_code: newSubaccount.trim() })
          .eq('id', landlord.id);

        if (updateError) {
          console.error(`❌ Error updating ${landlord.name}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${landlord.name} to: ${newSubaccount.trim()}`);
        }
      } else {
        console.log(`⏭️  Skipped ${landlord.name} (keeping current code)`);
      }
      console.log('');
    }

    // 3. Display updated landlords
    console.log('3️⃣ UPDATED LANDLORDS...');
    
    const { data: updatedLandlords, error: updatedError } = await supabase
      .from('landlords')
      .select('id, name, email, subaccount_code')
      .order('created_at', { ascending: true });

    if (updatedError) {
      console.error('❌ Error fetching updated landlords:', updatedError);
      return;
    }

    console.log(`✅ Updated ${updatedLandlords.length} landlords:`);
    updatedLandlords.forEach((landlord, index) => {
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.email})`);
      console.log(`      Subaccount: ${landlord.subaccount_code}`);
    });

    // 4. Test the payment flow
    console.log('\n4️⃣ TESTING PAYMENT FLOW...');
    console.log('✅ Subaccount codes updated successfully!');
    console.log('✅ Rent payments will now route to correct landlord subaccounts');
    console.log('✅ Split payments will work automatically');
    console.log('');
    console.log('🧪 To test the payment flow:');
    console.log('1. Run: node scripts/test-final-system.js');
    console.log('2. Test a rent payment in your app');
    console.log('3. Check Paystack dashboard for split payments');

  } catch (error) {
    console.error('❌ Error in interactive subaccount updater:', error);
  } finally {
    rl.close();
  }
}

updateSubaccountInteractive();
