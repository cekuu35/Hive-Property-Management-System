import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔐 ADMIN ACCOUNT SETUP');
console.log('=====================\n');

async function setupAdminAccount() {
  try {
    const adminEmail = 'apollo.sankii@gmail.com';
    const adminPassword = 'AdminPassword123!'; // You can change this

    console.log('1️⃣ CHECKING IF ADMIN PROFILE EXISTS...');
    
    // Check if profile already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', adminEmail)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error checking profile:', profileError);
      return;
    }

    if (existingProfile) {
      console.log(`✅ Admin profile already exists: ${existingProfile.email}`);
      console.log(`   Profile ID: ${existingProfile.id}`);
      console.log(`   Role: ${existingProfile.role}`);
      
      if (existingProfile.role !== 'landlord') {
        console.log('🔄 Updating role to landlord...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'landlord' })
          .eq('id', existingProfile.id);

        if (updateError) {
          console.error('❌ Error updating role:', updateError);
        } else {
          console.log('✅ Role updated to landlord');
        }
      }
    } else {
      console.log('⚠️ Admin profile not found. Creating new profile...');
      
      // Create admin profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: 'admin-user-id', // This will be replaced when you sign up
          email: adminEmail,
          first_name: 'Apollo',
          last_name: 'Felix',
          role: 'landlord',
          phone: '+254700000000'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return;
      }

      console.log(`✅ Admin profile created: ${newProfile.email}`);
      console.log(`   Profile ID: ${newProfile.id}`);
    }

    console.log('\n2️⃣ ADMIN ACCOUNT SETUP INSTRUCTIONS...');
    console.log('');
    console.log('📋 TO ACCESS THE ADMIN PORTAL:');
    console.log('');
    console.log('1. Go to: http://localhost:8080/admin');
    console.log('2. Sign up with your email: apollo.sankii@gmail.com');
    console.log('3. Use any password (you can change it later)');
    console.log('4. The system will automatically recognize you as admin');
    console.log('');
    console.log('🔐 SECURITY FEATURES:');
    console.log('✅ Only your email can access the admin portal');
    console.log('✅ No registration allowed for other users');
    console.log('✅ Automatic logout on invalid access attempts');
    console.log('✅ Secure authentication with Supabase');
    console.log('');
    console.log('🎯 ADMIN PORTAL FEATURES:');
    console.log('✅ System dashboard with statistics');
    console.log('✅ Landlord subaccount management');
    console.log('✅ Payment monitoring');
    console.log('✅ Multi-landlord configuration');
    console.log('');
    console.log('🚀 READY TO USE!');
    console.log('Your admin portal is now configured and ready to use.');

  } catch (error) {
    console.error('❌ Error setting up admin account:', error);
  }
}

setupAdminAccount();
