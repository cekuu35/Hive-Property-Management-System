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
    // Initialize Supabase client with service role key
    const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co'
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 [track-payment] Edge function started')

    // Parse request body
    const { 
      reference, 
      leaseId, 
      tenantId, 
      amount, 
      paymentType = 'rent' // 'rent' or 'utility'
    } = await req.json()

    console.log('📋 [track-payment] Payment details:', {
      reference,
      leaseId,
      tenantId,
      amount,
      paymentType
    })

    // Validate required fields
    if (!reference || !leaseId || !tenantId || !amount) {
      console.error('❌ [track-payment] Missing required fields')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: reference, leaseId, tenantId, amount' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate due date for current month (UTC)
    const currentDate = new Date()
    const firstDayOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1))
    const dueDate = firstDayOfMonth.toISOString().split('T')[0]

    console.log('📅 [track-payment] Due date calculated:', dueDate)

    let paymentId = null

    // Check if payment already exists for this month
    const { data: existingPayments, error: existingError } = await supabase
      .from('rent_payments')
      .select('id, status, amount')
      .eq('lease_id', leaseId)
      .eq('due_date', dueDate)

    if (existingError) {
      console.error('❌ [track-payment] Error checking existing payments:', existingError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check existing payments' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingPayments && existingPayments.length > 0) {
      const existingPayment = existingPayments[0]
      console.log('📋 [track-payment] Found existing payment:', existingPayment)
      
      if (existingPayment.status === 'paid') {
        console.log('✅ [track-payment] Payment already marked as paid')
        paymentId = existingPayment.id
      } else {
        // Update existing payment
        console.log('🔄 [track-payment] Updating existing payment...')
        const { data: updatedPayment, error: updateError } = await supabase
          .from('rent_payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'card',
            transaction_reference: reference,
            notes: `Payment processed via ${paymentType} tracking`
          })
          .eq('id', existingPayment.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ [track-payment] Error updating payment:', updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to update payment' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        paymentId = updatedPayment.id
        console.log('✅ [track-payment] Payment updated:', updatedPayment)
      }
    } else {
      // Create new payment record
      console.log('🔄 [track-payment] Creating new payment record...')
      const { data: newPayment, error: createError } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: leaseId,
          amount: amount,
          due_date: dueDate,
          status: 'pending'
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ [track-payment] Error creating payment:', createError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create payment' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      paymentId = newPayment.id
      console.log('✅ [track-payment] Payment created:', newPayment)
    }

    // Update tenant_info balance to 0 and payment status to paid
    console.log('🔄 [track-payment] Updating tenant balance...')
    console.log('📋 [track-payment] Balance update details:', {
      tenantId,
      currentBalance: 0,
      paymentStatus: 'paid'
    })
    
    const { error: balanceError } = await supabase
      .from('tenant_info')
      .update({
        current_balance: 0,
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)

    if (balanceError) {
      console.error('❌ [track-payment] Error updating tenant balance:', balanceError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment recorded but failed to update balance' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ [track-payment] Tenant balance updated successfully')
    
    // Verify the update worked
    const { data: verifyTenant, error: verifyError } = await supabase
      .from('tenant_info')
      .select('current_balance, payment_status, updated_at')
      .eq('id', tenantId)
      .single()
      
    if (verifyError) {
      console.error('❌ [track-payment] Error verifying balance update:', verifyError)
    } else {
      console.log('✅ [track-payment] Balance update verified:', verifyTenant)
    }

    // Send real-time notification to trigger UI updates
    console.log('🔄 [track-payment] Sending real-time notification...')
    const { error: notifyError } = await supabase
      .channel('payment_updates')
      .send({
        type: 'broadcast',
        event: 'payment_completed',
        payload: {
          tenantId,
          leaseId,
          paymentId,
          reference,
          amount,
          balanceUpdated: true,
          timestamp: new Date().toISOString()
        }
      })

    if (notifyError) {
      console.error('❌ [track-payment] Error sending notification:', notifyError)
    } else {
      console.log('✅ [track-payment] Real-time notification sent')
    }

    // Return success response
    const response = {
      success: true,
      paymentId,
      reference,
      amount,
      balanceUpdated: true,
      message: 'Payment tracked and balance updated successfully'
    }

    console.log('🎉 [track-payment] Payment tracking completed successfully:', response)

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [track-payment] Unexpected error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
