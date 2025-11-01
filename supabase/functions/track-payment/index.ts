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

    // Verify payment with Paystack
    console.log('🔍 [track-payment] Verifying payment with Paystack...')
    const paystackSecretKey = 'sk_test_ad42ab79c7915c9cdbcc6328e606a1f84d6b0f81'
    
    try {
      const verifyResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const verifyData = await verifyResponse.json()
      console.log('🔍 [track-payment] Paystack verification response:', verifyData)

      if (!verifyData.status || verifyData.data.status !== 'success') {
        console.error('❌ [track-payment] Payment verification failed:', verifyData)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Payment verification failed',
            details: verifyData.message 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ [track-payment] Payment verified successfully with Paystack')
    } catch (verifyError) {
      console.error('❌ [track-payment] Error verifying payment with Paystack:', verifyError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to verify payment with Paystack' 
        }),
        { 
          status: 500, 
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
          paid_date: new Date().toISOString(),
          status: 'paid',
          payment_method: 'card',
          transaction_reference: reference,
          notes: `Payment processed via ${paymentType} tracking`
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
    
    // First, find the tenant_info record by ID or profile_id
    let tenantInfoId = tenantId;
    
    // Check if tenantId is actually a profile_id (UUID format check)
    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from('tenant_info')
      .select('id, profile_id')
      .or(`id.eq.${tenantId},profile_id.eq.${tenantId}`)
      .maybeSingle()
    
    if (tenantInfoError) {
      console.error('❌ [track-payment] Error finding tenant_info:', tenantInfoError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to find tenant information' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!tenantInfo?.id) {
      console.error('❌ [track-payment] No tenant_info found for tenantId:', tenantId)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No tenant information found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    tenantInfoId = tenantInfo.id;
    
    // Get current balance to deduct paid amount
    const { data: currentTenant, error: fetchError } = await supabase
      .from('tenant_info')
      .select('current_balance')
      .eq('id', tenantInfoId)
      .single()
    
    if (fetchError) {
      console.error('❌ [track-payment] Error fetching current balance:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch current balance' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const currentBalance = currentTenant?.current_balance || 0
    const newBalance = Math.max(0, currentBalance - amount)
    
    console.log('💰 [track-payment] Balance calculation:', {
      originalTenantId: tenantId,
      tenantInfoId: tenantInfoId,
      currentBalance,
      amountPaid: amount,
      newBalance
    })
    
    const { error: balanceError } = await supabase
      .from('tenant_info')
      .update({
        current_balance: newBalance,
        payment_status: newBalance > 0 ? 'unpaid' : 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantInfoId)

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
      .eq('id', tenantInfoId)
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
          tenantId: tenantInfoId,
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
