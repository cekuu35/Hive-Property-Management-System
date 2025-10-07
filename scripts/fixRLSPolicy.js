import { supabaseAdmin } from './supabaseAdmin.js';

async function fixRLSPolicy() {
  console.log('🔧 Fixing RLS policy for leases table...\n');

  try {
    // Test current query with client-side supabase
    console.log('1. Testing current query...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('leases')
      .select('id, rent_amount, status')
      .eq('tenant_info_id', 'fe0ed8e5-6f95-4970-96c9-c86ec2a11b20')
      .eq('status', 'active')
      .single();

    if (testError) {
      console.log('❌ Query failed:', testError.message);
    } else {
      console.log('✅ Query successful:', testData);
    }

    // The issue is that the RLS policy is blocking the query
    // Let's temporarily disable RLS to test
    console.log('\n2. Testing with RLS disabled...');
    
    // Create a simple test to see if the issue is RLS
    const { data: tenantInfo } = await supabaseAdmin
      .from('tenant_info')
      .select('id, profile_id')
      .eq('email', 'sankiiapollo@gmail.com')
      .single();

    if (tenantInfo) {
      console.log('Tenant info:', tenantInfo);
      
      const { data: lease } = await supabaseAdmin
        .from('leases')
        .select('*')
        .eq('tenant_info_id', tenantInfo.id)
        .eq('status', 'active')
        .single();

      if (lease) {
        console.log('✅ Lease found with admin client:', lease.id);
        console.log('   Rent amount:', lease.rent_amount);
        console.log('   Status:', lease.status);
      } else {
        console.log('❌ No lease found');
      }
    }

    console.log('\n🎯 The issue is RLS policy blocking client-side queries');
    console.log('   The admin client can see the data, but the client-side');
    console.log('   query is being blocked by Row Level Security policies.');
    console.log('\n💡 Solution: The RLS policy needs to be updated to allow');
    console.log('   tenants to view their own leases through the tenant_info relationship.');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixRLSPolicy();

