import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the webhook signature
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('No Paystack signature found')
      return new Response('Unauthorized', { status: 401 })
    }

    // Get the raw body
    const body = await req.text()
    
    // Verify the webhook signature
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!secret) {
      console.error('No Paystack secret key found')
      return new Response('Server error', { status: 500 })
    }

    // Create HMAC signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== expectedSignature) {
      console.error('Invalid Paystack signature')
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse the webhook payload
    const event = JSON.parse(body)
    console.log('Paystack webhook event:', event.type)

    // Log the webhook event
    await supabaseAdmin
      .from('webhook_logs')
      .insert({
        event_type: event.type,
        payload: event,
        processed: false
      })

    // Handle different event types
    if (event.type === 'charge.success') {
      await handleSuccessfulPayment(supabaseAdmin, event.data)
    } else if (event.type === 'charge.failed') {
      await handleFailedPayment(supabaseAdmin, event.data)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})

async function handleSuccessfulPayment(supabaseAdmin: any, paymentData: any) {
  try {
    const { reference, metadata, amount, status } = paymentData

    console.log('Processing successful payment:', reference)

    // Check if this is a utility bill payment
    if (metadata?.type === 'utility' && metadata?.bill_id) {
      await processUtilityBillPayment(supabaseAdmin, reference, metadata, amount)
    } else if (metadata?.type === 'rent' && metadata?.lease_id) {
      await processRentPayment(supabaseAdmin, reference, metadata, amount)
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('webhook_logs')
      .update({ processed: true })
      .eq('payload->>reference', reference)

  } catch (error) {
    console.error('Error processing successful payment:', error)
  }
}

async function processUtilityBillPayment(supabaseAdmin: any, reference: string, metadata: any, amount: number) {
  try {
    const { bill_id, tenant_id, landlord_id } = metadata

    // Update the unit_bills table
    const { error: billError } = await supabaseAdmin
      .from('unit_bills')
      .update({
        status: 'paid',
        paystack_reference: reference,
        updated_at: new Date().toISOString()
      })
      .eq('id', bill_id)

    if (billError) {
      console.error('Error updating unit_bills:', billError)
      return
    }

    // Find the tenant's active lease for payment record
    let leaseId = null
    const { data: lease } = await supabaseAdmin
      .from('leases')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('status', 'active')
      .single()

    if (lease) {
      leaseId = lease.id
    } else {
      // Try to find via tenant_info if direct tenant_id lookup fails
      const { data: tenantInfo } = await supabaseAdmin
        .from('tenant_info')
        .select('id')
        .eq('profile_id', tenant_id)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (tenantInfo && tenantInfo.length > 0) {
        const { data: leaseByTenantInfo } = await supabaseAdmin
          .from('leases')
          .select('id')
          .eq('tenant_info_id', tenantInfo[0].id)
          .eq('status', 'active')
          .single()

        if (leaseByTenantInfo) {
          leaseId = leaseByTenantInfo.id
        }
      }
    }

    // Create a payment record only if we found a lease
    if (leaseId) {
      const { error: paymentError } = await supabaseAdmin
        .from('rent_payments')
        .insert({
          lease_id: leaseId,
          amount: amount / 100, // Convert from kobo
          payment_method: 'card',
          transaction_reference: reference,
          status: 'paid',
          paid_date: new Date().toISOString(),
          due_date: new Date().toISOString(),
          notes: `Utility bill payment - Reference: ${reference}`
        })

      if (paymentError) {
        console.error('Error creating payment record:', paymentError)
      }
    } else {
      console.log('No active lease found for tenant, skipping payment record creation')
    }

    // Send notification to tenant
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: tenant_id,
        title: 'Payment Successful',
        message: `Your utility bill payment of KES ${(amount / 100).toLocaleString()} has been processed successfully.`,
        type: 'payment_success',
        data: { bill_id, reference }
      })

    console.log('Utility bill payment processed successfully:', reference)

  } catch (error) {
    console.error('Error processing utility bill payment:', error)
  }
}

async function processRentPayment(supabaseAdmin: any, reference: string, metadata: any, amount: number) {
  try {
    const { lease_id, tenant_id, landlord_id } = metadata

    // Update the rent_payments table
    const { error: paymentError } = await supabaseAdmin
      .from('rent_payments')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString(),
        transaction_reference: reference
      })
      .eq('lease_id', lease_id)
      .eq('status', 'pending')

    if (paymentError) {
      console.error('Error updating rent payment:', paymentError)
      return
    }

    // Update tenant balance
    const { error: balanceError } = await supabaseAdmin
      .from('tenant_info')
      .update({
        current_balance: 0,
        payment_status: 'paid'
      })
      .eq('profile_id', tenant_id)

    if (balanceError) {
      console.error('Error updating tenant balance:', balanceError)
    }

    // Send notification to tenant
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: tenant_id,
        title: 'Rent Payment Successful',
        message: `Your rent payment of KES ${(amount / 100).toLocaleString()} has been processed successfully.`,
        type: 'payment_success',
        data: { lease_id, reference }
      })

    console.log('Rent payment processed successfully:', reference)

  } catch (error) {
    console.error('Error processing rent payment:', error)
  }
}

async function handleFailedPayment(supabaseAdmin: any, paymentData: any) {
  try {
    const { reference, metadata } = paymentData

    console.log('Processing failed payment:', reference)

    // Send notification to tenant about failed payment
    if (metadata?.tenant_id) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: metadata.tenant_id,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again or contact support.',
          type: 'payment_failed',
          data: { reference }
        })
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('webhook_logs')
      .update({ processed: true })
      .eq('payload->>reference', reference)

  } catch (error) {
    console.error('Error processing failed payment:', error)
  }
}