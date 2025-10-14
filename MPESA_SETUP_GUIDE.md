# M-Pesa Daraja STK Push Integration Setup Guide

## Overview
This guide will help you set up the Safaricom M-Pesa Daraja STK Push integration to replace Paystack in your property management system.

## ✅ What's Already Implemented

### 1. Backend API Endpoints
- `POST /api/mpesa/rent-payment` - Initiate rent payment via STK Push
- `POST /api/mpesa/utility-payment` - Initiate utility payment via STK Push  
- `POST /api/mpesa/callback` - Handle M-Pesa payment callbacks
- `GET /api/health` - Health check with all endpoints

### 2. Database Schema
- Added `paybill_number` and `account_reference` fields to `landlords` table
- Migration file: `supabase/migrations/20250120000003_add_mpesa_fields_to_landlords.sql`

### 3. Frontend Components
- `MpesaRentPaymentModal.tsx` - M-Pesa rent payment modal
- `MpesaUtilityPaymentModal.tsx` - M-Pesa utility payment modal

### 4. M-Pesa API Helper
- Access token management with caching
- STK Push request handling
- Password generation for Daraja API

## 🔧 Setup Instructions

### Step 1: Configure Environment Variables

Add these variables to your `.env` file:

```env
# M-Pesa Daraja Configuration
DARAJA_CONSUMER_KEY=your_daraja_consumer_key_here
DARAJA_CONSUMER_SECRET=your_daraja_consumer_secret_here
DARAJA_PASSKEY=your_lipa_na_mpesa_passkey_here
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback
DARAJA_ENV=sandbox
```

### Step 2: Get M-Pesa Daraja Credentials

1. **Register for Daraja API**:
   - Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
   - Create an account and register your app
   - Get your Consumer Key and Consumer Secret

2. **Get Lipa na M-Pesa Online Passkey**:
   - In your Daraja app dashboard, go to "Lipa na M-Pesa Online"
   - Copy the passkey provided

3. **Test Credentials (Sandbox)**:
   - Use the sandbox environment for testing
   - Test phone number: `254708374149`
   - Test amount: Any amount (will not charge real money)

### Step 3: Run Database Migration

```bash
# Apply the migration to add M-Pesa fields
supabase db reset
# or
supabase migration up
```

### Step 4: Update Landlord Records

Update your landlord records with M-Pesa details:

```sql
-- Update existing landlords with M-Pesa details
UPDATE landlords 
SET 
  paybill_number = '174379',  -- Use your actual paybill number
  account_reference = 'RENT_PAYMENT'
WHERE paybill_number IS NULL;
```

### Step 5: Start the Servers

```bash
# Start both frontend and API server
npm run dev:full
```

## 🧪 Testing the Integration

### 1. Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test rent payment (replace with real credentials)
curl -X POST http://localhost:3001/api/mpesa/rent-payment \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "your-lease-id",
    "amount": 1000,
    "phoneNumber": "254708374149"
  }'
```

### 2. Test Frontend Integration

1. Go to `http://localhost:8080`
2. Login as a tenant
3. Try to pay rent or utility bills
4. Use the M-Pesa payment modals

## 📱 How It Works

### Rent Payment Flow

1. **Tenant clicks "Pay Rent"**
2. **Frontend calls** `/api/mpesa/rent-payment` with:
   - `leaseId` - Lease identifier
   - `amount` - Rent amount
   - `phoneNumber` - Tenant's M-Pesa phone number

3. **Backend processes**:
   - Fetches lease and landlord details
   - Gets landlord's paybill number and account reference
   - Calls M-Pesa STK Push API
   - Returns checkout request ID

4. **M-Pesa sends STK Push** to tenant's phone
5. **Tenant enters PIN** on their phone
6. **M-Pesa sends callback** to `/api/mpesa/callback`
7. **Backend updates** payment status in database

### Utility Payment Flow

Same as rent payment but uses `/api/mpesa/utility-payment` endpoint.

## 🔒 Security Considerations

1. **Environment Variables**: Never commit credentials to version control
2. **HTTPS**: Use HTTPS in production for callback URLs
3. **Validation**: Validate all incoming callback data
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Logging**: Log all payment attempts and results

## 🚀 Production Deployment

### 1. Update Environment Variables

```env
DARAJA_ENV=production
DARAJA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

### 2. Update Landlord Paybill Numbers

Replace sandbox paybill numbers with real ones:

```sql
UPDATE landlords 
SET paybill_number = 'your-actual-paybill-number'
WHERE paybill_number = '174379';
```

### 3. Configure Webhook Security

Implement webhook signature verification for production callbacks.

## 🐛 Troubleshooting

### Common Issues

1. **"M-Pesa credentials not configured"**
   - Check your `.env` file has all required variables
   - Restart the API server after adding credentials

2. **"Landlord M-Pesa details not configured"**
   - Run the database migration
   - Update landlord records with paybill numbers

3. **"STK Push failed"**
   - Check your Daraja credentials
   - Verify phone number format (254XXXXXXXXX)
   - Check if you're using sandbox vs production

4. **Callback not received**
   - Ensure callback URL is accessible
   - Check firewall settings
   - Verify callback URL format

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

## 📊 Monitoring

### Key Metrics to Track

1. **Payment Success Rate**
2. **Average Payment Processing Time**
3. **Failed Payment Reasons**
4. **Callback Response Times**

### Logs to Monitor

- STK Push initiation logs
- Callback processing logs
- Error logs and stack traces
- Payment status updates

## 🔄 Migration from Paystack

### Gradual Migration Strategy

1. **Phase 1**: Deploy M-Pesa alongside Paystack
2. **Phase 2**: Add M-Pesa option to payment modals
3. **Phase 3**: Make M-Pesa the default payment method
4. **Phase 4**: Remove Paystack integration

### Data Migration

- Existing Paystack payments remain in database
- New payments use M-Pesa
- Update payment status tracking logic

## 📞 Support

For issues with this integration:

1. Check the troubleshooting section above
2. Review M-Pesa Daraja API documentation
3. Check server logs for detailed error messages
4. Test with sandbox credentials first

## 🎉 Success!

Once configured, tenants will be able to pay rent and utility bills directly through M-Pesa STK Push, providing a seamless and familiar payment experience for Kenyan users.

