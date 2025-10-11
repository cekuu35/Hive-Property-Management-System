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
    console.log('🚀 [initializeTransaction] Starting rent payment initialization...');
    
    const { 
      tenantId, 
      propertyId, 
      amount, 
      email, 
      callbackUrl 
    } = req.body;

    // Validate required fields
    if (!tenantId || !propertyId || !amount || !email) {
      console.error('❌ [initializeTransaction] Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: tenantId, propertyId, amount, email' 
      });
    }

    console.log('📋 [initializeTransaction] Payment details:', {
      tenantId,
      propertyId,
      amount,
      email
    });

    // 1. Get property and landlord information
    console.log('🔍 [initializeTransaction] Fetching property and landlord info...');
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        landlord_id,
        landlords!inner(
          id,
          name,
          subaccount_code
        )
      `)
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      console.error('❌ [initializeTransaction] Error fetching property:', propertyError);
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!property.landlords) {
      console.error('❌ [initializeTransaction] No landlord found for property');
      return res.status(404).json({ error: 'Landlord not found for this property' });
    }

    console.log('✅ [initializeTransaction] Found property and landlord:', {
      propertyName: property.name,
      landlordName: property.landlords.name,
      subaccountCode: property.landlords.subaccount_code
    });

    // 2. Get tenant information
    console.log('🔍 [initializeTransaction] Fetching tenant info...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_info')
      .select('id, first_name, last_name, email')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('❌ [initializeTransaction] Error fetching tenant:', tenantError);
      return res.status(404).json({ error: 'Tenant not found' });
    }

    console.log('✅ [initializeTransaction] Found tenant:', {
      name: `${tenant.first_name} ${tenant.last_name}`,
      email: tenant.email
    });

    // 3. Generate unique reference
    const reference = `rent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const amountInKobo = Math.round(amount * 100); // Convert to kobo

    console.log('💰 [initializeTransaction] Payment details:', {
      reference,
      amountInKobo,
      originalAmount: amount
    });

    // 4. Initialize Paystack transaction
    console.log('🔄 [initializeTransaction] Initializing Paystack transaction...');
    const paystackData = {
      email: email,
      amount: amountInKobo,
      reference: reference,
      currency: 'NGN',
      subaccount: property.landlords.subaccount_code,
      metadata: {
        tenant_id: tenantId,
        landlord_id: property.landlords.id,
        property_id: propertyId,
        payment_type: 'rent',
        tenant_name: `${tenant.first_name} ${tenant.last_name}`,
        property_name: property.name,
        landlord_name: property.landlords.name
      },
      callback_url: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
    };

    console.log('📤 [initializeTransaction] Paystack request data:', paystackData);

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paystackData)
    });

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('❌ [initializeTransaction] Paystack error:', paystackResult);
      return res.status(400).json({ 
        error: 'Paystack initialization failed', 
        details: paystackResult.message 
      });
    }

    console.log('✅ [initializeTransaction] Paystack transaction initialized:', {
      reference: paystackResult.data.reference,
      authorizationUrl: paystackResult.data.authorization_url
    });

    // 5. Log the payment in our database
    console.log('💾 [initializeTransaction] Logging payment in database...');
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: tenantId,
        landlord_id: property.landlords.id,
        property_id: propertyId,
        amount: amount,
        reference: reference,
        status: 'pending',
        payment_method: 'paystack',
        subaccount_code: property.landlords.subaccount_code,
        paystack_response: paystackResult.data
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ [initializeTransaction] Error logging payment:', paymentError);
      // Don't fail the request, just log the error
    } else {
      console.log('✅ [initializeTransaction] Payment logged successfully:', paymentRecord.id);
    }

    // 6. Return success response
    const response = {
      success: true,
      reference: paystackResult.data.reference,
      authorizationUrl: paystackResult.data.authorization_url,
      accessCode: paystackResult.data.access_code,
      paymentId: paymentRecord?.id,
      message: 'Transaction initialized successfully'
    };

    console.log('🎉 [initializeTransaction] Payment initialization completed successfully');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ [initializeTransaction] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
