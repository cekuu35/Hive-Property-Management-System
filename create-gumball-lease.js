import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGumballLease() {
  console.log('🔧 Creating lease record for Gumball Waterson...\n');

  const gumballProfileId = 'd5496c64-5406-4429-a8b9-bbf74e0a406b';
  const gumballTenantInfoId = '82227162-f059-4b70-9dda-42dab396cca5';

  try {
    // Get the approved application details
    console.log('1. Getting approved application details...');
    const { data: application, error: appError } = await supabase
      .from('unit_applications')
      .select(`
        *,
        units (
          unit_number,
          type,
          rent_amount,
          deposit_amount,
          property_id,
          properties (
            name,
            address,
            landlord_id
          )
        )
      `)
      .eq('tenant_id', gumballProfileId)
      .eq('status', 'approved')
      .single();

    if (appError) {
      console.error('❌ Error fetching application:', appError);
      return;
    }

    console.log('📋 Application details:');
    console.log(`   - Property: ${application.units?.properties?.name}`);
    console.log(`   - Unit: ${application.units?.unit_number}`);
    console.log(`   - Rent: ${application.units?.rent_amount}`);
    console.log(`   - Deposit: ${application.units?.deposit_amount}`);
    console.log(`   - Move-in Date: ${application.preferred_move_in_date}`);

    // Create lease record with correct schema
    console.log('\n2. Creating lease record...');
    const leaseStartDate = application.preferred_move_in_date || new Date().toISOString().split('T')[0];
    const leaseEndDate = new Date(new Date(leaseStartDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const leaseData = {
      tenant_id: gumballTenantInfoId, // This should reference tenant_info.id, not profile.id
      tenant_info_id: gumballTenantInfoId,
      unit_id: application.unit_id,
      start_date: leaseStartDate,
      end_date: leaseEndDate,
      rent_amount: application.units?.rent_amount || 0,
      deposit_amount: application.units?.deposit_amount || 0,
      status: 'active',
      lease_document_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .insert(leaseData)
      .select()
      .single();

    if (leaseError) {
      console.error('❌ Error creating lease:', leaseError);
      return;
    }

    console.log('✅ Lease created successfully!');
    console.log(`   - Lease ID: ${lease.id}`);
    console.log(`   - Start Date: ${lease.start_date}`);
    console.log(`   - End Date: ${lease.end_date}`);
    console.log(`   - Rent: $${lease.rent_amount}`);
    console.log(`   - Deposit: $${lease.deposit_amount}`);

    console.log('\n🎉 Gumball Waterson is now a complete tenant! He should appear in the tenants list.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createGumballLease();
