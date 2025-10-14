import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// M-Pesa API will be implemented directly in server.js for now

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase configuration
const supabaseUrl = 'https://kozhlejudselgtmohdfm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Payment tracking store (in production, use Redis or database)
const paymentRequests = new Map();

// M-Pesa API Helper Functions
class MpesaAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = process.env.DARAJA_ENV === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke' 
      : 'https://api.safaricom.co.ke';
  }

  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const consumerKey = process.env.DARAJA_CONSUMER_KEY;
      const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa credentials not configured');
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry
      
      console.log('✅ M-Pesa access token obtained');
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ Error getting M-Pesa access token:', error);
      throw error;
    }
  }

  generatePassword(shortcode, passkey, timestamp) {
    const passwordString = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
  }

  async initiateSTKPush(request) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const passkey = process.env.DARAJA_PASSKEY;
      
      if (!passkey) {
        throw new Error('M-Pesa passkey not configured');
      }

      const password = this.generatePassword(request.BusinessShortCode, passkey, timestamp);

      const stkPushRequest = {
        ...request,
        Password: password,
        Timestamp: timestamp,
      };

      console.log('🚀 Initiating M-Pesa STK Push:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference,
      });

      const response = await fetch(`${this.baseURL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STK Push failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log('✅ M-Pesa STK Push initiated:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error initiating STK Push:', error);
      throw error;
    }
  }
}

const mpesaAPI = new MpesaAPI();

// Paystack configuration
const paystackSecretKey = 'sk_test_ad42ab79c7915c9cdbcc6328e606a1f84d6b0f81';

// Initialize Utility Payment API
app.post('/api/initializeUtilityPayment', async (req, res) => {
  try {
    console.log('🚀 [API] Initializing utility payment...');
    const { billId, amount, email, callbackUrl } = req.body;

    if (!billId || !amount || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: billId, amount, email' 
      });
    }

    // 1. Get the utility bill details
    const { data: bill, error: billError } = await supabase
      .from('unit_bills')
      .select(`
        id,
        amount,
        landlord_id,
        utilities!unit_bills_utility_id_fkey (name),
        units!unit_bills_unit_id_fkey (
          unit_number,
          properties!units_property_id_fkey (
            name,
            landlord_id
          )
        )
      `)
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      console.error('❌ [API] Error fetching bill:', billError);
      return res.status(404).json({ error: 'Utility bill not found' });
    }

    // 2. Get the landlord's subaccount code
    const landlordId = bill.landlord_id || bill.units?.properties?.landlord_id;
    if (!landlordId) {
      return res.status(400).json({ error: 'No landlord found for this bill' });
    }

    const { data: landlord, error: landlordError } = await supabase
      .from('landlords')
      .select('id, name, subaccount_code')
      .eq('id', landlordId)
      .single();

    if (landlordError || !landlord) {
      console.error('❌ [API] Error fetching landlord:', landlordError);
      return res.status(404).json({ error: 'Landlord not found' });
    }

    const subaccount_code = landlord?.subaccount_code;
    const amountInKobo = Math.round(amount * 100);
    const reference = `utility_${Date.now()}_${billId}`;

    console.log('📊 [API] Payment details:', {
      billId,
      amount,
      amountInKobo,
      email,
      landlord: landlord.name,
      subaccount: subaccount_code,
      reference
    });

    // 3. Initialize Paystack transaction with split payment
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

    // Add split payment configuration if subaccount exists
    if (subaccount_code) {
      // Calculate split: 95% to platform, 5% to landlord
      const landlordPercentage = 5; // 5% to landlord (subaccount)
      const landlordAmount = Math.round((amountInKobo * landlordPercentage) / 100);
      const platformAmount = amountInKobo - landlordAmount; // Remaining goes to platform
      
      paystackRequestData.subaccount = subaccount_code;
      paystackRequestData.transaction_charge = platformAmount; // Amount that goes to main account (platform)
      
      console.log('✅ [API] Adding split payment configuration:');
      console.log(`   Total Amount: ${amountInKobo} kobo (KES ${amountInKobo / 100})`);
      console.log(`   Platform (95%): ${platformAmount} kobo (KES ${platformAmount / 100})`);
      console.log(`   Landlord (5%): ${landlordAmount} kobo (KES ${landlordAmount / 100})`);
      console.log(`   Subaccount: ${subaccount_code}`);
    } else {
      console.log('⚠️ [API] No subaccount code found, using main account');
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackRequestData),
    });

    const paystackData = await paystackResponse.json();

    console.log('📤 [API] Paystack response:', {
      status: paystackResponse.status,
      success: paystackData.status,
      reference: paystackData.data?.reference
    });

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('❌ [API] Paystack initialization failed:', paystackData);
      return res.status(400).json({ 
        error: paystackData.message || 'Failed to initialize payment' 
      });
    }

    console.log('✅ [API] Payment initialized successfully');
    res.json({
      success: true,
      data: {
        ...paystackData.data,
        amount: amountInKobo // Include the amount in the response
      }
    });

  } catch (error) {
    console.error('❌ [API] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Initialize Rent Payment API
app.post('/api/initializeRentPayment', async (req, res) => {
  try {
    console.log('🚀 [API] Initializing rent payment...');
    const { leaseId, amount, email, callbackUrl } = req.body;

    if (!leaseId || !amount || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: leaseId, amount, email' 
      });
    }

    // 1. Get the lease details and find the landlord
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        unit_id,
        tenant_id,
        units!leases_unit_id_fkey (
          property_id,
          properties!units_property_id_fkey (
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      console.error('❌ [API] Error fetching lease:', leaseError);
      return res.status(404).json({ error: 'Lease not found' });
    }

    // 2. Get the landlord's subaccount code
    const landlordId = lease.units?.properties?.landlord_id;
    if (!landlordId) {
      return res.status(400).json({ error: 'No landlord found for this lease' });
    }

    const { data: landlord, error: landlordError } = await supabase
      .from('landlords')
      .select('id, name, subaccount_code')
      .eq('id', landlordId)
      .single();

    if (landlordError || !landlord) {
      console.error('❌ [API] Error fetching landlord:', landlordError);
      return res.status(404).json({ error: 'Landlord not found' });
    }

    const subaccount_code = landlord?.subaccount_code;
    const amountInKobo = Math.round(amount * 100);
    const reference = `rent_${Date.now()}_${leaseId}`;

    console.log('📊 [API] Rent payment details:', {
      leaseId,
      amount,
      amountInKobo,
      email,
      landlord: landlord.name,
      subaccount: subaccount_code,
      reference
    });

    // 3. Initialize Paystack transaction with split payment
    const paystackRequestData = {
      email,
      amount: amountInKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        lease_id: leaseId,
        landlord_id: landlordId,
        unit_id: lease.unit_id,
        tenant_id: lease.tenant_id,
        type: 'rent_payment',
      },
    };

    // Add split payment configuration if subaccount exists
    if (subaccount_code) {
      // Calculate split: 95% to platform, 5% to landlord
      const landlordPercentage = 5; // 5% to landlord (subaccount)
      const landlordAmount = Math.round((amountInKobo * landlordPercentage) / 100);
      const platformAmount = amountInKobo - landlordAmount; // Remaining goes to platform
      
      paystackRequestData.subaccount = subaccount_code;
      paystackRequestData.transaction_charge = platformAmount; // Amount that goes to main account (platform)
      
      console.log('✅ [API] Adding split payment configuration:');
      console.log(`   Total Amount: ${amountInKobo} kobo (KES ${amountInKobo / 100})`);
      console.log(`   Platform (95%): ${platformAmount} kobo (KES ${platformAmount / 100})`);
      console.log(`   Landlord (5%): ${landlordAmount} kobo (KES ${landlordAmount / 100})`);
      console.log(`   Subaccount: ${subaccount_code}`);
    } else {
      console.log('⚠️ [API] No subaccount code found, using main account');
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackRequestData),
    });

    const paystackData = await paystackResponse.json();

    console.log('📤 [API] Paystack response:', {
      status: paystackResponse.status,
      success: paystackData.status,
      reference: paystackData.data?.reference
    });

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('❌ [API] Paystack initialization failed:', paystackData);
      return res.status(400).json({ 
        error: paystackData.message || 'Failed to initialize payment' 
      });
    }

    console.log('✅ [API] Rent payment initialized successfully');
    res.json({
      success: true,
      data: {
        ...paystackData.data,
        amount: amountInKobo // Include the amount in the response
      }
    });

  } catch (error) {
    console.error('❌ [API] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Verify Payment API
app.post('/api/verifyPayment', async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

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

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      return res.status(400).json({ 
        error: paystackData.message || 'Payment verification failed' 
      });
    }

    res.json({
      success: true,
      data: paystackData.data
    });

  } catch (error) {
    console.error('❌ [API] Verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// M-Pesa STK Push for Rent Payment
app.post('/api/mpesa/rent-payment', async (req, res) => {
  try {
    console.log('🚀 [M-Pesa] Initiating rent payment STK Push...');
    const { leaseId, amount, phoneNumber } = req.body;

    if (!leaseId || !amount || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: leaseId, amount, phoneNumber' 
      });
    }

    // 1. Get lease details and landlord info
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        unit_id,
        tenant_id,
        units!leases_unit_id_fkey (
          property_id,
          properties!units_property_id_fkey (
            landlord_id
          )
        )
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      console.error('❌ [M-Pesa] Error fetching lease:', leaseError);
      return res.status(404).json({ error: 'Lease not found' });
    }

    // 2. Get landlord's M-Pesa details
    const landlordId = lease.units?.properties?.landlord_id;
    if (!landlordId) {
      return res.status(400).json({ error: 'No landlord found for this lease' });
    }

    const { data: landlord, error: landlordError } = await supabase
      .from('landlords')
      .select('id, name, paybill_number, account_reference')
      .eq('id', landlordId)
      .single();

    if (landlordError || !landlord) {
      console.error('❌ [M-Pesa] Error fetching landlord:', landlordError);
      return res.status(404).json({ error: 'Landlord not found' });
    }

    if (!landlord.paybill_number || !landlord.account_reference) {
      return res.status(400).json({ 
        error: 'Landlord M-Pesa details not configured' 
      });
    }

    // 3. Initiate STK Push
    const stkPushRequest = {
      BusinessShortCode: landlord.paybill_number,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount), // M-Pesa expects whole numbers
      PartyA: phoneNumber,
      PartyB: landlord.paybill_number,
      PhoneNumber: phoneNumber,
      CallBackURL: process.env.DARAJA_CALLBACK_URL || 'http://localhost:3001/api/mpesa/callback',
      AccountReference: landlord.account_reference,
      TransactionDesc: 'Rent Payment for current month'
    };

    const stkResponse = await mpesaAPI.initiateSTKPush(stkPushRequest);

    console.log('✅ [M-Pesa] STK Push initiated successfully:', stkResponse);

    // Store payment request for tracking
    if (stkResponse.CheckoutRequestID) {
      paymentRequests.set(stkResponse.CheckoutRequestID, {
        type: 'rent',
        leaseId,
        amount,
        phoneNumber,
        status: 'pending',
        merchantRequestID: stkResponse.MerchantRequestID,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        checkoutRequestID: stkResponse.CheckoutRequestID,
        merchantRequestID: stkResponse.MerchantRequestID,
        responseCode: stkResponse.ResponseCode,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage
      }
    });

  } catch (error) {
    console.error('❌ [M-Pesa] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// M-Pesa STK Push for Utility Payment
app.post('/api/mpesa/utility-payment', async (req, res) => {
  try {
    console.log('🚀 [M-Pesa] Initiating utility payment STK Push...');
    const { billId, amount, phoneNumber } = req.body;

    if (!billId || !amount || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: billId, amount, phoneNumber' 
      });
    }

    // 1. Get bill details and landlord info
    const { data: bill, error: billError } = await supabase
      .from('unit_bills')
      .select(`
        id,
        amount,
        landlord_id,
        utilities!unit_bills_utility_id_fkey (name),
        units!unit_bills_unit_id_fkey (
          unit_number,
          properties!units_property_id_fkey (
            landlord_id
          )
        )
      `)
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      console.error('❌ [M-Pesa] Error fetching bill:', billError);
      return res.status(404).json({ error: 'Bill not found' });
    }

    const landlordId = bill.landlord_id || bill.units?.properties?.landlord_id;
    if (!landlordId) {
      return res.status(400).json({ error: 'No landlord found for this bill' });
    }

    // 2. Get landlord's M-Pesa details
    const { data: landlord, error: landlordError } = await supabase
      .from('landlords')
      .select('id, name, paybill_number, account_reference')
      .eq('id', landlordId)
      .single();

    if (landlordError || !landlord) {
      console.error('❌ [M-Pesa] Error fetching landlord:', landlordError);
      return res.status(404).json({ error: 'Landlord not found' });
    }

    if (!landlord.paybill_number || !landlord.account_reference) {
      return res.status(400).json({ 
        error: 'Landlord M-Pesa details not configured' 
      });
    }

    // 3. Initiate STK Push
    const stkPushRequest = {
      BusinessShortCode: landlord.paybill_number,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: landlord.paybill_number,
      PhoneNumber: phoneNumber,
      CallBackURL: process.env.DARAJA_CALLBACK_URL || 'http://localhost:3001/api/mpesa/callback',
      AccountReference: landlord.account_reference,
      TransactionDesc: `Utility Payment - ${bill.utilities?.name || 'Utility Bill'}`
    };

    const stkResponse = await mpesaAPI.initiateSTKPush(stkPushRequest);

    console.log('✅ [M-Pesa] STK Push initiated successfully:', stkResponse);

    // Store payment request for tracking
    if (stkResponse.CheckoutRequestID) {
      paymentRequests.set(stkResponse.CheckoutRequestID, {
        type: 'utility',
        billId,
        amount,
        phoneNumber,
        status: 'pending',
        merchantRequestID: stkResponse.MerchantRequestID,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        checkoutRequestID: stkResponse.CheckoutRequestID,
        merchantRequestID: stkResponse.MerchantRequestID,
        responseCode: stkResponse.ResponseCode,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage
      }
    });

  } catch (error) {
    console.error('❌ [M-Pesa] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// M-Pesa Callback Endpoint
app.post('/api/mpesa/callback', async (req, res) => {
  try {
    console.log('📞 [M-Pesa] Callback received:', JSON.stringify(req.body, null, 2));
    
    const callbackData = req.body;
    const stkCallback = callbackData.Body?.stkCallback;
    
    if (!stkCallback) {
      console.error('❌ [M-Pesa] Invalid callback data');
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    const { 
      MerchantRequestID, 
      CheckoutRequestID, 
      ResultCode, 
      ResultDesc,
      CallbackMetadata 
    } = stkCallback;

    console.log('🔍 [M-Pesa] Callback details:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc
    });

    // Update payment request status
    const paymentRequest = paymentRequests.get(CheckoutRequestID);
    if (paymentRequest) {
      paymentRequest.status = ResultCode === 0 ? 'success' : ResultCode === 1 ? 'cancelled' : 'failed';
      paymentRequest.resultCode = ResultCode;
      paymentRequest.resultDesc = ResultDesc;
      paymentRequest.updatedAt = new Date().toISOString();
    }

    // Check payment result
    if (ResultCode === 0) {
      console.log('✅ [M-Pesa] Payment successful!');
      
      // Extract payment details from callback metadata
      const metadata = CallbackMetadata?.Item || [];
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
      const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;

      console.log('💰 [M-Pesa] Payment details:', {
        amount,
        mpesaReceiptNumber,
        phoneNumber,
        transactionDate
      });

      // Store additional success details
      if (paymentRequest) {
        paymentRequest.mpesaReceiptNumber = mpesaReceiptNumber;
        paymentRequest.transactionDate = transactionDate;
      }

      // TODO: Update payment records in database
      // This would typically involve:
      // 1. Finding the original payment request by CheckoutRequestID
      // 2. Updating the payment status to 'success'
      // 3. Recording the M-Pesa transaction details
      // 4. Updating rent/utility payment status

      res.json({ 
        success: true, 
        message: 'Payment processed successfully',
        transactionID: mpesaReceiptNumber,
        status: 'success'
      });
      
    } else if (ResultCode === 1) {
      console.log('❌ [M-Pesa] Payment cancelled by user:', ResultDesc);
      
      // Payment was cancelled by the user
      res.json({ 
        success: false, 
        message: 'Payment cancelled by user',
        error: ResultDesc,
        status: 'cancelled'
      });
      
    } else {
      console.log('❌ [M-Pesa] Payment failed:', ResultDesc);
      
      // Other failure reasons (insufficient funds, network issues, etc.)
      res.json({ 
        success: false, 
        message: 'Payment failed',
        error: ResultDesc,
        status: 'failed'
      });
    }

  } catch (error) {
    console.error('❌ [M-Pesa] Callback error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Check Payment Status
app.get('/api/mpesa/payment-status/:checkoutRequestID', (req, res) => {
  try {
    const { checkoutRequestID } = req.params;
    
    const paymentRequest = paymentRequests.get(checkoutRequestID);
    
    if (!paymentRequest) {
      return res.status(404).json({ 
        error: 'Payment request not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        checkoutRequestID,
        status: paymentRequest.status,
        type: paymentRequest.type,
        amount: paymentRequest.amount,
        phoneNumber: paymentRequest.phoneNumber,
        resultCode: paymentRequest.resultCode,
        resultDesc: paymentRequest.resultDesc,
        mpesaReceiptNumber: paymentRequest.mpesaReceiptNumber,
        timestamp: paymentRequest.timestamp,
        updatedAt: paymentRequest.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ [M-Pesa] Status check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API server is running',
    endpoints: [
      'POST /api/initializeUtilityPayment',
      'POST /api/initializeRentPayment', 
      'POST /api/verifyPayment',
      'POST /api/mpesa/rent-payment',
      'POST /api/mpesa/utility-payment',
      'POST /api/mpesa/callback',
      'GET /api/mpesa/payment-status/:checkoutRequestID',
      'GET /api/health'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   POST /api/initializeUtilityPayment`);
  console.log(`   POST /api/initializeRentPayment`);
  console.log(`   POST /api/verifyPayment`);
  console.log(`   GET  /api/health`);
});

export default app;
