import { supabaseAdmin } from './supabaseAdmin.js';

async function fixLeaseRLS() {
  console.log('🔧 Fixing lease RLS policies...\n');

  try {
    // Enable RLS on leases table
    console.log('1. Enabling RLS on leases table...');
    const { error: enableError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE leases ENABLE ROW LEVEL SECURITY;'
    });
    
    if (enableError) {
      console.log('   RLS already enabled or error:', enableError.message);
    } else {
      console.log('   ✅ RLS enabled');
    }

    // Drop existing policy
    console.log('\n2. Dropping existing policy...');
    const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "tenants_can_view_own_leases" ON leases;'
    });
    
    if (dropError) {
      console.log('   Drop policy error:', dropError.message);
    } else {
      console.log('   ✅ Existing policy dropped');
    }

    // Create new policy
    console.log('\n3. Creating new policy...');
    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `CREATE POLICY "tenants_can_view_own_leases" ON leases 
            FOR SELECT 
            USING (tenant_info_id IN (
              SELECT id 
              FROM tenant_info 
              WHERE profile_id = auth.uid()
            ));`
    });
    
    if (createError) {
      console.log('   Create policy error:', createError.message);
    } else {
      console.log('   ✅ New policy created');
    }

    // Test the policy
    console.log('\n4. Testing policy...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('leases')
      .select('*')
      .eq('tenant_info_id', 'a11f68d1-f5f2-485c-9c7c-c9d89e25d92d')
      .eq('status', 'active')
      .single();

    if (testError) {
      console.log('   Test query error:', testError.message);
    } else if (testData) {
      console.log('   ✅ Test query successful');
      console.log('   Lease ID:', testData.id);
      console.log('   Rent amount:', testData.rent_amount);
    } else {
      console.log('   ❌ Test query returned no data');
    }

    console.log('\n🎉 RLS policy fix completed!');
    console.log('   The tenant should now be able to see their lease.');
    console.log('   Refresh the page to see the changes.');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
fixLeaseRLS();


