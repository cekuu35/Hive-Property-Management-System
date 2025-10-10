import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTenantInfoRecords() {
  try {
    console.log('Creating tenant_info records for existing tenants...\n')
    
    // Get all tenant profiles
    const { data: tenants, error: tenantsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone')
      .eq('role', 'tenant')

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      return
    }

    console.log(`Found ${tenants.length} tenant profiles`)

    // Create tenant_info records for each tenant
    let createdCount = 0
    for (const tenant of tenants) {
      console.log(`\nCreating tenant_info for: ${tenant.first_name} ${tenant.last_name}`)
      
      // Check if tenant_info already exists
      const { data: existingTenantInfo, error: checkError } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('profile_id', tenant.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.log(`  ❌ Error checking existing record: ${checkError.message}`)
        continue
      }

      if (existingTenantInfo) {
        console.log(`  ✅ Tenant info already exists`)
        continue
      }

      // Create tenant_info record
      const { data: tenantInfo, error: createError } = await supabase
        .from('tenant_info')
        .insert({
          profile_id: tenant.id,
          first_name: tenant.first_name,
          last_name: tenant.last_name,
          email: tenant.email,
          phone: tenant.phone,
          status: 'active'
        })
        .select()
        .single()

      if (createError) {
        console.log(`  ❌ Failed to create: ${createError.message}`)
      } else {
        console.log(`  ✅ Created tenant_info with ID: ${tenantInfo.id}`)
        createdCount++
      }
    }

    console.log(`\n🎉 Created ${createdCount} tenant_info records`)

    // Now test assigning tenants to bills
    console.log('\nTesting tenant assignment to bills...')
    
    // Get some tenant_info records
    const { data: tenantInfos, error: tenantInfosError } = await supabase
      .from('tenant_info')
      .select('id, first_name, last_name, profile_id')
      .limit(3)

    if (tenantInfosError) {
      console.error('Error fetching tenant_info records:', tenantInfosError)
      return
    }

    console.log(`Found ${tenantInfos.length} tenant_info records`)

    // Get bills without tenant assignments
    const { data: bills, error: billsError } = await supabase
      .from('unit_bills')
      .select('id, utilities!unit_bills_utility_id_fkey (name)')
      .is('tenant_id', null)
      .limit(3)

    if (billsError) {
      console.error('Error fetching bills:', billsError)
      return
    }

    console.log(`Found ${bills.length} bills without tenant assignments`)

    // Assign tenants to bills
    let updatedCount = 0
    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i]
      const tenantInfo = tenantInfos[i % tenantInfos.length]
      
      console.log(`\nUpdating bill ${bill.id} (${bill.utilities?.name})`)
      console.log(`  Assigning tenant: ${tenantInfo.first_name} ${tenantInfo.last_name}`)
      
      const { error: updateError } = await supabase
        .from('unit_bills')
        .update({ tenant_id: tenantInfo.id })
        .eq('id', bill.id)

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`)
      } else {
        console.log(`  ✅ Successfully assigned tenant`)
        updatedCount++
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} bills with tenant assignments`)

  } catch (error) {
    console.error('Error:', error)
  }
}

createTenantInfoRecords()
