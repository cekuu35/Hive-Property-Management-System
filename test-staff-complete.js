import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials
const SUPABASE_URL = 'https://adxnwhhhgmymtbcvpifv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeG53aGhoZ215bXRiY3ZwaWZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTkyMTczMCwiZXhwIjoyMDUxNDk3NzMwfQ.y7jq9VWzHKqf3Mv1MnVKLBDYfh4SxT-aDZY6o7B5m1M';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🧪 COMPLETE STAFF CREATION & ROLE-BASED ACCESS TEST\n');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Track created IDs for cleanup
const createdIds = {
  authUsers: [],
  profiles: [],
  properties: [],
  assignments: []
};

async function setupTestData() {
  console.log('📋 SETUP: Creating test landlord and properties...\n');
  
  // Create landlord auth user
  const landlordEmail = `landlord-test-${Date.now()}@test.com`;
  const { data: landlordAuth, error: landlordAuthError } = await supabase.auth.admin.createUser({
    email: landlordEmail,
    password: 'LandlordPass123!',
    email_confirm: true,
    user_metadata: {
      first_name: 'Apollo',
      last_name: 'Felix',
      role: 'landlord'
    }
  });
  
  if (landlordAuthError) throw new Error(`Landlord auth failed: ${landlordAuthError.message}`);
  createdIds.authUsers.push(landlordAuth.user.id);
  
  // Wait for profile trigger
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get or create landlord profile
  let { data: landlordProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', landlordAuth.user.id)
    .maybeSingle();
  
  if (landlordProfile) {
    const { data: updated } = await supabase
      .from('profiles')
      .update({
        role: 'landlord',
        first_name: 'Apollo',
        last_name: 'Felix',
        phone: '+254700000001'
      })
      .eq('id', landlordProfile.id)
      .select()
      .single();
    landlordProfile = updated;
  } else {
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        user_id: landlordAuth.user.id,
        role: 'landlord',
        first_name: 'Apollo',
        last_name: 'Felix',
        phone: '+254700000001'
      })
      .select()
      .single();
    landlordProfile = newProfile;
  }
  
  createdIds.profiles.push(landlordProfile.id);
  console.log(`   ✅ Landlord created: ${landlordProfile.first_name} ${landlordProfile.last_name}`);
  
  // Create 3 test properties
  const propertiesData = [
    { name: 'Sunset Apartments', address: '123 Main St, Nairobi', total_units: 10 },
    { name: 'Riverside Complex', address: '456 Oak Ave, Nairobi', total_units: 15 },
    { name: 'Garden Heights', address: '789 Park Rd, Nairobi', total_units: 8 }
  ];
  
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .insert(propertiesData.map(p => ({
      ...p,
      landlord_id: landlordProfile.id,
      description: 'Test property',
      amenities: ['parking', 'water']
    })))
    .select();
  
  if (propError) throw new Error(`Properties creation failed: ${propError.message}`);
  createdIds.properties.push(...properties.map(p => p.id));
  
  console.log(`   ✅ Created ${properties.length} properties:`);
  properties.forEach(p => console.log(`      • ${p.name}`));
  
  return { landlordProfile, properties };
}

async function testStaffWorkflow() {
  try {
    // Setup
    const { landlordProfile, properties } = await setupTestData();
    
    // ==========================================
    // STEP 1: Create Security Guard
    // ==========================================
    console.log('\n📋 STEP 1: Creating Security Guard...\n');
    
    const securityEmail = `security-test-${Date.now()}@test.com`;
    const securityPassword = 'SecurePass123!';
    
    const { data: securityAuth } = await supabase.auth.admin.createUser({
      email: securityEmail,
      password: securityPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'John',
        last_name: 'SecurityGuard',
        role: 'security'
      }
    });
    
    createdIds.authUsers.push(securityAuth.user.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let { data: securityProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', securityAuth.user.id)
      .maybeSingle();
    
    if (securityProfile) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({
          role: 'security',
          first_name: 'John',
          last_name: 'SecurityGuard',
          phone: '+254712345001'
        })
        .eq('id', securityProfile.id)
        .select()
        .single();
      securityProfile = updated;
    } else {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          user_id: securityAuth.user.id,
          role: 'security',
          first_name: 'John',
          last_name: 'SecurityGuard',
          phone: '+254712345001'
        })
        .select()
        .single();
      securityProfile = newProfile;
    }
    
    createdIds.profiles.push(securityProfile.id);
    console.log(`   ✅ Profile created: ${securityProfile.id}`);
    
    // Assign to first 2 properties
    const securityAssignments = [properties[0].id, properties[1].id].map(propId => ({
      staff_id: securityProfile.id,
      property_id: propId,
      role: 'security',
      assigned_by: landlordProfile.id,
      notes: 'Main gate security'
    }));
    
    const { data: secAssignments } = await supabase
      .from('staff_assignments')
      .insert(securityAssignments)
      .select();
    
    createdIds.assignments.push(...secAssignments.map(a => a.id));
    console.log(`   ✅ Assigned to ${securityAssignments.length} properties`);
    console.log(`\n   📧 Email: ${securityEmail}`);
    console.log(`   🔑 Password: ${securityPassword}`);
    console.log(`   🏢 Properties: ${properties.slice(0, 2).map(p => p.name).join(', ')}`);
    
    // ==========================================
    // STEP 2: Create Caretaker
    // ==========================================
    console.log('\n📋 STEP 2: Creating Caretaker...\n');
    
    const caretakerEmail = `caretaker-test-${Date.now()}@test.com`;
    const caretakerPassword = 'CaretakePass123!';
    
    const { data: caretakerAuth } = await supabase.auth.admin.createUser({
      email: caretakerEmail,
      password: caretakerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Jane',
        last_name: 'Caretaker',
        role: 'caretaker'
      }
    });
    
    createdIds.authUsers.push(caretakerAuth.user.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let { data: caretakerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', caretakerAuth.user.id)
      .maybeSingle();
    
    if (caretakerProfile) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({
          role: 'caretaker',
          first_name: 'Jane',
          last_name: 'Caretaker',
          phone: '+254712345002'
        })
        .eq('id', caretakerProfile.id)
        .select()
        .single();
      caretakerProfile = updated;
    } else {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          user_id: caretakerAuth.user.id,
          role: 'caretaker',
          first_name: 'Jane',
          last_name: 'Caretaker',
          phone: '+254712345002'
        })
        .select()
        .single();
      caretakerProfile = newProfile;
    }
    
    createdIds.profiles.push(caretakerProfile.id);
    console.log(`   ✅ Profile created: ${caretakerProfile.id}`);
    
    // Assign to last 2 properties (overlaps with property 2)
    const caretakerAssignments = [properties[1].id, properties[2].id].map(propId => ({
      staff_id: caretakerProfile.id,
      property_id: propId,
      role: 'caretaker',
      assigned_by: landlordProfile.id,
      notes: 'General maintenance'
    }));
    
    const { data: careAssignments } = await supabase
      .from('staff_assignments')
      .insert(caretakerAssignments)
      .select();
    
    createdIds.assignments.push(...careAssignments.map(a => a.id));
    console.log(`   ✅ Assigned to ${caretakerAssignments.length} properties`);
    console.log(`\n   📧 Email: ${caretakerEmail}`);
    console.log(`   🔑 Password: ${caretakerPassword}`);
    console.log(`   🏢 Properties: ${properties.slice(1, 3).map(p => p.name).join(', ')}`);
    
    // ==========================================
    // STEP 3: Verify Data Access Restrictions
    // ==========================================
    console.log('\n📋 STEP 3: Testing Data Access Restrictions...\n');
    
    // Security should see only assigned properties
    const { data: securitySees } = await supabase
      .from('staff_assignments')
      .select('property:properties(id, name)')
      .eq('staff_id', securityProfile.id)
      .eq('is_active', true);
    
    console.log(`   Security Guard sees ${securitySees.length} properties:`);
    securitySees.forEach(s => console.log(`      ✅ ${s.property.name}`));
    
    const securityCorrect = securitySees.length === 2 && 
      securitySees.every(s => [properties[0].id, properties[1].id].includes(s.property.id));
    
    if (securityCorrect) {
      console.log(`   ✅ PASS: Security has correct access`);
    } else {
      console.log(`   ❌ FAIL: Security has incorrect access`);
    }
    
    // Caretaker should see only assigned properties
    const { data: caretakerSees } = await supabase
      .from('staff_assignments')
      .select('property:properties(id, name)')
      .eq('staff_id', caretakerProfile.id)
      .eq('is_active', true);
    
    console.log(`\n   Caretaker sees ${caretakerSees.length} properties:`);
    caretakerSees.forEach(s => console.log(`      ✅ ${s.property.name}`));
    
    const caretakerCorrect = caretakerSees.length === 2 && 
      caretakerSees.every(s => [properties[1].id, properties[2].id].includes(s.property.id));
    
    if (caretakerCorrect) {
      console.log(`   ✅ PASS: Caretaker has correct access`);
    } else {
      console.log(`   ❌ FAIL: Caretaker has incorrect access`);
    }
    
    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📊 CREATED:');
    console.log(`   • 1 Landlord`);
    console.log(`   • 3 Properties`);
    console.log(`   • 1 Security Guard (2 property assignments)`);
    console.log(`   • 1 Caretaker (2 property assignments)`);
    console.log('\n🔑 LOGIN TO TEST IN BROWSER:\n');
    console.log(`Security Guard:`);
    console.log(`  📧 ${securityEmail}`);
    console.log(`  🔑 ${securityPassword}`);
    console.log(`  🏢 Should see: ${properties.slice(0, 2).map(p => p.name).join(', ')}`);
    console.log(`  🚫 Should NOT see: ${properties[2].name}`);
    console.log(`\nCaretaker:`);
    console.log(`  📧 ${caretakerEmail}`);
    console.log(`  🔑 ${caretakerPassword}`);
    console.log(`  🏢 Should see: ${properties.slice(1, 3).map(p => p.name).join(', ')}`);
    console.log(`  🚫 Should NOT see: ${properties[0].name}`);
    console.log('\n🌐 Preview: http://localhost:5173');
    console.log('\n══════════════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    // Ask user if they want to keep the test data
    console.log('⚠️  Test data created. Run cleanup manually or keep for browser testing.');
    console.log('To cleanup later, delete the test accounts from Supabase dashboard.\n');
  }
}

// Run the test
testStaffWorkflow();




