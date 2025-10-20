import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MpesaConfig {
  accessToken: string | null
  tokenExpiry: number
  baseURL: string
  stkPushURL: string
  apiKey: string
  clientId: string
  clientSecret: string
}

class MpesaAPI {
  private config: MpesaConfig

  constructor() {
    this.config = {
      accessToken: null,
      tokenExpiry: 0,
      baseURL: 'https://accounts.buni.kcbgroup.com',
      stkPushURL: 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush',
      apiKey: Deno.env.get('KCB_API_KEY') || '',
      clientId: Deno.env.get('KCB_CLIENT_ID') || '',
      clientSecret: Deno.env.get('KCB_CLIENT_SECRET') || ''
    }
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.config.accessToken && Date.now() < this.config.tokenExpiry) {
      return this.config.accessToken
    }

    try {
      console.log('🔑 [M-Pesa] Getting KCB Buni access token...')
      
      const response = await fetch(`${this.config.baseURL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${this.config.clientId}:${this.config.clientSecret}`)
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      this.config.accessToken = data.access_token
      this.config.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer
      
      console.log('✅ [M-Pesa] Access token obtained')
      return this.config.accessToken
    } catch (error) {
      console.error('❌ [M-Pesa] Error getting access token:', error)
      throw error
    }
  }

  async initiateSTKPush(phoneNumber: string, amount: number, accountReference: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      
      console.log('📱 [M-Pesa] Initiating STK Push...', { phoneNumber, amount, accountReference })

      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
      const businessShortCode = '174379'
      const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
      const password = btoa(`${businessShortCode}${passkey}${timestamp}`)

      const stkPushData = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-stk-push/callback`,
        AccountReference: accountReference,
        TransactionDesc: 'Property Management Payment'
      }

      const response = await fetch(this.config.stkPushURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify(stkPushData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`STK Push failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ [M-Pesa] STK Push initiated successfully:', result)
      return result
    } catch (error) {
      console.error('❌ [M-Pesa] Error in initiateSTKPush:', error)
      throw error
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const path = url.pathname

    // Route handling
    if (path.endsWith('/rent-payment') && req.method === 'POST') {
      return await handleRentPayment(req, supabase)
    } else if (path.endsWith('/utility-payment') && req.method === 'POST') {
      return await handleUtilityPayment(req, supabase)
    } else if (path.endsWith('/callback') && req.method === 'POST') {
      return await handleCallback(req, supabase)
    } else if (path.includes('/payment-status/') && req.method === 'GET') {
      return await handlePaymentStatus(req, supabase, path)
    } else {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('❌ [M-Pesa] Server error:', error)
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

async function handleRentPayment(req: Request, supabase: any) {
  try {
    const { leaseId, amount, phoneNumber } = await req.json()
    
    console.log('🏠 [M-Pesa] Processing rent payment:', { leaseId, amount, phoneNumber })

    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        rent_amount,
        units!inner(
          id,
          properties!inner(
            id,
            landlords!inner(
              id,
              mpesa_shortcode,
              mpesa_passkey
            )
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      throw new Error('Lease not found')
    }

    // Get landlord M-Pesa details
    const landlord = lease.units.properties.landlords
    if (!landlord.mpesa_shortcode || !landlord.mpesa_passkey) {
      throw new Error('Landlord M-Pesa details not configured')
    }

    // Initialize M-Pesa API
    const mpesa = new MpesaAPI()
    
    // Initiate STK Push
    const result = await mpesa.initiateSTKPush(
      phoneNumber,
      amount,
      `RENT_${leaseId}`
    )

    // Store payment request
    const { error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
        type: 'rent',
        lease_id: leaseId,
        amount: amount,
        phone_number: phoneNumber,
        status: 'pending'
      })

    if (insertError) {
      console.error('❌ [M-Pesa] Error storing payment request:', insertError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push initiated successfully',
        data: result,
        checkoutRequestID: result.CheckoutRequestID
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ [M-Pesa] Error in rent payment:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleUtilityPayment(req: Request, supabase: any) {
  try {
    const { billId, amount, phoneNumber } = await req.json()
    
    console.log('⚡ [M-Pesa] Processing utility payment:', { billId, amount, phoneNumber })

    // Get bill details
    const { data: bill, error: billError } = await supabase
      .from('unit_bills')
      .select(`
        id,
        amount,
        units!inner(
          id,
          properties!inner(
            id,
            landlords!inner(
              id,
              mpesa_shortcode,
              mpesa_passkey
            )
          )
        )
      `)
      .eq('id', billId)
      .single()

    if (billError || !bill) {
      throw new Error('Utility bill not found')
    }

    // Get landlord M-Pesa details
    const landlord = bill.units.properties.landlords
    if (!landlord.mpesa_shortcode || !landlord.mpesa_passkey) {
      throw new Error('Landlord M-Pesa details not configured')
    }

    // Initialize M-Pesa API
    const mpesa = new MpesaAPI()
    
    // Initiate STK Push
    const result = await mpesa.initiateSTKPush(
      phoneNumber,
      amount,
      `UTILITY_${billId}`
    )

    // Store payment request
    const { error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
        type: 'utility',
        bill_id: billId,
        amount: amount,
        phone_number: phoneNumber,
        status: 'pending'
      })

    if (insertError) {
      console.error('❌ [M-Pesa] Error storing payment request:', insertError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push initiated successfully',
        data: result,
        checkoutRequestID: result.CheckoutRequestID
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ [M-Pesa] Error in utility payment:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleCallback(req: Request, supabase: any) {
  try {
    const callbackData = await req.json()
    console.log('📞 [M-Pesa] Received callback:', callbackData)

    const { CheckoutRequestID, ResultCode, ResultDesc } = callbackData.Body.stkCallback

    // Update payment request status
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: ResultCode === 0 ? 'completed' : 'failed',
        result_code: ResultCode,
        result_description: ResultDesc,
        updated_at: new Date().toISOString()
      })
      .eq('checkout_request_id', CheckoutRequestID)

    if (updateError) {
      console.error('❌ [M-Pesa] Error updating payment status:', updateError)
    }

    // If payment was successful, process the payment
    if (ResultCode === 0) {
      await processSuccessfulPayment(supabase, CheckoutRequestID)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('❌ [M-Pesa] Error in callback:', error)
    return new Response('Error', { status: 500 })
  }
}

async function handlePaymentStatus(req: Request, supabase: any, path: string) {
  try {
    const checkoutRequestId = path.split('/').pop()
    
    const { data: payment, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single()

    if (error || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(payment),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('❌ [M-Pesa] Error getting payment status:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function processSuccessfulPayment(supabase: any, checkoutRequestId: string) {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ [M-Pesa] Payment not found for processing')
      return
    }

    if (payment.type === 'rent') {
      // Process rent payment
      const { error: rentError } = await supabase
        .from('rent_payments')
        .insert({
          lease_id: payment.lease_id,
          amount: payment.amount,
          payment_date: new Date().toISOString(),
          status: 'completed',
          payment_method: 'mpesa',
          transaction_id: checkoutRequestId
        })

      if (rentError) {
        console.error('❌ [M-Pesa] Error creating rent payment record:', rentError)
      } else {
        console.log('✅ [M-Pesa] Rent payment processed successfully')
      }
    } else if (payment.type === 'utility') {
      // Process utility payment
      const { error: utilityError } = await supabase
        .from('utility_payments')
        .insert({
          bill_id: payment.bill_id,
          amount: payment.amount,
          payment_date: new Date().toISOString(),
          status: 'completed',
          payment_method: 'mpesa',
          transaction_id: checkoutRequestId
        })

      if (utilityError) {
        console.error('❌ [M-Pesa] Error creating utility payment record:', utilityError)
      } else {
        console.log('✅ [M-Pesa] Utility payment processed successfully')
      }
    }
  } catch (error) {
    console.error('❌ [M-Pesa] Error processing successful payment:', error)
  }
}