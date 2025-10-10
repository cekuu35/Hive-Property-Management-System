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
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const url = new URL(req.url)
    const method = req.method
    const path = url.pathname

    console.log('Function received request:', { method, path, fullUrl: req.url })

    // For GET requests, we'll get the landlord_id from query params
    // For POST requests, we'll get it from the request body
    let landlordId = null
    
    if (method === 'GET') {
      landlordId = url.searchParams.get('landlord_id')
    } else if (method === 'POST') {
      const body = await req.json()
      landlordId = body.landlord_id
    }

    if (!landlordId) {
      return new Response(
        JSON.stringify({ error: 'landlord_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the landlord exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', landlordId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Landlord profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.role !== 'landlord') {
      return new Response(
        JSON.stringify({ error: 'User is not a landlord' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route handling
    console.log('Checking routes for path:', path, 'method:', method)
    
    if (path.includes('/api/tenant/bills') && method === 'GET') {
      console.log('Matched tenant bills route')
      return await getTenantBills(supabaseAdmin, supabaseAdmin, profile.id)
    } else if ((path.includes('/api/landlord/bills') || path === '/utility-bills') && method === 'GET') {
      console.log('Matched landlord bills route')
      return await getLandlordBills(supabaseAdmin, profile.id)
    } else if (path.includes('/api/landlord/bills') && method === 'POST') {
      let body = {}
      try {
        body = await req.json()
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await createBill(supabaseAdmin, profile.id, body)
    } else if (path.includes('/api/landlord/bills/') && method === 'PATCH') {
      const billId = path.split('/').pop()
      if (!billId) {
        return new Response(
          JSON.stringify({ error: 'Invalid bill ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      let body = {}
      try {
        body = await req.json()
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await updateBill(supabaseAdmin, profile.id, billId, body)
    } else if (path.includes('/api/landlord/bills/') && method === 'DELETE') {
      const billId = path.split('/').pop()
      if (!billId) {
        return new Response(
          JSON.stringify({ error: 'Invalid bill ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await deleteBill(supabaseAdmin, profile.id, billId)
    } else if (path.includes('/api/paystack/initiate-bill-payment') && method === 'POST') {
      let body = {}
      try {
        body = await req.json()
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await initiateBillPayment(supabaseAdmin, profile.id, body)
    } else if (path.includes('/api/utilities') && method === 'POST') {
      let body = {}
      try {
        body = await req.json()
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await addUtility(supabaseAdmin, body)
    } else {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getTenantBills(supabaseAdmin: any, supabaseAdmin: any, profileId: string) {
  try {
    // First, get the tenant_info record for this profile (use admin client for database operations)
    const { data: tenantInfo, error: tenantError } = await supabaseAdmin
      .from('tenant_info')
      .select('id')
      .eq('profile_id', profileId)
      .single()

    if (tenantError || !tenantInfo) {
      return new Response(
        JSON.stringify({ bills: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tenant's bills using tenant_info.id (use admin client for database operations)
    const { data: bills, error } = await supabaseAdmin
      .from('unit_bills')
      .select(`
        id,
        amount,
        due_date,
        status,
        month,
        created_at,
        utilities!unit_bills_utility_id_fkey (name),
        units!unit_bills_unit_id_fkey (
          unit_number,
          properties!units_property_id_fkey (name)
        )
      `)
      .eq('tenant_id', tenantInfo.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ bills: bills || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching tenant bills:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bills' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getLandlordBills(supabaseAdmin: any, profileId: string) {
  try {
    // Get landlord's bills first
    const { data: bills, error } = await supabaseAdmin
      .from('unit_bills')
      .select(`
        id,
        amount,
        due_date,
        status,
        month,
        created_at,
        tenant_id,
        utilities!unit_bills_utility_id_fkey (name),
        units!unit_bills_unit_id_fkey (
          unit_number,
          properties!units_property_id_fkey (name)
        )
      `)
      .eq('landlord_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching landlord bills:', error)
      throw error
    }

    console.log('Fetched landlord bills:', bills?.length || 0)

    // Now manually fetch tenant information for each bill based on unit information
    const billsWithTenants = await Promise.all(
      (bills || []).map(async (bill) => {
        let tenantInfo = null
        
        if (bill.unit_id) {
          // Find active tenant for this unit through leases
          const { data: lease, error: leaseError } = await supabaseAdmin
            .from('leases')
            .select('tenant_id')
            .eq('unit_id', bill.unit_id)
            .eq('status', 'active')
            .single()

          if (!leaseError && lease) {
            // Get tenant info from tenant_info table (since lease.tenant_id references tenant_info.id)
            const { data: tenant, error: tenantError } = await supabaseAdmin
              .from('tenant_info')
              .select('first_name, last_name')
              .eq('id', lease.tenant_id)
              .single()

            if (!tenantError && tenant) {
              tenantInfo = tenant
            }
          }
          
          // If no tenant found through lease, try tenant_info table as fallback
          if (!tenantInfo) {
            const { data: tenant, error: tenantError } = await supabaseAdmin
              .from('tenant_info')
              .select('first_name, last_name')
              .eq('unit_id', bill.unit_id)
              .eq('status', 'active')
              .single()

            if (!tenantError && tenant) {
              tenantInfo = tenant
            }
          }
        }

        return {
          ...bill,
          tenant_info: tenantInfo
        }
      })
    )

    console.log('Sample bill with tenant info:', billsWithTenants?.[0])

    return new Response(
      JSON.stringify({ bills: billsWithTenants || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching landlord bills:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch bills' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function createBill(supabaseAdmin: any, profileId: string, body: any) {
  try {
    const { unit_id, utility_id, month, amount, due_date, tenant_id } = body

    // Validate required fields
    if (!unit_id || !utility_id || !month || !amount || !due_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if landlord owns the unit
    const { data: unit, error: unitError } = await supabaseAdmin
      .from('units')
      .select(`
        id,
        properties!units_property_id_fkey (
          landlord_id
        )
      `)
      .eq('id', unit_id)
      .single()

    if (unitError || !unit || unit.properties.landlord_id !== profileId) {
      return new Response(
        JSON.stringify({ error: 'Unit not found or not owned by landlord' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate bill
    const { data: existingBill, error: duplicateError } = await supabaseAdmin
      .from('unit_bills')
      .select('id')
      .eq('unit_id', unit_id)
      .eq('utility_id', utility_id)
      .eq('month', month)
      .neq('status', 'deleted')
      .single()

    if (existingBill) {
      return new Response(
        JSON.stringify({ error: 'Bill already exists for this unit, utility, and month' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

        // If no tenant_id provided, try to find the current tenant for this unit
        let finalTenantId = tenant_id
        if (!finalTenantId) {
          // First try to find through active lease
          const { data: lease, error: leaseError } = await supabaseAdmin
            .from('leases')
            .select('tenant_id')
            .eq('unit_id', unit_id)
            .eq('status', 'active')
            .single()

          if (!leaseError && lease) {
            finalTenantId = lease.tenant_id
            console.log('Auto-assigned tenant from lease to bill:', finalTenantId)
          } else {
            // Fallback: try tenant_info table
            const { data: currentTenant, error: tenantError } = await supabaseAdmin
              .from('tenant_info')
              .select('id')
              .eq('unit_id', unit_id)
              .eq('status', 'active')
              .single()

            if (!tenantError && currentTenant) {
              finalTenantId = currentTenant.id
              console.log('Auto-assigned tenant from tenant_info to bill:', finalTenantId)
            } else {
              console.log('No active tenant found for unit:', unit_id)
            }
          }
        }

    // Create the bill
    const { data: bill, error: createError } = await supabaseAdmin
      .from('unit_bills')
      .insert({
        unit_id,
        utility_id,
        month,
        amount: parseFloat(amount),
        due_date,
        landlord_id: profileId,
        tenant_id: finalTenantId
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return new Response(
      JSON.stringify({ bill }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating bill:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create bill' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function updateBill(supabaseAdmin: any, profileId: string, billId: string, body: any) {
  try {
    const { amount, due_date, status, payment_reason } = body

    // Check if bill exists and belongs to landlord
    const { data: bill, error: billError } = await supabaseAdmin
      .from('unit_bills')
      .select('id, landlord_id')
      .eq('id', billId)
      .single()

    if (billError || !bill || bill.landlord_id !== profileId) {
      return new Response(
        JSON.stringify({ error: 'Bill not found or not owned by landlord' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the bill
    const updateData: any = {}
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (due_date !== undefined) updateData.due_date = due_date
    if (status !== undefined) updateData.status = status
    if (payment_reason !== undefined) updateData.payment_reason = payment_reason

    const { data: updatedBill, error: updateError } = await supabaseAdmin
      .from('unit_bills')
      .update(updateData)
      .eq('id', billId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ bill: updatedBill }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating bill:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update bill' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function deleteBill(supabaseAdmin: any, profileId: string, billId: string) {
  try {
    // Check if bill exists and belongs to landlord
    const { data: bill, error: billError } = await supabaseAdmin
      .from('unit_bills')
      .select('id, landlord_id')
      .eq('id', billId)
      .single()

    if (billError || !bill || bill.landlord_id !== profileId) {
      return new Response(
        JSON.stringify({ error: 'Bill not found or not owned by landlord' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete the bill
    const { error: deleteError } = await supabaseAdmin
      .from('unit_bills')
      .delete()
      .eq('id', billId)

    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({ message: 'Bill deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting bill:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to delete bill' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function initiateBillPayment(supabaseAdmin: any, profileId: string, body: any) {
  try {
    const { bill_id } = body

    if (!bill_id) {
      return new Response(
        JSON.stringify({ error: 'Bill ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get bill details
    const { data: bill, error: billError } = await supabaseAdmin
      .from('unit_bills')
      .select(`
        id,
        amount,
        due_date,
        status,
        utilities!unit_bills_utility_id_fkey (name),
        units!unit_bills_unit_id_fkey (
          unit_number,
          properties!units_property_id_fkey (name)
        )
      `)
      .eq('id', bill_id)
      .single()

    if (billError || !bill) {
      return new Response(
        JSON.stringify({ error: 'Bill not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (bill.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Bill is already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate Paystack reference
    const reference = `utility_${bill_id}_${Date.now()}`
    const amount = Math.round(bill.amount * 100) // Convert to kobo

    // Create Paystack payment URL
    const paystackUrl = new URL('https://api.paystack.co/transaction/initialize')
    const paystackData = {
      email: 'tenant@example.com', // This should be the tenant's email
      amount: amount,
      currency: 'KES',
      reference: reference,
      metadata: {
        bill_id: bill_id,
        tenant_id: profileId,
        landlord_id: bill.landlord_id,
        type: 'utility'
      },
      callback_url: `${Deno.env.get('SITE_URL')}/payment/callback?type=utility&bill_id=${bill_id}`
    }

    const paystackResponse = await fetch(paystackUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paystackData)
    })

    const paystackResult = await paystackResponse.json()

    if (!paystackResult.status) {
      return new Response(
        JSON.stringify({ error: 'Failed to initialize payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        authorization_url: paystackResult.data.authorization_url,
        reference: reference,
        bill: bill
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error initiating bill payment:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to initiate payment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function addUtility(supabaseAdmin: any, body: any) {
  try {
    const { name } = body
    
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Utility name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('utilities')
      .upsert({ name }, { onConflict: 'name' })
      .select()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ utility: data[0] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error adding utility:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to add utility' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}