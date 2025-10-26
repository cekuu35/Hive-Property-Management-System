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
      stkPushURL: 'https://api.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush',  // ✅ CHANGED TO PRODUCTION (removed 'uat.')
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
      
      console.log('📱 [KCB Buni M-Pesa] Initiating STK Push...', { phoneNumber, amount, accountReference })

      // KCB Buni format (not Safaricom format)
      const businessShortCode = '174379'
      const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
      
      // Generate unique message ID
      const messageId = `${Date.now()}_KCB_${Math.random().toString(36).substring(7)}`

      const stkPushData = {
        phoneNumber: phoneNumber,
        amount: amount.toString(),
        invoiceNumber: accountReference,
        sharedShortCode: true,
        orgShortCode: businessShortCode,
        orgPassKey: passkey,
        callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-stk-push/callback`,
        transactionDescription: 'Property Management Payment'
      }

      console.log('📤 [KCB Buni] Request payload:', stkPushData)

      const response = await fetch(this.config.stkPushURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.config.apiKey,
          'Access-Control-Allow-Origin': '*',
          'routeCode': '207',
          'operation': 'STKPush',
          'messageId': messageId
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
    if (req.method === 'POST' && !path.includes('/callback') && !path.includes('/payment-status/')) {
      // Handle payment initiation
      const body = await req.json()
      const { type, leaseId, billId } = body
      
      if (type === 'utility' || billId) {
        return await handleUtilityPayment(req, supabase, body)
      } else if (type === 'rent' || leaseId) {
        return await handleRentPayment(req, supabase, body)
      } else {
        // Default behavior for backwards compatibility
        return await handleRentPayment(req, supabase, body)
      }
    } else if (path.includes('/callback') && req.method === 'POST') {
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

async function handleRentPayment(req: Request, supabase: any, bodyData?: any) {
  try {
    const data = bodyData || await req.json()
    const { leaseId, amount, phoneNumber, fullRentAmount, remainingBalance } = data
    
    console.log('🏠 [M-Pesa] Processing rent payment:', { 
      leaseId, 
      paymentAmount: amount, 
      fullRentAmount, 
      remainingBalance,
      phoneNumber 
    })

    // Get lease details with unit relationship
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        rent_amount,
        units!inner(
          id,
          properties!inner(
            id,
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single()

    if (leaseError || !lease) {
      console.error('❌ [M-Pesa] Lease query error:', leaseError)
      throw new Error('Lease not found')
    }

    console.log('✅ [M-Pesa] Lease found:', lease)

    const landlordId = lease.units.properties.landlord_id

    // Verify landlord exists
    const { data: landlord, error: landlordError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', landlordId)
      .single()

    if (landlordError || !landlord) {
      console.error('❌ [M-Pesa] Landlord query error:', landlordError)
      throw new Error('Landlord not found')
    }

    console.log('✅ [M-Pesa] Landlord verified, initiating payment...')

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

async function handleUtilityPayment(req: Request, supabase: any, bodyData?: any) {
  try {
    const data = bodyData || await req.json()
    const { billId, amount, phoneNumber } = data
    
    console.log('⚡ [M-Pesa] Processing utility payment:', { billId, amount, phoneNumber })

    // Get bill details with landlord_id
    const { data: bill, error: billError } = await supabase
      .from('unit_bills')
      .select('id, amount, landlord_id')
      .eq('id', billId)
      .single()

    if (billError || !bill) {
      console.error('❌ [M-Pesa] Bill query error:', billError)
      throw new Error('Utility bill not found')
    }

    console.log('✅ [M-Pesa] Bill found:', bill)

    // Verify landlord exists
    const { data: landlord, error: landlordError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', bill.landlord_id)
      .single()

    if (landlordError || !landlord) {
      console.error('❌ [M-Pesa] Landlord query error:', landlordError)
      throw new Error('Landlord not found')
    }

    console.log('✅ [M-Pesa] Landlord verified, initiating payment...')

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
        status: ResultCode === 0 ? 'success' : 'failed',
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
    console.log('🔄 [M-Pesa] Processing successful payment for:', checkoutRequestId)

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ [M-Pesa] Payment not found for processing:', paymentError)
      // Log to monitoring table
      await logPaymentError(supabase, 'payment_not_found', checkoutRequestId, paymentError)
      return
    }

    console.log('📋 [M-Pesa] Payment details:', { type: payment.type, amount: payment.amount })

    if (payment.type === 'rent') {
      console.log('🏠 [M-Pesa] Processing RENT payment...')

      // UPDATE existing rent_payment record (don't create new one)
      const { data: updatedRent, error: rentError } = await supabase
        .from('rent_payments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
          payment_method: 'mpesa',
          transaction_reference: checkoutRequestId,
          updated_at: new Date().toISOString()
        })
        .eq('lease_id', payment.lease_id)
        .eq('status', 'pending')
        .select()

      if (rentError) {
        console.error('❌ [M-Pesa] Error updating rent payment record:', rentError)
        await logPaymentError(supabase, 'rent_update_failed', checkoutRequestId, rentError)
        throw rentError // Propagate error to trigger retry
      } 
      
      if (!updatedRent || updatedRent.length === 0) {
        console.warn('⚠️ [M-Pesa] No pending rent payment found to update. Checking for overdue...')
        
        // Try updating overdue payments as well
        const { data: overdueUpdate, error: overdueError } = await supabase
          .from('rent_payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: 'mpesa',
            transaction_reference: checkoutRequestId,
            updated_at: new Date().toISOString()
          })
          .eq('lease_id', payment.lease_id)
          .eq('status', 'overdue')
          .select()

        if (overdueError || !overdueUpdate || overdueUpdate.length === 0) {
          console.error('❌ [M-Pesa] No rent payment record found (pending or overdue):', overdueError)
          await logPaymentError(supabase, 'no_rent_record', checkoutRequestId, overdueError)
          throw new Error('No rent payment record found to update')
        } else {
          console.log('✅ [M-Pesa] Overdue rent payment updated:', overdueUpdate)
        }
      } else {
        console.log('✅ [M-Pesa] Rent payment record updated:', updatedRent)
      }

      // Get lease details to find tenant
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('tenant_info_id, tenant_id, rent_amount')
        .eq('id', payment.lease_id)
        .single()

      if (leaseError || !lease) {
        console.error('❌ [M-Pesa] Lease not found:', leaseError)
        await logPaymentError(supabase, 'lease_not_found', checkoutRequestId, leaseError)
        throw leaseError
      }
      
      console.log('📋 [M-Pesa] Lease details:', lease)

      // Determine which tenant ID to use
      const tenantInfoId = lease.tenant_info_id || lease.tenant_id

      if (tenantInfoId) {
        // Get current balance first
        const { data: currentTenant, error: getTenantError } = await supabase
          .from('tenant_info')
          .select('current_balance')
          .eq('id', tenantInfoId)
          .single()

        if (getTenantError) {
          console.error('❌ [M-Pesa] Error fetching tenant info:', getTenantError)
          await logPaymentError(supabase, 'tenant_fetch_failed', checkoutRequestId, getTenantError)
        } else {
          // Calculate new balance (subtract payment amount from current balance)
          const currentBalance = currentTenant?.current_balance || 0
          const newBalance = Math.max(0, currentBalance - payment.amount)
          const isPaidInFull = newBalance === 0

          // Update tenant_info balance
          const { data: updatedBalance, error: balanceError } = await supabase
            .from('tenant_info')
            .update({
              current_balance: newBalance,
              payment_status: isPaidInFull ? 'paid' : 'partial',
              updated_at: new Date().toISOString()
            })
            .eq('id', tenantInfoId)
            .select()

          if (balanceError) {
            console.error('❌ [M-Pesa] Error updating tenant balance:', balanceError)
            await logPaymentError(supabase, 'balance_update_failed', checkoutRequestId, balanceError)
          } else {
            console.log(`✅ [M-Pesa] Tenant balance updated: ${currentBalance} → ${newBalance} (paid: ${isPaidInFull})`, updatedBalance)
          }
        }
      }

      // Send notification to tenant
      if (lease.tenant_id) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert({
            user_id: lease.tenant_id,
            title: 'Rent Payment Successful',
            message: `Your rent payment of KES ${payment.amount.toLocaleString()} has been processed successfully via M-Pesa.`,
            type: 'payment_success',
            read: false,
            data: { 
              lease_id: payment.lease_id, 
              transaction_id: checkoutRequestId,
              amount: payment.amount,
              payment_method: 'mpesa'
            },
            created_at: new Date().toISOString()
          })

        if (notifyError) {
          console.error('❌ [M-Pesa] Error sending notification:', notifyError)
          // Don't throw - notification failure shouldn't fail the payment
        } else {
          console.log('✅ [M-Pesa] Notification sent to tenant')
        }
      }

      console.log('✅ [M-Pesa] Rent payment processed successfully')

    } else if (payment.type === 'utility') {
      console.log('⚡ [M-Pesa] Processing UTILITY payment...')

      // UPDATE utility bill status (don't create new record)
      const { data: updatedBill, error: billError } = await supabase
        .from('unit_bills')
        .update({
          status: 'paid',
          paystack_reference: checkoutRequestId,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.bill_id)
        .select('*, unit:units(id, tenant_id)')

      if (billError) {
        console.error('❌ [M-Pesa] Error updating utility bill:', billError)
        await logPaymentError(supabase, 'utility_update_failed', checkoutRequestId, billError)
        throw billError
      }
      
      if (!updatedBill || updatedBill.length === 0) {
        console.error('❌ [M-Pesa] No utility bill found to update')
        await logPaymentError(supabase, 'no_utility_record', checkoutRequestId, new Error('Bill not found'))
        throw new Error('No utility bill found to update')
      }
      
      console.log('✅ [M-Pesa] Utility bill updated:', updatedBill)

      // Get tenant from bill
      const bill = updatedBill[0]
      const tenantId = bill.unit?.tenant_id || bill.tenant_id

      // Send notification to tenant
      if (tenantId) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert({
            user_id: tenantId,
            title: 'Utility Bill Payment Successful',
            message: `Your utility bill payment of KES ${payment.amount.toLocaleString()} has been processed successfully via M-Pesa.`,
            type: 'payment_success',
            read: false,
            data: { 
              bill_id: payment.bill_id, 
              transaction_id: checkoutRequestId,
              amount: payment.amount,
              payment_method: 'mpesa'
            },
            created_at: new Date().toISOString()
          })

        if (notifyError) {
          console.error('❌ [M-Pesa] Error sending notification:', notifyError)
          // Don't throw - notification failure shouldn't fail the payment
        } else {
          console.log('✅ [M-Pesa] Notification sent to tenant')
        }
      }

      console.log('✅ [M-Pesa] Utility payment processed successfully')
    }
  } catch (error) {
    console.error('❌ [M-Pesa] Error processing successful payment:', error)
    await logPaymentError(supabase, 'processing_failed', checkoutRequestId, error)
    throw error // Re-throw to ensure proper error handling upstream
  }
}

// Helper function to log payment errors for monitoring
async function logPaymentError(supabase: any, errorType: string, checkoutRequestId: string, error: any) {
  try {
    await supabase
      .from('cron_log')
      .insert({
        message: `[M-Pesa Error] ${errorType} - CheckoutID: ${checkoutRequestId} - ${error?.message || JSON.stringify(error)}`,
        created_at: new Date().toISOString()
      })
    console.log(`📝 [M-Pesa] Error logged: ${errorType}`)
  } catch (logError) {
    console.error('❌ [M-Pesa] Failed to log error:', logError)
  }
}