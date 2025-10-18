# M-Pesa Integration Guide for Your Property Management App

## 🎯 Current Status

✅ **Your app is ready for M-Pesa payments!**
- Payment endpoints are working correctly
- Database schema is properly configured
- Frontend components are implemented
- Server is running and responding

❌ **API Key Issue**
- Your current API key appears to be expired or invalid
- It's for Buni/KCB service, not the standard Safaricom Daraja API

## 🚀 Quick Setup (Recommended)

### Option 1: Use Safaricom Daraja API (Recommended)

1. **Register for Daraja API**:
   - Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
   - Create an account and register your app
   - Get your Consumer Key and Consumer Secret

2. **Get Lipa na M-Pesa Online Passkey**:
   - In your Daraja app dashboard, go to "Lipa na M-Pesa Online"
   - Copy the passkey provided

3. **Update your .env file**:
   ```env
   # M-Pesa Daraja Configuration
   DARAJA_CONSUMER_KEY=your_daraja_consumer_key_here
   DARAJA_CONSUMER_SECRET=your_daraja_consumer_secret_here
   DARAJA_PASSKEY=your_lipa_na_mpesa_passkey_here
   DARAJA_SHORTCODE_SANDBOX=174379
   DARAJA_CALLBACK_URL=http://localhost:3001/api/mpesa/callback
   DARAJA_ENV=sandbox
   ```

4. **Test the integration**:
   ```bash
   # Restart your server
   npm start
   
   # Test payment (replace with real lease ID)
   curl -X POST http://localhost:3001/api/mpesa/rent-payment \
     -H "Content-Type: application/json" \
     -d '{"leaseId":"real-lease-id","amount":1000,"phoneNumber":"254708374149"}'
   ```

### Option 2: Use Buni/KCB API (If you prefer)

1. **Get a fresh API key from Buni/KCB**
2. **Update your server.js** to use the BuniMpesaAPI class
3. **Add to .env file**:
   ```env
   BUNI_API_KEY=your_fresh_buni_api_key_here
   ```

## 🧪 Testing Your Integration

### 1. Test with Real Data

Create a test lease and bill in your database:

```sql
-- Create a test landlord with M-Pesa details
INSERT INTO landlords (name, email, paybill_number, account_reference) 
VALUES ('Test Landlord', 'test@example.com', '174379', 'TEST001');

-- Create a test lease
INSERT INTO leases (landlord_id, property_id, tenant_id, monthly_rent, start_date, end_date)
VALUES (1, 1, 1, 10000, '2024-01-01', '2024-12-31');

-- Create a test utility bill
INSERT INTO utility_bills (lease_id, utilities_id, amount, due_date, status)
VALUES (1, 1, 5000, '2024-02-01', 'pending');
```

### 2. Test Payment Endpoints

```bash
# Test rent payment
curl -X POST http://localhost:3001/api/mpesa/rent-payment \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "1",
    "amount": 1000,
    "phoneNumber": "254708374149"
  }'

# Test utility payment
curl -X POST http://localhost:3001/api/mpesa/utility-payment \
  -H "Content-Type: application/json" \
  -d '{
    "billId": "1",
    "amount": 500,
    "phoneNumber": "254708374149"
  }'
```

### 3. Test with Frontend

1. Open your app in the browser
2. Navigate to tenant dashboard
3. Try to make a payment
4. Check the server console for logs

## 📱 Phone Number Format

- **Kenyan numbers**: 254XXXXXXXXX
- **Example**: 254708374149 (for 0708374149)
- **Validation**: Must start with 254 and be 12 digits total

## 🔧 Troubleshooting

### Common Issues

1. **"M-Pesa credentials not configured"**
   - Check your .env file has all required variables
   - Restart the API server after adding credentials

2. **"Landlord M-Pesa details not configured"**
   - Run the database migration
   - Update landlord records with paybill numbers

3. **"STK Push failed"**
   - Check your Daraja credentials
   - Verify phone number format (254XXXXXXXXX)
   - Check if you're using sandbox vs production

4. **"Lease not found" / "Bill not found"**
   - Create test data in your database
   - Use real lease/bill IDs from your database

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

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

## 🎉 Success!

Once you have valid M-Pesa credentials, your app will be able to:

- ✅ Process rent payments via STK Push
- ✅ Process utility bill payments via STK Push
- ✅ Handle payment callbacks automatically
- ✅ Update payment status in real-time
- ✅ Send notifications to tenants and landlords

Your property management system is now ready for M-Pesa integration! 🚀


