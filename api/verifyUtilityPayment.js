import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_9f2c94cce8c01d4403373ce6f4bf8f1a7d142668";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'Missing payment reference' });
  }

  try {
    console.log('🔍 Verifying utility bill payment...');
    console.log('Reference:', reference);

    // 1. Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack verification failed:', paystackData);
      // Update payment status to failed in our DB
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed', paystack_response: paystackData })
        .eq('reference', reference);
      return res.status(500).json({ error: paystackData.message || 'Failed to verify Paystack transaction' });
    }

    const transactionStatus = paystackData.data.status; // 'success', 'failed', 'abandoned'
    const amountPaid = paystackData.data.amount / 100; // Convert kobo back to KES
    const metadata = paystackData.data.metadata;
    const billId = metadata?.bill_id;
    const landlordId = metadata?.landlord_id;
    const propertyId = metadata?.property_id;

    console.log('Transaction status:', transactionStatus);
    console.log('Amount paid:', amountPaid);
    console.log('Bill ID:', billId);

    // 2. Update payment record in our database
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: transactionStatus,
        paystack_response: paystackData,
        amount: amountPaid,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment record:', updateError);
      return res.status(500).json({ error: 'Failed to update payment record' });
    }

    // 3. Update utility bill status if payment was successful
    if (transactionStatus === 'success' && billId) {
      console.log('Updating utility bill status...');
      
      const { error: billUpdateError } = await supabaseAdmin
        .from('unit_bills')
        .update({
          status: 'paid',
          paystack_reference: reference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId);

      if (billUpdateError) {
        console.error('Error updating utility bill:', billUpdateError);
        // Log this, but don't fail the payment verification
      } else {
        console.log('✅ Utility bill updated successfully');
      }
    }

    // 4. Get bill details for response
    let billDetails = null;
    if (billId) {
      const { data: bill, error: billError } = await supabaseAdmin
        .from('unit_bills')
        .select(`
          id,
          amount,
          utilities!unit_bills_utility_id_fkey (name),
          units!unit_bills_unit_id_fkey (
            unit_number,
            properties!units_property_id_fkey (name)
          )
        `)
        .eq('id', billId)
        .single();

      if (!billError && bill) {
        billDetails = {
          id: bill.id,
          amount: bill.amount,
          utility_name: bill.utilities?.name,
          unit_number: bill.units?.unit_number,
          property_name: bill.units?.properties?.name,
        };
      }
    }

    console.log('✅ Utility bill payment verification completed');

    return res.status(200).json({
      success: true,
      status: transactionStatus,
      message: 'Utility bill payment verified and records updated',
      payment: updatedPayment,
      bill: billDetails,
    });

  } catch (error) {
    console.error('Server error during utility bill payment verification:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
