import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.SUPABASE_URL || "https://kozhlejudselgtmohdfm.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g";
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_ad42ab79c7915c9cdbcc6328e606a1f84d6b0f81";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    console.log('Paystack Secret Key (first 20 chars):', paystackSecretKey.substring(0, 20) + '...');

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
      console.log('Landlord data:', landlord);
      
      // For testing purposes, continue without subaccount if not found
      console.warn('⚠️ No subaccount found, proceeding without subaccount for testing');
    }

    const subaccount_code = landlord?.subaccount_code;
    const amountInKobo = Math.round(amount * 100);
    const reference = `utility_${Date.now()}_${billId}`;

    console.log('Using subaccount:', subaccount_code || 'none');
    console.log('Amount in kobo:', amountInKobo);
    console.log('Reference:', reference);

    // 4. Initialize Paystack transaction with or without subaccount
    const paystackRequestData = {
      email,
      amount: amountInKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        bill_id: billId,
        landlord_id: landlordId,
        property_id: bill.units?.properties?.id,
        unit_id: bill.unit_id,
        utility_name: bill.utilities?.name,
        type: 'utility_bill',
      },
    };

    // Only add subaccount if it exists
    if (subaccount_code) {
      paystackRequestData.subaccount = subaccount_code;
    }

    console.log('Paystack request data:', paystackRequestData);

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackRequestData),
    });

    const paystackData = await paystackResponse.json();

    console.log('Paystack response status:', paystackResponse.status);
    console.log('Paystack response data:', paystackData);

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialization failed:', {
        status: paystackResponse.status,
        statusText: paystackResponse.statusText,
        data: paystackData
      });
      return res.status(500).json({ 
        error: paystackData.message || 'Failed to initialize Paystack transaction',
        details: paystackData,
        status: paystackResponse.status
      });
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
      subaccount_code: subaccount_code || null,
      paystack_response: paystackData,
    });

    console.log('✅ Utility bill payment initialized successfully');

    return res.status(200).json({
      success: true,
      message: subaccount_code ? 'Utility bill payment initialized with subaccount' : 'Utility bill payment initialized',
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      accessCode: paystackData.data.access_code,
      subaccount: subaccount_code || null,
    });

  } catch (error) {
    console.error('Server error during utility bill payment initialization:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
