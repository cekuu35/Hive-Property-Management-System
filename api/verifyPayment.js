import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 [verifyPayment] Starting payment verification...');
    
    const { reference } = req.body;

    if (!reference) {
      console.error('❌ [verifyPayment] Missing reference');
      return res.status(400).json({ error: 'Payment reference is required' });
    }

    console.log('📋 [verifyPayment] Verifying payment with reference:', reference);

    // 1. Verify payment with Paystack
    console.log('🔄 [verifyPayment] Verifying with Paystack...');
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('❌ [verifyPayment] Paystack verification failed:', paystackResult);
      return res.status(400).json({ 
        error: 'Payment verification failed', 
        details: paystackResult.message 
      });
    }

    console.log('✅ [verifyPayment] Paystack verification successful:', {
      status: paystackResult.data.status,
      amount: paystackResult.data.amount,
      currency: paystackResult.data.currency
    });

    // 2. Get payment record from database
    console.log('🔍 [verifyPayment] Fetching payment record from database...');
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        tenant_info!inner(
          id,
          first_name,
          last_name,
          current_balance,
          payment_status
        ),
        landlords!inner(
          id,
          name,
          subaccount_code
        ),
        properties!inner(
          id,
          name
        )
      `)
      .eq('reference', reference)
      .single();

    if (paymentError) {
      console.error('❌ [verifyPayment] Error fetching payment record:', paymentError);
      return res.status(404).json({ error: 'Payment record not found' });
    }

    console.log('✅ [verifyPayment] Found payment record:', {
      id: paymentRecord.id,
      tenant: `${paymentRecord.tenant_info.first_name} ${paymentRecord.tenant_info.last_name}`,
      landlord: paymentRecord.landlords.name,
      property: paymentRecord.properties.name,
      amount: paymentRecord.amount
    });

    // 3. Check if payment is successful
    const isSuccessful = paystackResult.data.status === 'success';
    const newStatus = isSuccessful ? 'success' : 'failed';

    console.log('💰 [verifyPayment] Payment status:', {
      paystackStatus: paystackResult.data.status,
      isSuccessful,
      newStatus
    });

    // 4. Update payment record
    console.log('🔄 [verifyPayment] Updating payment record...');
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        paystack_response: paystackResult.data,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('❌ [verifyPayment] Error updating payment record:', updateError);
      return res.status(500).json({ error: 'Failed to update payment record' });
    }

    console.log('✅ [verifyPayment] Payment record updated successfully');

    // 5. If payment is successful, update tenant balance
    if (isSuccessful) {
      console.log('🔄 [verifyPayment] Payment successful - updating tenant balance...');
      
      const { error: balanceError } = await supabase
        .from('tenant_info')
        .update({
          current_balance: 0,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.tenant_id);

      if (balanceError) {
        console.error('❌ [verifyPayment] Error updating tenant balance:', balanceError);
        return res.status(500).json({ error: 'Failed to update tenant balance' });
      }

      console.log('✅ [verifyPayment] Tenant balance updated successfully');

      // 6. Create rent payment record if lease exists
      if (paymentRecord.lease_id) {
        console.log('🔄 [verifyPayment] Creating rent payment record...');
        
        const { error: rentPaymentError } = await supabase
          .from('rent_payments')
          .insert({
            lease_id: paymentRecord.lease_id,
            amount: paymentRecord.amount,
            due_date: new Date().toISOString().split('T')[0],
            paid_date: new Date().toISOString(),
            status: 'paid',
            payment_method: 'card',
            transaction_reference: reference,
            notes: `Payment processed via Paystack (Landlord: ${paymentRecord.landlords.name})`
          });

        if (rentPaymentError) {
          console.error('❌ [verifyPayment] Error creating rent payment record:', rentPaymentError);
          // Don't fail the request, just log the error
        } else {
          console.log('✅ [verifyPayment] Rent payment record created successfully');
        }
      }

      // 7. Send real-time notification
      console.log('🔄 [verifyPayment] Sending real-time notification...');
      const { error: notifyError } = await supabase
        .channel('payment_updates')
        .send({
          type: 'broadcast',
          event: 'payment_completed',
          payload: {
            tenantId: paymentRecord.tenant_id,
            landlordId: paymentRecord.landlord_id,
            propertyId: paymentRecord.property_id,
            paymentId: paymentRecord.id,
            reference: reference,
            amount: paymentRecord.amount,
            status: newStatus,
            balanceUpdated: true,
            timestamp: new Date().toISOString()
          }
        });

      if (notifyError) {
        console.error('❌ [verifyPayment] Error sending notification:', notifyError);
      } else {
        console.log('✅ [verifyPayment] Real-time notification sent');
      }
    }

    // 8. Return success response
    const response = {
      success: true,
      reference: reference,
      status: newStatus,
      amount: paymentRecord.amount,
      tenant: {
        id: paymentRecord.tenant_info.id,
        name: `${paymentRecord.tenant_info.first_name} ${paymentRecord.tenant_info.last_name}`
      },
      landlord: {
        id: paymentRecord.landlords.id,
        name: paymentRecord.landlords.name
      },
      property: {
        id: paymentRecord.properties.id,
        name: paymentRecord.properties.name
      },
      balanceUpdated: isSuccessful,
      message: isSuccessful ? 'Payment verified and processed successfully' : 'Payment verification completed'
    };

    console.log('🎉 [verifyPayment] Payment verification completed successfully');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ [verifyPayment] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
