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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const url = new URL(req.url)
    const method = req.method
    const path = url.pathname

    console.log('Function received request:', { method, path, fullUrl: req.url })

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, role, user_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Route handling
    console.log('Checking routes for path:', path, 'method:', method)
    
    if (path.includes('/api/tenant/bills') && method === 'GET') {
      console.log('Matched tenant bills route')
      return await getTenantBills(supabaseClient, supabaseAdmin, profile.id)
    } else if (path.includes('/api/landlord/bills') && method === 'GET') {
      console.log('Matched landlord bills route')
      return await getLandlordBills(supabaseClient, profile.id)
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
      return await createBill(supabaseClient, profile.id, body)
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
      return await updateBill(supabaseClient, profile.id, billId, body)
    } else if (path.includes('/api/landlord/bills/') && method === 'DELETE') {
      const billId = path.split('/').pop()
      if (!billId) {
        return new Response(
          JSON.stringify({ error: 'Invalid bill ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await deleteBill(supabaseClient, profile.id, billId)
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
      return await initiateBillPayment(supabaseClient, profile.id, body)
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
      return await addUtility(supabaseClient, body)
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

async function getTenantBills(supabaseClient: any, supabaseAdmin: any, profileId: string) {
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

async function getLandlordBills(supabaseClient: any, profileId: string) {
  try {
    // Get landlord's bills directly without RPC function
    const { data: bills, error } = await supabaseClient
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
        ),
        tenant_info!unit_bills_tenant_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('landlord_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ bills: bills || [] }),
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

async function createBill(supabaseClient: any, profileId: string, body: any) {
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
    const { data: unit, error: unitError } = await supabaseClient
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
    const { data: existingBill, error: duplicateError } = await supabaseClient
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

    // Create the bill
    const { data: bill, error: createError } = await supabaseClient
      .from('unit_bills')
      .insert({
        unit_id,
        utility_id,
        month,
        amount: parseFloat(amount),
        due_date,
        landlord_id: profileId,
        tenant_id: tenant_id || null
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

async function updateBill(supabaseClient: any, profileId: string, billId: string, body: any) {
  try {
    const { amount, due_date, status, payment_reason } = body

    // Check if bill exists and belongs to landlord
    const { data: bill, error: billError } = await supabaseClient
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

    const { data: updatedBill, error: updateError } = await supabaseClient
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

async function deleteBill(supabaseClient: any, profileId: string, billId: string) {
  try {
    // Check if bill exists and belongs to landlord
    const { data: bill, error: billError } = await supabaseClient
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
    const { error: deleteError } = await supabaseClient
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

async function initiateBillPayment(supabaseClient: any, profileId: string, body: any) {
  try {
    const { bill_id } = body

    if (!bill_id) {
      return new Response(
        JSON.stringify({ error: 'Bill ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get bill details
    const { data: bill, error: billError } = await supabaseClient
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

async function addUtility(supabaseClient: any, body: any) {
  try {
    const { name } = body
    
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Utility name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabaseClient
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