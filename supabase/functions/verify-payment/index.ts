import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  reference: string;
  type?: 'rent' | 'utility';
  leaseId?: string;
  amount?: number;
  dueDate?: string;
  bill_id?: string;
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

    console.log('Authentication check:', {
      hasUser: !!user,
      userError: userError?.message,
      authHeader: req.headers.get('Authorization')?.substring(0, 20) + '...'
    });

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: userError?.message || 'No user found',
          authHeader: req.headers.get('Authorization')?.substring(0, 20) + '...'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const { reference, type, leaseId, amount, dueDate, bill_id }: VerifyPaymentRequest = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Payment reference is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Verifying payment with Paystack:', reference, 'type:', type);

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

    const paidAmount = verifyData.data.amount / 100;

    // Handle utility bill payment
    if (type === 'utility' && bill_id) {
      console.log('Processing utility bill payment:', bill_id);

      // For utility bills, we can process without strict user authentication
      // since the payment is already verified by Paystack
      try {
        // Get bill details
        const { data: bill, error: billError } = await supabaseAdmin
          .from('unit_bills')
          .select(`
            id,
            amount,
            status,
            utilities!unit_bills_utility_id_fkey (name),
            units!unit_bills_unit_id_fkey (
              unit_number,
              properties!units_property_id_fkey (name)
            )
          `)
          .eq('id', bill_id)
          .single();

        if (billError || !bill) {
          console.error('Bill not found:', billError);
          return new Response(
            JSON.stringify({ success: false, error: 'Utility bill not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already paid
        if (bill.status === 'paid') {
          console.log('Bill already marked as paid');
          return new Response(
            JSON.stringify({
              success: true,
              already_paid: true,
              bill: {
                amount: bill.amount,
                utility_name: bill.utilities?.name,
                unit_info: `${bill.units?.properties?.name} - Unit ${bill.units?.unit_number}`
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update bill status to paid
        const { error: updateError } = await supabaseAdmin
          .from('unit_bills')
          .update({
            status: 'paid',
            paystack_reference: reference,
            updated_at: new Date().toISOString()
          })
          .eq('id', bill_id);

        if (updateError) {
          console.error('Failed to update bill:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to update bill status' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Bill updated successfully:', bill_id);

        return new Response(
          JSON.stringify({
            success: true,
            bill: {
              amount: bill.amount,
              utility_name: bill.utilities?.name,
              unit_info: `${bill.units?.properties?.name} - Unit ${bill.units?.unit_number}`
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error processing utility bill:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to process utility bill payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle rent payment (existing logic)
    if (!leaseId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields for rent payment' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verify amount matches (convert from kobo to main currency)
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

    // Check if payment already recorded using admin client
    const { data: existingPayment } = await supabaseAdmin
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

    // Get lease details to find tenant_info using admin client
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from('leases')
      .select('tenant_info_id')
      .eq('id', leaseId)
      .single();

    if (leaseError) {
      console.error('Error fetching lease:', leaseError);
    }

    // Record the payment in the database using admin client
    const { data: payment, error: paymentError } = await supabaseAdmin
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

    // Update tenant_info to reflect payment using admin client
    if (lease?.tenant_info_id) {
      // First, get current balance to deduct paid amount
      const { data: currentTenant, error: fetchError } = await supabaseAdmin
        .from('tenant_info')
        .select('current_balance')
        .eq('id', lease.tenant_info_id)
        .single();

      if (fetchError) {
        console.error('Error fetching current balance:', fetchError);
      } else {
        const currentBalance = currentTenant?.current_balance || 0;
        const newBalance = Math.max(0, currentBalance - amount);
        
        console.log('💰 [verify-payment] Balance calculation:', {
          currentBalance,
          amountPaid: amount,
          newBalance
        });

        const { error: tenantUpdateError } = await supabaseAdmin
          .from('tenant_info')
          .update({
            current_balance: newBalance,
            payment_status: newBalance > 0 ? 'unpaid' : 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', lease.tenant_info_id);

        if (tenantUpdateError) {
          console.error('Error updating tenant_info:', tenantUpdateError);
          // Don't fail the entire request if this update fails
        } else {
          console.log(`Tenant balance updated: ${currentBalance} → ${newBalance}`);
        }
      }
    }

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
