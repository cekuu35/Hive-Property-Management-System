import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting KCB Buni M-Pesa STK Push request');

    const { phoneNumber, amount, accountReference } = await req.json();
    
    console.log('📋 Request details:', { phoneNumber, amount, accountReference });

    // Get KCB Buni credentials from environment
    const clientId = Deno.env.get('MPESA_CONSUMER_KEY');
    const clientSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('KCB Buni credentials not configured');
    }

    // Step 1: Get OAuth access token
    console.log('🔑 Getting KCB Buni OAuth token...');
    
    const authString = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://accounts.buni.kcbgroup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ OAuth failed:', tokenResponse.status, errorText);
      throw new Error(`OAuth failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Access token obtained successfully');

    // Step 2: Initiate STK Push
    console.log('📱 Initiating STK Push...');
    
    // Generate unique message ID
    const messageId = `${Date.now()}_KCBOrg_${Math.floor(Math.random() * 10000000000)}`;
    
    const stkPushRequest = {
      phoneNumber: phoneNumber.replace(/^\+/, ''), // Remove + prefix if present
      amount: amount.toString(),
      invoiceNumber: accountReference,
      sharedShortCode: true,
      orgShortCode: "",
      orgPassKey: "",
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      transactionDescription: 'Rent Payment'
    };

    console.log('📤 STK Push request:', stkPushRequest);

    const stkResponse = await fetch('https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'routeCode': '207',
        'operation': 'STKPush',
        'messageId': messageId
      },
      body: JSON.stringify(stkPushRequest)
    });

    const responseText = await stkResponse.text();
    console.log(`📥 STK Push response status: ${stkResponse.status}`);
    console.log(`📥 STK Push response body: ${responseText}`);

    if (!stkResponse.ok) {
      throw new Error(`STK Push failed: ${stkResponse.status} - ${responseText}`);
    }

    const stkData = JSON.parse(responseText);
    console.log('✅ STK Push initiated successfully:', stkData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the payment attempt
    const { error: logError } = await supabase
      .from('payments')
      .insert({
        reference: stkData.checkoutRequestID || messageId,
        amount: parseFloat(amount),
        status: 'pending',
        payment_method: 'mpesa',
        paystack_response: stkData
      });

    if (logError) {
      console.error('⚠️ Failed to log payment:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push initiated successfully',
        data: stkData,
        checkoutRequestID: stkData.checkoutRequestID || messageId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in mpesa-stk-push function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
