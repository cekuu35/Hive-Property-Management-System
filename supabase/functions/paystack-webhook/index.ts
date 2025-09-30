import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500 }
      );
    }

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    if (!signature) {
      console.error('Missing webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401 }
      );
    }

    // Compute expected signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    console.log('Webhook event received:', event.event);

    // Initialize Supabase client with service role for webhook operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event.event) {
      case 'charge.success': {
        const { reference, amount, customer, paid_at, channel } = event.data;
        console.log('Processing successful charge:', reference);

        // Check if payment already recorded
        const { data: existingPayment } = await supabaseClient
          .from('rent_payments')
          .select('id')
          .eq('transaction_reference', reference)
          .maybeSingle();

        if (existingPayment) {
          console.log('Payment already recorded:', reference);
          return new Response(
            JSON.stringify({ message: 'Payment already recorded' }),
            { status: 200 }
          );
        }

        // Extract metadata to find lease
        const metadata = event.data.metadata || {};
        const customFields = metadata.custom_fields || [];
        
        // Try to find lease_id from metadata
        let leaseId = null;
        for (const field of customFields) {
          if (field.variable_name === 'lease_id' && field.value) {
            leaseId = field.value;
            break;
          }
        }

        if (!leaseId) {
          console.error('No lease_id in webhook metadata');
          return new Response(
            JSON.stringify({ error: 'Missing lease information' }),
            { status: 400 }
          );
        }

        // Record the payment
        const { data: payment, error: paymentError } = await supabaseClient
          .from('rent_payments')
          .insert({
            lease_id: leaseId,
            amount: amount / 100, // Convert from kobo
            payment_method: 'paystack',
            transaction_reference: reference,
            status: 'paid',
            paid_date: paid_at,
            notes: `Paystack webhook - Channel: ${channel}, Customer: ${customer.email}`
          })
          .select()
          .single();

        if (paymentError) {
          console.error('Error recording payment from webhook:', paymentError);
          return new Response(
            JSON.stringify({ error: 'Failed to record payment' }),
            { status: 500 }
          );
        }

        console.log('Payment recorded from webhook:', payment.id);
        break;
      }

      case 'charge.failed': {
        console.log('Payment failed:', event.data.reference);
        // You could record failed attempts if needed
        break;
      }

      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in paystack-webhook function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500 }
    );
  }
});
