import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugTenantPortalIssue() {
  try {
    console.log('🔍 Debugging tenant portal issue...');
    
    // Get Tevin's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', 'fc98e3d7-aaa4-43bd-a1d2-d882da5b18dd')
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }

    console.log('✅ Profile:', {
      id: profile.id,
      user_id: profile.user_id,
      role: profile.role
    });

    // Simulate the exact query from useApprovedLease
    console.log('\n🔍 Simulating useApprovedLease query...');
    
    // First, find the tenant_info record for this user
    const { data: tenantInfo, error: tenantInfoError } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (tenantInfoError) {
      console.error('❌ Error fetching tenant_info:', tenantInfoError);
      return;
    }

    if (!tenantInfo || tenantInfo.length === 0) {
      console.log('❌ No tenant_info found for profile ID:', profile.id);
      return;
    }

    console.log('✅ Tenant info found:', tenantInfo[0].id);

    // Now fetch the lease using tenant_info_id
    const { data: leaseData, error: leaseError } = await supabaseAdmin
      .from('leases')
      .select(`
        *,
        units (
          unit_number,
          type,
          properties (
            id,
            name,
            address,
            landlord_id
          )
        )
      `)
      .eq('tenant_info_id', tenantInfo[0].id)
      .eq('status', 'active')
      .limit(1);

    if (leaseError) {
      console.error('❌ Error fetching lease:', leaseError);
      return;
    }

    const lease = leaseData?.[0] || null;

    if (lease) {
      console.log('✅ Lease found via admin client:', {
        id: lease.id,
        status: lease.status,
        rent_amount: lease.rent_amount,
        unit: lease.units?.unit_number
      });
    } else {
      console.log('❌ No lease found via admin client');
    }

    // Now test with the regular client (like the frontend would use)
    console.log('\n🔍 Testing with regular client (like frontend)...');
    
    const supabaseClient = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M");

    // Test the exact same query as the frontend
    const { data: clientTenantInfo, error: clientTenantInfoError } = await supabaseClient
      .from('tenant_info')
      .select('id')
      .eq('profile_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (clientTenantInfoError) {
      console.error('❌ Error fetching tenant_info with client:', clientTenantInfoError);
    } else if (!clientTenantInfo || clientTenantInfo.length === 0) {
      console.log('❌ No tenant_info found with client for profile ID:', profile.id);
    } else {
      console.log('✅ Tenant info found with client:', clientTenantInfo[0].id);

      // Test lease query with client
      const { data: clientLeaseData, error: clientLeaseError } = await supabaseClient
        .from('leases')
        .select(`
          *,
          units (
            unit_number,
            type,
            properties (
              id,
              name,
              address,
              landlord_id
            )
          )
        `)
        .eq('tenant_info_id', clientTenantInfo[0].id)
        .eq('status', 'active')
        .limit(1);

      if (clientLeaseError) {
        console.error('❌ Error fetching lease with client:', clientLeaseError);
      } else {
        const clientLease = clientLeaseData?.[0] || null;
        if (clientLease) {
          console.log('✅ Lease found with client:', {
            id: clientLease.id,
            status: clientLease.status,
            rent_amount: clientLease.rent_amount,
            unit: clientLease.units?.unit_number
          });
        } else {
          console.log('❌ No lease found with client');
        }
      }
    }

    // Check if there are any RLS policies blocking this
    console.log('\n🔍 Checking RLS policies...');
    
    // Try to get all leases to see if RLS is blocking
    const { data: allLeases, error: allLeasesError } = await supabaseClient
      .from('leases')
      .select('id, tenant_info_id, status')
      .eq('status', 'active');

    if (allLeasesError) {
      console.error('❌ Error fetching all leases (RLS might be blocking):', allLeasesError);
    } else {
      console.log(`✅ Found ${allLeases.length} active leases total`);
      const tevinLease = allLeases.find(l => l.tenant_info_id === tenantInfo[0].id);
      if (tevinLease) {
        console.log('✅ Tevin\'s lease found in all leases:', tevinLease);
      } else {
        console.log('❌ Tevin\'s lease not found in all leases');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTenantPortalIssue();
