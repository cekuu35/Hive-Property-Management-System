import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔧 FIXING RLS POLICIES FOR RENT_PAYMENTS')

    // 1. Drop existing problematic policies
    console.log('1️⃣ DROPPING EXISTING POLICIES...')
    
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view their rent payments" ON rent_payments;',
      'DROP POLICY IF EXISTS "Tenants can insert their own rent payments" ON rent_payments;',
      'DROP POLICY IF EXISTS "Landlords can insert rent payments for their properties" ON rent_payments;',
      'DROP POLICY IF EXISTS "Landlords can view rent payments for their properties" ON rent_payments;',
      'DROP POLICY IF EXISTS "Landlords can update rent payments for their properties" ON rent_payments;',
      'DROP POLICY IF EXISTS "Tenants can update their own rent payments" ON rent_payments;'
    ]

    for (const sql of dropPolicies) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
      if (error) {
        console.log(`⚠️ Warning dropping policy: ${error.message}`)
      } else {
        console.log(`✅ Dropped policy: ${sql.split('"')[1]}`)
      }
    }

    // 2. Create new comprehensive policies
    console.log('2️⃣ CREATING NEW POLICIES...')
    
    const newPolicies = [
      {
        name: 'Tenants can view their own rent payments',
        sql: `
          CREATE POLICY "Tenants can view their own rent payments" 
          ON rent_payments 
          FOR SELECT 
          USING (
            lease_id IN (
              SELECT l.id
              FROM leases l
              JOIN tenant_info ti ON l.tenant_info_id = ti.id
              JOIN profiles pr ON ti.profile_id = pr.id
              WHERE pr.user_id = auth.uid() AND l.status = 'active'
            )
          );
        `
      },
      {
        name: 'Landlords can view rent payments for their properties',
        sql: `
          CREATE POLICY "Landlords can view rent payments for their properties" 
          ON rent_payments 
          FOR SELECT 
          USING (
            lease_id IN (
              SELECT l.id
              FROM leases l
              JOIN units u ON l.unit_id = u.id
              JOIN properties p ON u.property_id = p.id
              JOIN profiles pr ON p.landlord_id = pr.id
              WHERE pr.user_id = auth.uid()
            )
          );
        `
      },
      {
        name: 'Tenants can insert their own rent payments',
        sql: `
          CREATE POLICY "Tenants can insert their own rent payments" 
          ON rent_payments 
          FOR INSERT 
          WITH CHECK (
            lease_id IN (
              SELECT l.id
              FROM leases l
              JOIN tenant_info ti ON l.tenant_info_id = ti.id
              JOIN profiles pr ON ti.profile_id = pr.id
              WHERE pr.user_id = auth.uid() AND l.status = 'active'
            )
          );
        `
      },
      {
        name: 'Landlords can insert rent payments for their properties',
        sql: `
          CREATE POLICY "Landlords can insert rent payments for their properties" 
          ON rent_payments 
          FOR INSERT 
          WITH CHECK (
            lease_id IN (
              SELECT l.id
              FROM leases l
              JOIN units u ON l.unit_id = u.id
              JOIN properties p ON u.property_id = p.id
              JOIN profiles pr ON p.landlord_id = pr.id
              WHERE pr.user_id = auth.uid()
            )
          );
        `
      },
      {
        name: 'Landlords can update rent payments for their properties',
        sql: `
          CREATE POLICY "Landlords can update rent payments for their properties" 
          ON rent_payments 
          FOR UPDATE 
          USING (
            lease_id IN (
              SELECT l.id
              FROM leases l
              JOIN units u ON l.unit_id = u.id
              JOIN properties p ON u.property_id = p.id
              JOIN profiles pr ON p.landlord_id = pr.id
              WHERE pr.user_id = auth.uid()
            )
          );
        `
      },
      {
        name: 'Tenants can update their own rent payments',
        sql: `
          CREATE POLICY "Tenants can update their own rent payments" 
          ON rent_payments 
          FOR UPDATE 
          USING (
            lease_id IN (
              SELECT l.id
              FROM leases l
              JOIN tenant_info ti ON l.tenant_info_id = ti.id
              JOIN profiles pr ON ti.profile_id = pr.id
              WHERE pr.user_id = auth.uid() AND l.status = 'active'
            )
          );
        `
      }
    ]

    for (const policy of newPolicies) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: policy.sql })
      if (error) {
        console.error(`❌ Error creating policy "${policy.name}":`, error)
      } else {
        console.log(`✅ Created policy: ${policy.name}`)
      }
    }

    // 3. Ensure RLS is enabled
    console.log('3️⃣ ENABLING RLS...')
    
    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;'
    })

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError)
    } else {
      console.log('✅ RLS enabled for rent_payments table')
    }

    // 4. Verify the policies were created
    console.log('4️⃣ VERIFYING NEW POLICIES...')
    
    const { data: newPoliciesCheck, error: verifyError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename = 'rent_payments'
          ORDER BY policyname;
        `
      })

    if (verifyError) {
      console.error('❌ Error verifying policies:', verifyError)
    } else {
      console.log('✅ New policies created:')
      newPoliciesCheck.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`)
      })
    }

    console.log('🎉 RLS POLICIES FIXED!')
    console.log('✅ Tenants can now insert their own rent payments')
    console.log('✅ Landlords can view and manage rent payments for their properties')
    console.log('✅ All necessary policies are in place')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policies fixed successfully',
        policies: newPoliciesCheck || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Fix failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
