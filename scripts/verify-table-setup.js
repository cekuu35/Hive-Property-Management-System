import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 VERIFYING TABLE SETUP');
console.log('========================\n');

async function verifyTableSetup() {
  try {
    // 1. Check landlords table
    console.log('1️⃣ CHECKING LANDLORDS TABLE...');
    
    const { data: landlords, error: landlordsError } = await supabase
      .from('landlords')
      .select('id, name, email, phone, subaccount_code, created_at')
      .order('created_at', { ascending: true });

    if (landlordsError) {
      console.error('❌ Error accessing landlords table:', landlordsError);
      return;
    }

    console.log(`✅ Landlords table accessible - ${landlords.length} records found`);
    if (landlords.length > 0) {
      console.log('📋 Sample landlord:', {
        name: landlords[0].name,
        email: landlords[0].email,
        subaccount_code: landlords[0].subaccount_code
      });
    }

    // 2. Check properties table
    console.log('\n2️⃣ CHECKING PROPERTIES TABLE...');
    
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, landlord_id, created_at')
      .limit(5);

    if (propertiesError) {
      console.error('❌ Error accessing properties table:', propertiesError);
      return;
    }

    console.log(`✅ Properties table accessible - ${properties.length} records found`);
    if (properties.length > 0) {
      console.log('📋 Sample property:', {
        name: properties[0].name,
        landlord_id: properties[0].landlord_id
      });
    }

    // 3. Check payments table
    console.log('\n3️⃣ CHECKING PAYMENTS TABLE...');
    
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, reference, status, landlord_id, tenant_id, property_id, subaccount_code, created_at')
      .limit(3);

    if (paymentsError) {
      console.error('❌ Error accessing payments table:', paymentsError);
      console.log('📋 Error details:', paymentsError.message);
    } else {
      console.log(`✅ Payments table accessible - ${payments.length} records found`);
      if (payments.length > 0) {
        console.log('📋 Sample payment:', {
          amount: payments[0].amount,
          status: payments[0].status,
          reference: payments[0].reference
        });
      }
    }

    // 4. Check tenant_info table
    console.log('\n4️⃣ CHECKING TENANT_INFO TABLE...');
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenant_info')
      .select('id, first_name, last_name, email, current_balance, payment_status, created_at')
      .limit(3);

    if (tenantsError) {
      console.error('❌ Error accessing tenant_info table:', tenantsError);
    } else {
      console.log(`✅ Tenant_info table accessible - ${tenants.length} records found`);
      if (tenants.length > 0) {
        console.log('📋 Sample tenant:', {
          name: `${tenants[0].first_name} ${tenants[0].last_name}`,
          email: tenants[0].email,
          balance: tenants[0].current_balance
        });
      }
    }

    // 5. Check leases table
    console.log('\n5️⃣ CHECKING LEASES TABLE...');
    
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, tenant_info_id, rent_amount, status, created_at')
      .limit(3);

    if (leasesError) {
      console.error('❌ Error accessing leases table:', leasesError);
    } else {
      console.log(`✅ Leases table accessible - ${leases.length} records found`);
      if (leases.length > 0) {
        console.log('📋 Sample lease:', {
          id: leases[0].id,
          tenant_info_id: leases[0].tenant_info_id,
          rent_amount: leases[0].rent_amount,
          status: leases[0].status
        });
      }
    }

    // 6. Test foreign key relationships
    console.log('\n6️⃣ TESTING FOREIGN KEY RELATIONSHIPS...');
    
    // Test properties -> landlords relationship
    console.log('🔍 Testing properties -> landlords relationship...');
    const { data: propertiesWithLandlords, error: propertiesWithLandlordsError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        landlord_id,
        landlords!inner(
          id,
          name,
          subaccount_code
        )
      `)
      .limit(1);

    if (propertiesWithLandlordsError) {
      console.log('❌ Properties -> landlords relationship not working:', propertiesWithLandlordsError.message);
    } else {
      console.log('✅ Properties -> landlords relationship working');
      if (propertiesWithLandlords.length > 0) {
        console.log('📋 Sample relationship:', {
          property: propertiesWithLandlords[0].name,
          landlord: propertiesWithLandlords[0].landlords.name,
          subaccount: propertiesWithLandlords[0].landlords.subaccount_code
        });
      }
    }

    // Test payments -> landlords relationship
    console.log('\n🔍 Testing payments -> landlords relationship...');
    const { data: paymentsWithLandlords, error: paymentsWithLandlordsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        reference,
        landlord_id,
        landlords!inner(
          id,
          name,
          subaccount_code
        )
      `)
      .limit(1);

    if (paymentsWithLandlordsError) {
      console.log('❌ Payments -> landlords relationship not working:', paymentsWithLandlordsError.message);
    } else {
      console.log('✅ Payments -> landlords relationship working');
      if (paymentsWithLandlords.length > 0) {
        console.log('📋 Sample relationship:', {
          payment: paymentsWithLandlords[0].reference,
          landlord: paymentsWithLandlords[0].landlords.name
        });
      }
    }

    // 7. Test data integrity
    console.log('\n7️⃣ TESTING DATA INTEGRITY...');
    
    // Check for orphaned properties (properties without valid landlord_id)
    const { data: orphanedProperties, error: orphanedError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .is('landlord_id', null);

    if (orphanedError) {
      console.log('❌ Error checking orphaned properties:', orphanedError.message);
    } else {
      console.log(`📊 Properties without landlord_id: ${orphanedProperties.length}`);
      if (orphanedProperties.length > 0) {
        console.log('⚠️ Found orphaned properties:', orphanedProperties.map(p => p.name));
      } else {
        console.log('✅ All properties have landlord_id assigned');
      }
    }

    // Check for invalid landlord references
    const { data: invalidLandlordRefs, error: invalidRefsError } = await supabase
      .from('properties')
      .select('id, name, landlord_id')
      .not('landlord_id', 'is', null)
      .limit(5);

    if (invalidRefsError) {
      console.log('❌ Error checking landlord references:', invalidRefsError.message);
    } else {
      console.log(`📊 Properties with landlord_id: ${invalidLandlordRefs.length}`);
      if (invalidLandlordRefs.length > 0) {
        // Check if the referenced landlords exist
        const landlordIds = invalidLandlordRefs.map(p => p.landlord_id);
        const { data: existingLandlords, error: existingError } = await supabase
          .from('landlords')
          .select('id')
          .in('id', landlordIds);

        if (existingError) {
          console.log('❌ Error checking existing landlords:', existingError.message);
        } else {
          const existingIds = existingLandlords.map(l => l.id);
          const invalidRefs = landlordIds.filter(id => !existingIds.includes(id));
          console.log(`📊 Invalid landlord references: ${invalidRefs.length}`);
          if (invalidRefs.length > 0) {
            console.log('⚠️ Found invalid landlord references:', invalidRefs);
          } else {
            console.log('✅ All landlord references are valid');
          }
        }
      }
    }

    // 8. Summary
    console.log('\n🎯 SETUP VERIFICATION SUMMARY');
    console.log('=============================');
    console.log('');
    console.log('✅ Core tables accessible:');
    console.log(`   - landlords: ${landlords.length} records`);
    console.log(`   - properties: ${properties.length} records`);
    console.log(`   - payments: ${payments ? payments.length : 'ERROR'} records`);
    console.log(`   - tenant_info: ${tenants ? tenants.length : 'ERROR'} records`);
    console.log(`   - leases: ${leases ? leases.length : 'ERROR'} records`);
    console.log('');
    
    if (propertiesWithLandlordsError) {
      console.log('⚠️ Foreign key relationships need to be set up');
      console.log('📋 Run the database migrations to add foreign key constraints');
    } else {
      console.log('✅ Foreign key relationships working');
    }
    
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. If foreign key relationships are not working, run the migrations');
    console.log('2. Update subaccount codes with real Paystack codes');
    console.log('3. Test the payment flow');
    console.log('4. Deploy the API endpoints');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyTableSetup();
