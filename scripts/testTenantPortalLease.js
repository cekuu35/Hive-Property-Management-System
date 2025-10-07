import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testTenantPortalLease() {
  try {
    console.log('🧪 Testing tenant portal lease detection...');
    
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

    console.log('✅ Profile found:', {
      id: profile.id,
      user_id: profile.user_id,
      role: profile.role
    });

    // Simulate the tenant portal logic from useApprovedLease
    console.log('\n🔍 Simulating useApprovedLease logic...');
    
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
      console.log('✅ ACTIVE LEASE FOUND!');
      console.log('=====================================');
      console.log(`Lease ID: ${lease.id}`);
      console.log(`Status: ${lease.status}`);
      console.log(`Rent Amount: KES ${lease.rent_amount?.toLocaleString() || 0}`);
      console.log(`Start Date: ${lease.start_date}`);
      console.log(`End Date: ${lease.end_date}`);
      console.log(`Unit: ${lease.units?.unit_number || 'N/A'} (${lease.units?.type || 'N/A'})`);
      console.log(`Property: ${lease.units?.properties?.name || 'N/A'}`);
      console.log(`Address: ${lease.units?.properties?.address || 'N/A'}`);
      
      console.log('\n🎉 SUCCESS! Tevin\'s lease should now show as ACTIVE in the tenant portal!');
    } else {
      console.log('❌ No active lease found');
      console.log('This means the tenant portal will show "no active lease"');
    }

    // Also test the rent flow logic
    console.log('\n🔍 Simulating useRentFlow logic...');
    
    const { data: rentFlowLease, error: rentFlowError } = await supabaseAdmin
      .from('leases')
      .select('id, rent_amount, start_date, status')
      .eq('tenant_info_id', tenantInfo[0].id)
      .eq('status', 'active')
      .limit(1);

    if (rentFlowError) {
      console.error('❌ Error fetching lease for rent flow:', rentFlowError);
    } else if (rentFlowLease && rentFlowLease.length > 0) {
      console.log('✅ Rent flow will work - active lease found:', rentFlowLease[0].id);
    } else {
      console.log('❌ Rent flow will not work - no active lease found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTenantPortalLease();
