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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active leases
    const { data: leases, error: leasesError } = await supabaseClient
      .from('leases')
      .select('*')
      .eq('status', 'active')

    if (leasesError) {
      throw new Error(`Error fetching leases: ${leasesError.message}`)
    }

    if (!leases || leases.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active leases found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    // Generate the first day of current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const dueDate = firstDayOfMonth.toISOString().split('T')[0]

    const results = []

    for (const lease of leases) {
      try {
        // Check if rent payment already exists for this month
        const { data: existingPayment, error: checkError } = await supabaseClient
          .from('rent_payments')
          .select('id')
          .eq('lease_id', lease.id)
          .eq('due_date', dueDate)
          .maybeSingle()

        if (checkError) {
          console.error(`Error checking existing payment for lease ${lease.id}:`, checkError)
          continue
        }

        // Skip if payment already exists for this month
        if (existingPayment) {
          console.log(`Rent payment already exists for lease ${lease.id} for ${dueDate}`)
          continue
        }

        // Create new rent payment
        const { data: newPayment, error: paymentError } = await supabaseClient
          .from('rent_payments')
          .insert({
            lease_id: lease.id,
            amount: lease.rent_amount,
            due_date: dueDate,
            status: 'pending'
          })
          .select()
          .single()

        if (paymentError) {
          console.error(`Error creating payment for lease ${lease.id}:`, paymentError)
          continue
        }

        results.push({
          lease_id: lease.id,
          payment_id: newPayment.id,
          amount: lease.rent_amount,
          due_date: dueDate
        })

        console.log(`Created rent payment for lease ${lease.id}: KES ${lease.rent_amount} due ${dueDate}`)

      } catch (error) {
        console.error(`Error processing lease ${lease.id}:`, error)
        continue
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Generated ${results.length} monthly rent payments`,
        payments: results,
        due_date: dueDate
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in generate-monthly-rent function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate monthly rent payments',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
