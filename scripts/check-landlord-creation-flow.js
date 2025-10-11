import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 CHECKING LANDLORD CREATION FLOW');
console.log('==================================\n');

async function checkLandlordCreationFlow() {
  try {
    // 1. Check current landlords table
    console.log('1️⃣ CURRENT LANDLORDS TABLE...');
    
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, name, email, phone, subaccount_code, created_at')
      .order('created_at', { ascending: true });

    if (landlordsError) {
      console.error('❌ Error fetching landlords:', landlordsError);
      return;
    }

    console.log(`✅ Found ${landlords.length} landlords in landlords table:`);
    landlords.forEach((landlord, index) => {
      console.log(`   ${index + 1}. ${landlord.name} (${landlord.email}) - ${landlord.subaccount_code}`);
    });

    // 2. Check profiles table for landlord role
    console.log('\n2️⃣ CURRENT PROFILES TABLE (LANDLORD ROLE)...');
    
    const { data: landlordProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, created_at')
      .eq('role', 'landlord')
      .order('created_at', { ascending: true });

    if (profilesError) {
      console.error('❌ Error fetching landlord profiles:', profilesError);
      return;
    }

    console.log(`✅ Found ${landlordProfiles.length} landlord profiles:`);
    landlordProfiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.first_name} ${profile.last_name} (${profile.email})`);
    });

    // 3. Check if there's a relationship between landlords and profiles
    console.log('\n3️⃣ CHECKING LANDLORD-PROFILE RELATIONSHIPS...');
    
    // Check if landlords table has profile_id column
    const { data: landlordWithProfile, error: landlordWithProfileError } = await supabase
      .from('landlords')
      .select('id, name, email, profile_id')
      .not('profile_id', 'is', null)
      .limit(1);

    if (landlordWithProfileError) {
      console.log('❌ No profile_id column in landlords table or no relationships found');
      console.log('📋 This means landlords and profiles are separate entities');
    } else {
      console.log('✅ Found landlord-profile relationships:');
      landlordWithProfile.forEach((landlord, index) => {
        console.log(`   ${index + 1}. ${landlord.name} - Profile ID: ${landlord.profile_id}`);
      });
    }

    // 4. Analyze the current flow
    console.log('\n4️⃣ CURRENT LANDLORD CREATION FLOW ANALYSIS...');
    
    if (landlords.length > 0 && landlordProfiles.length > 0) {
      console.log('📊 Current System:');
      console.log('   - Landlords table: Stores business info + Paystack subaccount codes');
      console.log('   - Profiles table: Stores user account info (auth, personal details)');
      console.log('   - Properties reference profiles.id (not landlords.id)');
      console.log('');
      console.log('🔍 This means:');
      console.log('   - When a user creates a landlord account, they get a profile record');
      console.log('   - The landlords table is separate and needs manual entry');
      console.log('   - Properties are linked to profiles, not landlords table');
    }

    // 5. Suggest improvements
    console.log('\n5️⃣ RECOMMENDED IMPROVEMENTS...');
    console.log('');
    console.log('🔧 OPTION 1: Auto-create landlord record when profile is created');
    console.log('   - When user signs up with role="landlord", auto-create landlords record');
    console.log('   - Link landlords.profile_id to profiles.id');
    console.log('   - This ensures every landlord profile has a corresponding landlords record');
    console.log('');
    console.log('🔧 OPTION 2: Merge landlords into profiles table');
    console.log('   - Add subaccount_code column to profiles table');
    console.log('   - Remove landlords table entirely');
    console.log('   - Update properties to reference profiles.id directly');
    console.log('');
    console.log('🔧 OPTION 3: Keep current system but improve workflow');
    console.log('   - Add profile_id column to landlords table');
    console.log('   - Create landlords record when landlord profile is created');
    console.log('   - Update properties to reference landlords.id instead of profiles.id');

    // 6. Check what the ideal flow should be
    console.log('\n6️⃣ IDEAL LANDLORD CREATION FLOW...');
    console.log('');
    console.log('📋 When a user creates a landlord account:');
    console.log('1. ✅ User signs up with role="landlord"');
    console.log('2. ✅ Profile record created in profiles table');
    console.log('3. ✅ Landlord record created in landlords table');
    console.log('4. ✅ Link landlords.profile_id = profiles.id');
    console.log('5. ✅ User can add Paystack subaccount code');
    console.log('6. ✅ Properties can reference landlords.id');
    console.log('');
    console.log('📋 This ensures:');
    console.log('   - Every landlord has both profile and business records');
    console.log('   - Paystack subaccount codes are properly tracked');
    console.log('   - Properties are linked to the correct landlord');
    console.log('   - Multi-landlord payments work correctly');

  } catch (error) {
    console.error('❌ Error checking landlord creation flow:', error);
  }
}

checkLandlordCreationFlow();
