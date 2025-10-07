import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkRLSPolicies() {
  try {
    console.log('🔍 Checking RLS policies...');
    
    // Check if RLS is enabled on tenant_info
    const { data: tenantInfoRLS, error: tenantInfoError } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'tenant_info' AND schemaname = 'public'
        `
      });

    if (tenantInfoError) {
      console.error('❌ Error checking tenant_info RLS:', tenantInfoError);
    } else {
      console.log('📊 tenant_info RLS status:', tenantInfoRLS);
    }

    // Check RLS policies on tenant_info
    const { data: tenantInfoPolicies, error: policiesError } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          SELECT policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies 
          WHERE tablename = 'tenant_info' AND schemaname = 'public'
        `
      });

    if (policiesError) {
      console.error('❌ Error checking tenant_info policies:', policiesError);
    } else {
      console.log('📊 tenant_info policies:', tenantInfoPolicies);
    }

    // Check if RLS is enabled on leases
    const { data: leasesRLS, error: leasesError } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'leases' AND schemaname = 'public'
        `
      });

    if (leasesError) {
      console.error('❌ Error checking leases RLS:', leasesError);
    } else {
      console.log('📊 leases RLS status:', leasesRLS);
    }

    // Check RLS policies on leases
    const { data: leasesPolicies, error: leasesPoliciesError } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          SELECT policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies 
          WHERE tablename = 'leases' AND schemaname = 'public'
        `
      });

    if (leasesPoliciesError) {
      console.error('❌ Error checking leases policies:', leasesPoliciesError);
    } else {
      console.log('📊 leases policies:', leasesPolicies);
    }

    // Check if RLS is enabled on profiles
    const { data: profilesRLS, error: profilesError } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'profiles' AND schemaname = 'public'
        `
      });

    if (profilesError) {
      console.error('❌ Error checking profiles RLS:', profilesError);
    } else {
      console.log('📊 profiles RLS status:', profilesRLS);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRLSPolicies();
