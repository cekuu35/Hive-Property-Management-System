import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  reference: string;
  leaseId: string;
  amount: number;
  dueDate: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const { reference, leaseId, amount, dueDate }: VerifyPaymentRequest = await req.json();

    if (!reference || !leaseId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log('Verifying payment with Paystack:', reference);

    // Verify payment with Paystack
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('Paystack secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();
    console.log('Paystack verification response:', verifyData);

    if (!verifyData.status || verifyData.data.status !== 'success') {
      console.error('Payment verification failed:', verifyData);
      return new Response(
        JSON.stringify({ 
          error: 'Payment verification failed',
          details: verifyData.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verify amount matches (convert from kobo to main currency)
    const paidAmount = verifyData.data.amount / 100;
    if (Math.abs(paidAmount - amount) > 0.01) {
      console.error('Amount mismatch:', { expected: amount, received: paidAmount });
      return new Response(
        JSON.stringify({ error: 'Payment amount mismatch' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check if payment already recorded
    const { data: existingPayment } = await supabaseClient
      .from('rent_payments')
      .select('id')
      .eq('transaction_reference', reference)
      .maybeSingle();

    if (existingPayment) {
      console.log('Payment already recorded:', reference);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already recorded',
          paymentId: existingPayment.id 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Record the payment in the database
    const { data: payment, error: paymentError } = await supabaseClient
      .from('rent_payments')
      .insert({
        lease_id: leaseId,
        amount: amount,
        payment_method: 'paystack',
        transaction_reference: reference,
        status: 'paid',
        paid_date: new Date().toISOString(),
        due_date: dueDate,
        notes: `Paystack payment verified - Transaction ID: ${verifyData.data.id}`
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to record payment',
          details: paymentError.message 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('Payment recorded successfully:', payment.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified and recorded',
        payment,
        paystackData: {
          amount: paidAmount,
          currency: verifyData.data.currency,
          channel: verifyData.data.channel,
          paidAt: verifyData.data.paid_at
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in verify-payment function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
