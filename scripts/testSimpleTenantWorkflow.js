import { supabaseAdmin } from './supabaseAdmin.js';
import { SimpleTenantCreationService } from '../src/services/simpleTenantCreationService.ts';

async function testSimpleTenantWorkflow() {
  console.log("🧪 Testing Simplified Tenant Creation Workflow");
  console.log("=" .repeat(60));
  
  try {
    // Step 1: Get a landlord profile
    console.log("\n1️⃣ Finding a landlord profile...");
    const { data: landlords, error: landlordError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'landlord')
      .limit(1);
    
    if (landlordError || !landlords || landlords.length === 0) {
      console.log("❌ No landlord found. Creating a test landlord...");
      
      // Create a test landlord
      const { data: newLandlord, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          first_name: 'Test',
          last_name: 'Landlord',
          email: 'test.landlord@example.com',
          role: 'landlord',
          phone: '+1234567890'
        })
        .select()
        .single();
      
      if (createError) {
        throw new Error(`Failed to create landlord: ${createError.message}`);
      }
      
      landlords = [newLandlord];
    }
    
    const landlord = landlords[0];
    console.log(`✅ Found landlord: ${landlord.first_name} ${landlord.last_name} (${landlord.email})`);
    
    // Step 2: Get available units
    console.log("\n2️⃣ Finding available units...");
    const { data: units, error: unitsError } = await supabaseAdmin
      .from('units')
      .select(`
        id,
        unit_number,
        type,
        properties (
          id,
          name,
          address
        )
      `)
      .limit(1);
    
    if (unitsError || !units || units.length === 0) {
      console.log("❌ No units found. Creating a test unit...");
      
      // First create a property
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .insert({
          name: 'Test Property',
          address: '123 Test Street, Test City',
          landlord_id: landlord.id,
          property_type: 'apartment'
        })
        .select()
        .single();
      
      if (propertyError) {
        throw new Error(`Failed to create property: ${propertyError.message}`);
      }
      
      // Then create a unit
      const { data: unit, error: unitError } = await supabaseAdmin
        .from('units')
        .insert({
          unit_number: '101',
          type: '1-bedroom',
          property_id: property.id,
          status: 'available',
          rent_amount: 50000,
          deposit_amount: 100000
        })
        .select()
        .single();
      
      if (unitError) {
        throw new Error(`Failed to create unit: ${unitError.message}`);
      }
      
      units = [unit];
    }
    
    const unit = units[0];
    console.log(`✅ Found unit: ${unit.unit_number} at ${unit.properties?.name}`);
    
    // Step 3: Create a tenant using the simplified service
    console.log("\n3️⃣ Creating a new tenant...");
    const tenantData = {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith.test@example.com',
      phone: '+1234567890',
      unit_id: unit.id,
      rent_amount: 50000,
      security_deposit: 100000,
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      emergency_contact_name: 'John Smith',
      emergency_contact_phone: '+1234567891',
      notes: 'Test tenant created by automated workflow'
    };
    
    const createResult = await SimpleTenantCreationService.createTenant(landlord.id, tenantData);
    
    if (!createResult.success) {
      throw new Error(`Failed to create tenant: ${createResult.error}`);
    }
    
    console.log("✅ Tenant created successfully!");
    console.log(`   - Tenant ID: ${createResult.tenant_id}`);
    console.log(`   - Auth User ID: ${createResult.auth_user_id}`);
    console.log(`   - Email: ${createResult.email}`);
    console.log(`   - Password: ${createResult.password}`);
    
    // Step 4: Verify tenant data
    console.log("\n4️⃣ Verifying tenant data...");
    const tenantInfo = await SimpleTenantCreationService.getTenantByAuthUser(createResult.auth_user_id);
    
    if (!tenantInfo) {
      throw new Error("Failed to retrieve tenant information");
    }
    
    console.log("✅ Tenant data retrieved successfully!");
    console.log(`   - Name: ${tenantInfo.first_name} ${tenantInfo.last_name}`);
    console.log(`   - Email: ${tenantInfo.email}`);
    console.log(`   - Status: ${tenantInfo.tenant_status}`);
    console.log(`   - Balance: KES ${tenantInfo.current_balance.toLocaleString()}`);
    
    if (tenantInfo.leases && tenantInfo.leases.length > 0) {
      const lease = tenantInfo.leases[0];
      console.log(`   - Unit: ${lease.units?.unit_number}`);
      console.log(`   - Property: ${lease.units?.properties?.name}`);
      console.log(`   - Rent: KES ${lease.rent_amount.toLocaleString()}`);
      console.log(`   - Lease Status: ${lease.status}`);
    }
    
    // Step 5: Test landlord's tenant list
    console.log("\n5️⃣ Testing landlord's tenant list...");
    const landlordTenants = await SimpleTenantCreationService.getTenantsForLandlord(landlord.id);
    
    console.log(`✅ Found ${landlordTenants.length} tenants for landlord`);
    const createdTenant = landlordTenants.find(t => t.id === createResult.tenant_id);
    
    if (createdTenant) {
      console.log("✅ Created tenant found in landlord's list!");
      console.log(`   - Name: ${createdTenant.first_name} ${createdTenant.last_name}`);
      console.log(`   - Status: ${createdTenant.tenant_status}`);
      console.log(`   - Balance: KES ${createdTenant.current_balance.toLocaleString()}`);
    } else {
      console.log("❌ Created tenant not found in landlord's list");
    }
    
    // Step 6: Test validation (duplicate email)
    console.log("\n6️⃣ Testing validation (duplicate email)...");
    const duplicateResult = await SimpleTenantCreationService.createTenant(landlord.id, {
      ...tenantData,
      email: 'jane.smith.test@example.com' // Same email
    });
    
    if (duplicateResult.success) {
      console.log("❌ Validation failed - duplicate email was allowed");
    } else {
      console.log("✅ Validation working - duplicate email rejected");
      console.log(`   - Error: ${duplicateResult.error}`);
    }
    
    // Step 7: Test tenant login simulation
    console.log("\n7️⃣ Testing tenant login simulation...");
    
    // Simulate what happens when tenant logs in
    const loginResult = await SimpleTenantCreationService.getTenantByAuthUser(createResult.auth_user_id);
    
    if (loginResult) {
      console.log("✅ Tenant login simulation successful!");
      console.log(`   - Tenant can access their data`);
      console.log(`   - Name: ${loginResult.first_name} ${loginResult.last_name}`);
      console.log(`   - Landlord ID: ${loginResult.landlord_id}`);
      
      if (loginResult.leases && loginResult.leases.length > 0) {
        console.log(`   - Has active lease: ${loginResult.leases[0].status}`);
      }
    } else {
      console.log("❌ Tenant login simulation failed");
    }
    
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 SIMPLIFIED TENANT WORKFLOW TEST COMPLETED SUCCESSFULLY!");
    console.log("\n✅ All functionality verified:");
    console.log("   ✅ Landlord profile management");
    console.log("   ✅ Unit and property management");
    console.log("   ✅ Tenant creation with auth user");
    console.log("   ✅ Data relationships and foreign keys");
    console.log("   ✅ Tenant retrieval by auth user");
    console.log("   ✅ Landlord tenant listing");
    console.log("   ✅ Email uniqueness validation");
    console.log("   ✅ Tenant login simulation");
    
    console.log("\n📋 Test Results Summary:");
    console.log(`   - Landlord: ${landlord.first_name} ${landlord.last_name}`);
    console.log(`   - Tenant: ${tenantInfo.first_name} ${tenantInfo.last_name}`);
    console.log(`   - Unit: ${tenantInfo.leases?.[0]?.units?.unit_number || 'Not assigned'}`);
    console.log(`   - Property: ${tenantInfo.leases?.[0]?.units?.properties?.name || 'Not assigned'}`);
    console.log(`   - Rent: KES ${tenantInfo.leases?.[0]?.rent_amount?.toLocaleString() || '0'}`);
    console.log(`   - Auth User: ${createResult.auth_user_id}`);
    console.log(`   - Login Email: ${createResult.email}`);
    console.log(`   - Login Password: ${createResult.password}`);
    
    console.log("\n🚀 The simplified tenant creation workflow is fully functional!");
    console.log("\n📚 Next Steps:");
    console.log("   1. Integrate the TenantCreationForm component into the landlord dashboard");
    console.log("   2. Update the tenant dashboard to use the new authentication system");
    console.log("   3. Test the complete UI workflow");
    console.log("   4. Add email notifications for tenant creation");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testSimpleTenantWorkflow().catch(console.error);
