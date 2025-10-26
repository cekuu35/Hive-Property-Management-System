import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DarajaConfig {
  accessToken: string | null;
  tokenExpiry: number;
  baseURL: string;
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackURL: string;
}

class DarajaAPI {
  private config: DarajaConfig;

  constructor() {
    const env = Deno.env.get('DARAJA_ENV') || 'production';
    
    this.config = {
      accessToken: null,
      tokenExpiry: 0,
      baseURL: env === 'sandbox' 
        ? 'https://sandbox.safaricom.co.ke' 
        : 'https://api.safaricom.co.ke',
      consumerKey: Deno.env.get('DARAJA_CONSUMER_KEY') || '',
      consumerSecret: Deno.env.get('DARAJA_CONSUMER_SECRET') || '',
      businessShortCode: Deno.env.get('DARAJA_BUSINESS_SHORTCODE') || '',
      passkey: Deno.env.get('DARAJA_PASSKEY') || '',
      callbackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/subscription-payment-daraja/callback`
    };

    console.log('🚀 [Daraja] Initialized with:', {
      baseURL: this.config.baseURL,
      businessShortCode: this.config.businessShortCode,
      callbackURL: this.config.callbackURL
    });
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.config.accessToken && Date.now() < this.config.tokenExpiry) {
      return this.config.accessToken;
    }

    try {
      console.log('🔑 [Daraja] Getting access token...');
      
      const auth = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`);
      
      const response = await fetch(`${this.config.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      this.config.accessToken = data.access_token;
      this.config.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('✅ [Daraja] Access token obtained');
      return this.config.accessToken;
    } catch (error) {
      console.error('❌ [Daraja] Error getting access token:', error);
      throw error;
    }
  }

  generatePassword(timestamp: string): string {
    const passwordString = `${this.config.businessShortCode}${this.config.passkey}${timestamp}`;
    
    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(passwordString);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...data));
    return base64;
  }

  generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  async initiateSTKPush(phoneNumber: string, amount: number, accountReference: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      
      console.log('📱 [Daraja] Initiating STK Push...', { 
        phoneNumber, 
        amount, 
        accountReference,
        timestamp 
      });

      const stkPushData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: phoneNumber,
        PartyB: this.config.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.config.callbackURL,
        AccountReference: accountReference,
        TransactionDesc: 'Subscription Payment'
      };

      console.log('📤 [Daraja] Request payload:', {
        BusinessShortCode: stkPushData.BusinessShortCode,
        Amount: stkPushData.Amount,
        PhoneNumber: stkPushData.PhoneNumber,
        AccountReference: stkPushData.AccountReference
      });

      const response = await fetch(`${this.config.baseURL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(stkPushData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Daraja] STK Push failed:', errorText);
        throw new Error(`STK Push failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [Daraja] STK Push initiated successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ [Daraja] Error in initiateSTKPush:', error);
      throw error;
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Handle callback from Daraja
    if (path.includes('/callback')) {
      const callbackData = await req.json();
      console.log('📥 [Daraja] Callback received:', JSON.stringify(callbackData, null, 2));

      const { Body: { stkCallback } } = callbackData;
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      // Update subscription payment record
      const { error: updateError } = await supabaseClient
        .from('subscription_payments')
        .update({
          status: ResultCode === 0 ? 'paid' : 'failed',
          transaction_reference: MerchantRequestID,
          result_description: ResultDesc,
          paid_at: ResultCode === 0 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_reference', CheckoutRequestID);

      if (updateError) {
        console.error('❌ [Daraja] Error updating payment:', updateError);
      }

      // If payment successful, update subscription status
      if (ResultCode === 0 && CallbackMetadata) {
        const metadata = CallbackMetadata.Item;
        const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
        
        console.log('✅ [Daraja] Payment successful!', { 
          MerchantRequestID, 
          mpesaReceiptNumber 
        });

        // Get the subscription payment to find landlord
        const { data: payment } = await supabaseClient
          .from('subscription_payments')
          .select('landlord_id, plan_id, period_start, period_end')
          .eq('transaction_reference', CheckoutRequestID)
          .single();

        if (payment) {
          // Update landlord_subscriptions to active
          await supabaseClient
            .from('landlord_subscriptions')
            .update({
              status: 'active',
              current_period_start: payment.period_start,
              current_period_end: payment.period_end,
              updated_at: new Date().toISOString()
            })
            .eq('landlord_id', payment.landlord_id)
            .eq('plan_id', payment.plan_id);

          console.log('✅ [Daraja] Subscription activated');
        }
      }

      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Success' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle STK Push initiation
    const { planId, phoneNumber, landlordId } = await req.json();

    console.log('📝 [Daraja] Processing subscription payment request:', {
      planId,
      phoneNumber,
      landlordId
    });

    // Validate inputs
    if (!planId || !phoneNumber || !landlordId) {
      throw new Error('Missing required fields: planId, phoneNumber, or landlordId');
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    console.log('📋 [Daraja] Plan details:', {
      name: plan.name,
      price: plan.price,
      display_name: plan.display_name
    });

    // Calculate period (1 month from now)
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabaseClient
      .from('subscription_payments')
      .insert({
        landlord_id: landlordId,
        plan_id: planId,
        amount: plan.price,
        status: 'pending',
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        payment_method: 'mpesa_daraja'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ [Daraja] Error creating payment record:', paymentError);
      throw paymentError;
    }

    console.log('✅ [Daraja] Payment record created:', paymentRecord.id);

    // Initiate STK Push
    const mpesa = new DarajaAPI();
    const accountReference = `SUB-${paymentRecord.id}`;
    
    const stkResult = await mpesa.initiateSTKPush(
      formattedPhone,
      plan.price,
      accountReference
    );

    // Update payment record with CheckoutRequestID
    await supabaseClient
      .from('subscription_payments')
      .update({
        transaction_reference: stkResult.CheckoutRequestID
      })
      .eq('id', paymentRecord.id);

    console.log('✅ [Daraja] STK Push sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent to your phone',
        data: {
          CheckoutRequestID: stkResult.CheckoutRequestID,
          MerchantRequestID: stkResult.MerchantRequestID,
          ResponseCode: stkResult.ResponseCode,
          ResponseDescription: stkResult.ResponseDescription,
          CustomerMessage: stkResult.CustomerMessage
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ [Daraja] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred processing your payment' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

