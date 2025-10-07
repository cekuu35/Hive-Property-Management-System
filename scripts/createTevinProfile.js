import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTevinProfile() {
  try {
    console.log('🔧 Creating Tevin\'s profile record...');
    
    // Get Tevin's auth user ID
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    const tevinAuthUser = authUsers.users.find(user => user.email === 'tevinmokaya@gmail.com');
    
    if (!tevinAuthUser) {
      console.error('❌ Tevin\'s auth user not found');
      return;
    }

    console.log('🔐 Tevin\'s Auth User ID:', tevinAuthUser.id);

    // Check if profile already exists
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', tevinAuthUser.id)
      .single();

    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      return;
    }

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking existing profile:', profileError);
      return;
    }

    // Create profile record
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: tevinAuthUser.id, // user_id references auth.users.id
        role: 'tenant',
        first_name: 'Tevin',
        last_name: 'Mokaya',
        created_at: tevinAuthUser.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating profile:', createError);
      return;
    }

    console.log('✅ Successfully created Tevin\'s profile:');
    console.log(`Profile ID: ${newProfile.id}`);
    console.log(`Email: ${newProfile.email}`);
    console.log(`Role: ${newProfile.role}`);
    console.log(`Created: ${newProfile.created_at}`);

    console.log('\n🎉 Tevin\'s profile is now complete!');
    console.log('The tenant portal should now be able to find his lease and show it as active.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTevinProfile();
