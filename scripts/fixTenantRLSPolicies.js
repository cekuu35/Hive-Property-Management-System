import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixTenantRLSPolicies() {
  try {
    console.log('🔧 Fixing tenant RLS policies...');
    
    // Enable RLS on tenant_info if not already enabled
    console.log('1. Enabling RLS on tenant_info...');
    const { error: enableTenantInfoRLS } = await supabaseAdmin
      .rpc('exec', {
        sql: 'ALTER TABLE public.tenant_info ENABLE ROW LEVEL SECURITY;'
      });

    if (enableTenantInfoRLS) {
      console.log('⚠️ tenant_info RLS already enabled or error:', enableTenantInfoRLS.message);
    } else {
      console.log('✅ RLS enabled on tenant_info');
    }

    // Create policy for tenants to view their own tenant_info
    console.log('2. Creating policy for tenants to view their own tenant_info...');
    const { error: tenantInfoPolicy } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          CREATE POLICY "tenants_can_view_own_tenant_info" ON public.tenant_info
          FOR SELECT
          USING (profile_id = auth.uid());
        `
      });

    if (tenantInfoPolicy) {
      console.log('⚠️ tenant_info policy already exists or error:', tenantInfoPolicy.message);
    } else {
      console.log('✅ Policy created for tenants to view their own tenant_info');
    }

    // Enable RLS on leases if not already enabled
    console.log('3. Enabling RLS on leases...');
    const { error: enableLeasesRLS } = await supabaseAdmin
      .rpc('exec', {
        sql: 'ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;'
      });

    if (enableLeasesRLS) {
      console.log('⚠️ leases RLS already enabled or error:', enableLeasesRLS.message);
    } else {
      console.log('✅ RLS enabled on leases');
    }

    // Create policy for tenants to view their own leases
    console.log('4. Creating policy for tenants to view their own leases...');
    const { error: leasesPolicy } = await supabaseAdmin
      .rpc('exec', {
        sql: `
          CREATE POLICY "tenants_can_view_own_leases" ON public.leases
          FOR SELECT
          USING (
            tenant_info_id IN (
              SELECT id 
              FROM public.tenant_info 
              WHERE profile_id = auth.uid()
            )
          );
        `
      });

    if (leasesPolicy) {
      console.log('⚠️ leases policy already exists or error:', leasesPolicy.message);
    } else {
      console.log('✅ Policy created for tenants to view their own leases');
    }

    // Grant necessary permissions
    console.log('5. Granting permissions...');
    const { error: grantTenantInfo } = await supabaseAdmin
      .rpc('exec', {
        sql: 'GRANT SELECT ON public.tenant_info TO authenticated;'
      });

    const { error: grantLeases } = await supabaseAdmin
      .rpc('exec', {
        sql: 'GRANT SELECT ON public.leases TO authenticated;'
      });

    if (grantTenantInfo) {
      console.log('⚠️ tenant_info grant error:', grantTenantInfo.message);
    } else {
      console.log('✅ SELECT permission granted on tenant_info');
    }

    if (grantLeases) {
      console.log('⚠️ leases grant error:', grantLeases.message);
    } else {
      console.log('✅ SELECT permission granted on leases');
    }

    console.log('\n🎉 RLS policies should now be fixed!');
    console.log('Testing with regular client...');

    // Test with regular client
    const supabaseClient = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M");

    // Test tenant_info query
    const { data: testTenantInfo, error: testTenantInfoError } = await supabaseClient
      .from('tenant_info')
      .select('id')
      .eq('profile_id', '20a19d09-fdb7-4760-a6da-75cdcecbb66d')
      .limit(1);

    if (testTenantInfoError) {
      console.log('❌ Still can\'t access tenant_info:', testTenantInfoError.message);
    } else if (testTenantInfo && testTenantInfo.length > 0) {
      console.log('✅ Can now access tenant_info:', testTenantInfo[0].id);
    } else {
      console.log('❌ No tenant_info found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixTenantRLSPolicies();
