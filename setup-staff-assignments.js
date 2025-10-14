import { supabaseAdmin } from './src/lib/supabaseAdmin.js';

async function setupStaffAssignments() {
  console.log('🔧 Setting up Staff Assignments for Soft Landing');
  console.log('=' .repeat(50));
  
  try {
    // First, let's check if the staff_assignments table exists
    const { data: tableExists } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'staff_assignments')
      .eq('table_schema', 'public');

    if (tableExists && tableExists.length > 0) {
      console.log('✅ staff_assignments table already exists');
    } else {
      console.log('❌ staff_assignments table does not exist');
      console.log('💡 Please run the migration first: npx supabase db push');
      return;
    }

    // Get all security personnel
    const { data: securityStaff, error: staffError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, user_id')
      .eq('role', 'security');

    if (staffError) {
      throw new Error(`Failed to get security staff: ${staffError.message}`);
    }

    if (!securityStaff || securityStaff.length === 0) {
      console.log('❌ No security personnel found');
      console.log('💡 Please create security staff accounts first');
      return;
    }

    console.log(`👥 Found ${securityStaff.length} security personnel`);

    // Get all properties
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('id, name, address');

    if (propertiesError) {
      throw new Error(`Failed to get properties: ${propertiesError.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('❌ No properties found');
      return;
    }

    console.log(`🏢 Found ${properties.length} properties`);

    // Create staff assignments for soft landing
    const assignments = [];
    
    // Assign each security person to all properties for soft landing
    for (const staff of securityStaff) {
      for (const property of properties) {
        assignments.push({
          staff_id: staff.id,
          property_id: property.id,
          role: 'security',
          assigned_by: staff.id, // Self-assigned for soft landing
          is_active: true,
          notes: 'Soft landing assignment - all properties'
        });
      }
    }

    console.log(`📝 Creating ${assignments.length} staff assignments...`);

    // Insert assignments in batches
    const batchSize = 10;
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from('staff_assignments')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError.message);
      } else {
        console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} assignments)`);
      }
    }

    console.log('\n🎉 Staff assignments setup complete!');
    console.log('💡 Security personnel can now see all properties in their dashboard');
    console.log('💡 You can modify assignments later through the landlord portal');

  } catch (error) {
    console.error('❌ Error setting up staff assignments:', error.message);
  }
}

setupStaffAssignments();







