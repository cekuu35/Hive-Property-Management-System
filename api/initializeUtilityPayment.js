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

  const { billId, amount, email, callbackUrl } = req.body;

  if (!billId || !amount || !email || !callbackUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log('🔧 Initializing utility bill payment with subaccount...');
    console.log('Bill ID:', billId);
    console.log('Amount:', amount);
    console.log('Email:', email);

    // 1. Fetch bill details to get unit and landlord information
    const { data: bill, error: billError } = await supabaseAdmin
      .from('unit_bills')
      .select(`
        id,
        amount,
        unit_id,
        landlord_id,
        utilities!unit_bills_utility_id_fkey (name),
        units!unit_bills_unit_id_fkey (
          id,
          unit_number,
          properties!units_property_id_fkey (
            id,
            name,
            landlord_id
          )
        )
      `)
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      console.error('Error fetching bill:', billError);
      return res.status(404).json({ error: 'Bill not found' });
    }

    console.log('Bill details:', bill);

    // 2. Get the landlord_id from the property
    const landlordId = bill.units?.properties?.landlord_id;
    if (!landlordId) {
      console.error('No landlord_id found for property');
      return res.status(404).json({ error: 'Property not found or landlord not assigned' });
    }

    // 3. Fetch subaccount_code from landlords table
    const { data: landlord, error: landlordError } = await supabaseAdmin
      .from('landlords')
      .select('subaccount_code')
      .eq('id', landlordId)
      .single();

    if (landlordError || !landlord || !landlord.subaccount_code) {
      console.error('Error fetching landlord or subaccount_code:', landlordError);
      return res.status(404).json({ error: 'Landlord not found or subaccount not configured' });
    }

    const subaccount_code = landlord.subaccount_code;
    const amountInKobo = Math.round(amount * 100);
    const reference = `utility_${Date.now()}_${billId}`;

    console.log('Using subaccount:', subaccount_code);
    console.log('Amount in kobo:', amountInKobo);
    console.log('Reference:', reference);

    // 4. Initialize Paystack transaction with subaccount
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        reference,
        callback_url: callbackUrl,
        subaccount: subaccount_code, // This ensures 100% goes to subaccount
        metadata: {
          bill_id: billId,
          landlord_id: landlordId,
          property_id: bill.units?.properties?.id,
          unit_id: bill.unit_id,
          utility_name: bill.utilities?.name,
          type: 'utility_bill',
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      return res.status(500).json({ error: paystackData.message || 'Failed to initialize Paystack transaction' });
    }

    // 5. Log the pending transaction in the payments table
    await supabaseAdmin.from('payments').insert({
      tenant_id: null, // Will be updated after payment
      landlord_id: landlordId,
      property_id: bill.units?.properties?.id,
      lease_id: null, // Utility bills don't have lease_id
      amount: amount,
      reference: reference,
      status: 'pending',
      payment_method: 'card',
      subaccount_code: subaccount_code,
      paystack_response: paystackData,
    });

    console.log('✅ Utility bill payment initialized successfully with subaccount');

    return res.status(200).json({
      success: true,
      message: 'Utility bill payment initialized with subaccount',
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      subaccount: subaccount_code,
    });

  } catch (error) {
    console.error('Server error during utility bill payment initialization:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
