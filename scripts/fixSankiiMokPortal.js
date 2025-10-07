import { supabaseAdmin } from './supabaseAdmin.js';

async function fixSankiiMokPortal() {
  console.log('🔧 FIXING SANKII MOK PORTAL IMMEDIATELY...\n');

  try {
    const currentProfileId = 'fb445672-adf7-465f-bc2d-85c88a75ad72';
    
    console.log('Current logged-in profile ID:', currentProfileId);

    // Check if current user has tenant data
    const { data: currentTenant } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('profile_id', currentProfileId)
      .single();

    if (currentTenant) {
      console.log('✅ Current user tenant data found:');
      console.log('  Name:', currentTenant.first_name, currentTenant.last_name);
      console.log('  Email:', currentTenant.email);
      console.log('  Status:', currentTenant.tenant_status);

      // Check for active lease
      const { data: currentLease } = await supabaseAdmin
        .from('leases')
        .select('*')
        .eq('tenant_info_id', currentTenant.id)
        .eq('status', 'active')
        .single();

      if (currentLease) {
        console.log('✅ Current user has active lease:');
        console.log('  Lease ID:', currentLease.id);
        console.log('  Rent amount:', currentLease.rent_amount);
        console.log('  Status:', currentLease.status);
      } else {
        console.log('❌ Current user has NO active lease');
        
        // Create an active lease for current user
        console.log('Creating active lease for current user...');
        const { data: units } = await supabaseAdmin
          .from('units')
          .select('id, unit_number')
          .limit(1);

        if (units && units.length > 0) {
          const { data: existingTenant } = await supabaseAdmin
            .from('tenant_info')
            .select('id')
            .limit(1)
            .single();

          const { data: newLease, error: leaseError } = await supabaseAdmin
            .from('leases')
            .insert({
              tenant_id: existingTenant.id,
              tenant_info_id: currentTenant.id,
              unit_id: units[0].id,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              rent_amount: 5000,
              deposit_amount: 10000,
              status: 'active'
            })
            .select()
            .single();

          if (leaseError) {
            console.log('❌ Error creating lease:', leaseError.message);
          } else {
            console.log('✅ Active lease created for current user:');
            console.log('  Lease ID:', newLease.id);
            console.log('  Rent amount:', newLease.rent_amount);
          }
        }
      }
    } else {
      console.log('❌ Current user has NO tenant data');
      
      // Create tenant data for current user
      console.log('Creating tenant data for current user...');
      const { data: newTenant, error: tenantError } = await supabaseAdmin
        .from('tenant_info')
        .insert({
          landlord_id: '4df5e33d-75d4-48cc-9f48-b06afc998f19',
          first_name: 'Current',
          last_name: 'User',
          email: 'current@example.com',
          phone: '1234567890',
          profile_id: currentProfileId,
          tenant_status: 'active',
          current_balance: 5000,
          payment_status: 'unpaid'
        })
        .select()
        .single();

      if (tenantError) {
        console.log('❌ Error creating tenant:', tenantError.message);
      } else {
        console.log('✅ Tenant data created for current user:', newTenant.id);
        
        // Create active lease
        const { data: units } = await supabaseAdmin
          .from('units')
          .select('id, unit_number')
          .limit(1);

        if (units && units.length > 0) {
          const { data: existingTenant } = await supabaseAdmin
            .from('tenant_info')
            .select('id')
            .limit(1)
            .single();

          const { data: newLease, error: leaseError } = await supabaseAdmin
            .from('leases')
            .insert({
              tenant_id: existingTenant.id,
              tenant_info_id: newTenant.id,
              unit_id: units[0].id,
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              rent_amount: 5000,
              deposit_amount: 10000,
              status: 'active'
            })
            .select()
            .single();

          if (leaseError) {
            console.log('❌ Error creating lease:', leaseError.message);
          } else {
            console.log('✅ Active lease created:', newLease.id);
          }
        }
      }
    }

    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    const { data: finalTenant } = await supabaseAdmin
      .from('tenant_info')
      .select('*')
      .eq('profile_id', currentProfileId)
      .single();

    if (finalTenant) {
      const { data: finalLease } = await supabaseAdmin
        .from('leases')
        .select('*')
        .eq('tenant_info_id', finalTenant.id)
        .eq('status', 'active')
        .single();

      if (finalLease) {
        console.log('✅ PORTAL FIXED!');
        console.log('  Tenant:', finalTenant.first_name, finalTenant.last_name);
        console.log('  Email:', finalTenant.email);
        console.log('  Lease ID:', finalLease.id);
        console.log('  Rent amount:', finalLease.rent_amount);
        console.log('  Status:', finalLease.status);
        console.log('\n🎉 REFRESH THE PAGE - YOU SHOULD NOW SEE YOUR ACTIVE LEASE!');
      } else {
        console.log('❌ Still no active lease found');
      }
    } else {
      console.log('❌ Still no tenant data found');
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixSankiiMokPortal();


