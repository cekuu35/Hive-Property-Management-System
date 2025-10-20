import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.access_token) {
        this.config.accessToken = data.access_token
        this.config.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer
        console.log('✅ [M-Pesa] Access token obtained successfully')
        return this.config.accessToken
      } else {
        throw new Error('No access token in response')
      }
    } catch (error) {
      console.error('❌ [M-Pesa] Error getting KCB Buni access token:', error)
      throw error
    }
  }

  async initiateSTKPush(request: any): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      
      // Generate unique message ID
      const messageId = `${Date.now()}_KCBOrg_${Math.floor(Math.random() * 10000000000)}`
      
      // Format request according to KCB Buni Express STK Push API documentation
      const stkPushRequest = {
        phoneNumber: request.PartyA,
        amount: request.Amount.toString(),
        invoiceNumber: request.AccountReference,
        sharedShortCode: true,
        orgShortCode: "",
        orgPassKey: "",
        callbackUrl: request.CallBackURL || 'https://posthere.io/f613-4b7f-b82b',
        transactionDescription: request.TransactionDesc || 'Payment'
      }

      console.log('🚀 [M-Pesa] Initiating KCB Buni Express STK Push:', {
        phoneNumber: stkPushRequest.phoneNumber,
        amount: stkPushRequest.amount,
        invoiceNumber: stkPushRequest.invoiceNumber,
        transactionDescription: stkPushRequest.transactionDescription,
        messageId: messageId
      })

      const response = await fetch(this.config.stkPushURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'routeCode': '207',
          'operation': 'STKPush',
          'messageId': messageId
        },
        body: JSON.stringify(stkPushRequest),
      })

      console.log(`STK Push Status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ [M-Pesa] STK Push response:', data)
        return data
      } else {
        const errorText = await response.text()
        console.error('❌ [M-Pesa] STK Push failed:', errorText)
        throw new Error(`STK Push failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
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

    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname

    // Route handling
    if (method === 'POST' && path.endsWith('/rent-payment')) {
      return await handleRentPayment(req, supabase)
    } else if (method === 'POST' && path.endsWith('/utility-payment')) {
      return await handleUtilityPayment(req, supabase)
    } else if (method === 'POST' && path.endsWith('/callback')) {
      return await handleCallback(req, supabase)
    } else if (method === 'GET' && path.includes('/payment-status/')) {
      return await handlePaymentStatus(req, supabase)
    } else {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  } catch (error) {
    console.error('❌ [M-Pesa] Edge function error:', error)
    return new Response(
      JSON.stringify({ 
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

    // 1. Get lease details with landlord information
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        units!inner(
          property_id,
          properties!inner(
            landlord_id,
            landlords!inner(
              id,
              paybill_number,
              account_reference
            )
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      console.error('❌ [M-Pesa] Lease not found:', leaseError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Lease not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const landlord = lease.units?.properties?.landlords
    if (!landlord?.paybill_number || !landlord?.account_reference) {
      console.error('❌ [M-Pesa] Landlord M-Pesa details not configured')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Landlord M-Pesa details not configured' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 2. Initialize M-Pesa API
    const mpesaAPI = new MpesaAPI()

    // 3. Initiate STK Push
    const stkPushRequest = {
      BusinessShortCode: landlord.paybill_number,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: landlord.paybill_number,
      PhoneNumber: phoneNumber,
      CallBackURL: Deno.env.get('DARAJA_CALLBACK_URL') || 'https://posthere.io/f613-4b7f-b82b',
      AccountReference: landlord.account_reference,
      TransactionDesc: 'Rent Payment for current month'
    }

    const stkResponse = await mpesaAPI.initiateSTKPush(stkPushRequest)

    console.log('✅ [M-Pesa] STK Push initiated successfully:', stkResponse)

    // 4. Store payment request for tracking
    if (stkResponse.CheckoutRequestID) {
      const { error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          checkout_request_id: stkResponse.CheckoutRequestID,
          merchant_request_id: stkResponse.MerchantRequestID,
          type: 'rent',
          lease_id: leaseId,
          amount: amount,
          phone_number: phoneNumber,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ [M-Pesa] Error storing payment request:', insertError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          checkoutRequestID: stkResponse.CheckoutRequestID,
          merchantRequestID: stkResponse.MerchantRequestID,
          responseCode: stkResponse.ResponseCode,
          responseDescription: stkResponse.ResponseDescription,
          customerMessage: stkResponse.CustomerMessage
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [M-Pesa] Rent payment error:', error)
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
}

async function handleUtilityPayment(req: Request, supabase: any) {
  try {
    const { billId, amount, phoneNumber } = await req.json()

    console.log('⚡ [M-Pesa] Processing utility payment:', { billId, amount, phoneNumber })

    // 1. Get bill details with landlord information
    const { data: bill, error: billError } = await supabase
      .from('unit_bills')
      .select(`
        *,
        units!inner(
          property_id,
          properties!inner(
            landlord_id,
            landlords!inner(
              id,
              paybill_number,
              account_reference
            )
          )
        ),
        utilities(name)
      `)
      .eq('id', billId)
      .single()

    if (billError || !bill) {
      console.error('❌ [M-Pesa] Bill not found:', billError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Bill not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const landlord = bill.units?.properties?.landlords
    if (!landlord?.paybill_number || !landlord?.account_reference) {
      console.error('❌ [M-Pesa] Landlord M-Pesa details not configured')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Landlord M-Pesa details not configured' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 2. Initialize M-Pesa API
    const mpesaAPI = new MpesaAPI()

    // 3. Initiate STK Push
    const stkPushRequest = {
      BusinessShortCode: landlord.paybill_number,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: landlord.paybill_number,
      PhoneNumber: phoneNumber,
      CallBackURL: Deno.env.get('DARAJA_CALLBACK_URL') || 'https://posthere.io/f613-4b7f-b82b',
      AccountReference: landlord.account_reference,
      TransactionDesc: `Utility Payment - ${bill.utilities?.name || 'Utility Bill'}`
    }

    const stkResponse = await mpesaAPI.initiateSTKPush(stkPushRequest)

    console.log('✅ [M-Pesa] STK Push initiated successfully:', stkResponse)

    // 4. Store payment request for tracking
    if (stkResponse.CheckoutRequestID) {
      const { error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          checkout_request_id: stkResponse.CheckoutRequestID,
          merchant_request_id: stkResponse.MerchantRequestID,
          type: 'utility',
          bill_id: billId,
          amount: amount,
          phone_number: phoneNumber,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ [M-Pesa] Error storing payment request:', insertError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          checkoutRequestID: stkResponse.CheckoutRequestID,
          merchantRequestID: stkResponse.MerchantRequestID,
          responseCode: stkResponse.ResponseCode,
          responseDescription: stkResponse.ResponseDescription,
          customerMessage: stkResponse.CustomerMessage
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [M-Pesa] Utility payment error:', error)
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
}

async function handleCallback(req: Request, supabase: any) {
  try {
    const callbackData = await req.json()
    console.log('📞 [M-Pesa] Callback received:', JSON.stringify(callbackData, null, 2))
    
    const stkCallback = callbackData.Body?.stkCallback
    
    if (!stkCallback) {
      console.error('❌ [M-Pesa] Invalid callback data')
      return new Response(
        JSON.stringify({ error: 'Invalid callback data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { 
      MerchantRequestID, 
      CheckoutRequestID, 
      ResultCode, 
      ResultDesc,
      CallbackMetadata 
    } = stkCallback

    console.log('🔍 [M-Pesa] Callback details:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc
    })

    // Update payment request status
    const status = ResultCode === 0 ? 'success' : ResultCode === 1 ? 'cancelled' : 'failed'
    
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: status,
        result_code: ResultCode,
        result_description: ResultDesc,
        updated_at: new Date().toISOString()
      })
      .eq('checkout_request_id', CheckoutRequestID)

    if (updateError) {
      console.error('❌ [M-Pesa] Error updating payment request:', updateError)
    }

    // Check payment result
    if (ResultCode === 0) {
      console.log('✅ [M-Pesa] Payment successful!')
      
      // Get payment request details
      const { data: paymentRequest } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID)
        .single()

      if (paymentRequest) {
        // Handle successful payment based on type
        if (paymentRequest.type === 'rent') {
          await handleSuccessfulRentPayment(paymentRequest, supabase)
        } else if (paymentRequest.type === 'utility') {
          await handleSuccessfulUtilityPayment(paymentRequest, supabase)
        }
      }
    } else {
      console.log(`❌ [M-Pesa] Payment failed: ${ResultDesc}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Callback processed successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [M-Pesa] Callback error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handlePaymentStatus(req: Request, supabase: any) {
  try {
    const url = new URL(req.url)
    const checkoutRequestID = url.pathname.split('/').pop()

    if (!checkoutRequestID) {
      return new Response(
        JSON.stringify({ error: 'Checkout request ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: paymentRequest, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('checkout_request_id', checkoutRequestID)
      .single()

    if (error || !paymentRequest) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Payment request not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: paymentRequest.status,
          resultCode: paymentRequest.result_code,
          resultDesc: paymentRequest.result_description,
          amount: paymentRequest.amount,
          phoneNumber: paymentRequest.phone_number,
          createdAt: paymentRequest.created_at,
          updatedAt: paymentRequest.updated_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [M-Pesa] Payment status error:', error)
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
}

async function handleSuccessfulRentPayment(paymentRequest: any, supabase: any) {
  try {
    console.log('🏠 [M-Pesa] Processing successful rent payment:', paymentRequest.lease_id)
    
    // Update lease payment status
    const { error: leaseError } = await supabase
      .from('leases')
      .update({
        payment_status: 'paid',
        last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.lease_id)

    if (leaseError) {
      console.error('❌ [M-Pesa] Error updating lease:', leaseError)
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        lease_id: paymentRequest.lease_id,
        amount: paymentRequest.amount,
        payment_method: 'mpesa',
        status: 'completed',
        transaction_id: paymentRequest.checkout_request_id,
        phone_number: paymentRequest.phone_number,
        created_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('❌ [M-Pesa] Error creating payment record:', paymentError)
    }

    console.log('✅ [M-Pesa] Rent payment processed successfully')
  } catch (error) {
    console.error('❌ [M-Pesa] Error processing successful rent payment:', error)
  }
}

async function handleSuccessfulUtilityPayment(paymentRequest: any, supabase: any) {
  try {
    console.log('⚡ [M-Pesa] Processing successful utility payment:', paymentRequest.bill_id)
    
    // Update utility bill payment status
    const { error: billError } = await supabase
      .from('unit_bills')
      .update({
        status: 'paid',
        paystack_reference: paymentRequest.checkout_request_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.bill_id)

    if (billError) {
      console.error('❌ [M-Pesa] Error updating utility bill:', billError)
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        bill_id: paymentRequest.bill_id,
        amount: paymentRequest.amount,
        payment_method: 'mpesa',
        status: 'completed',
        transaction_id: paymentRequest.checkout_request_id,
        phone_number: paymentRequest.phone_number,
        created_at: new Date().toISOString()
      })

    if (paymentError) {
      console.error('❌ [M-Pesa] Error creating payment record:', paymentError)
    }

    console.log('✅ [M-Pesa] Utility payment processed successfully')
  } catch (error) {
    console.error('❌ [M-Pesa] Error processing successful utility payment:', error)
  }
}
