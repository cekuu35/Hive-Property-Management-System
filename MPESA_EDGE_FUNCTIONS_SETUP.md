# M-Pesa Edge Functions Setup Guide

## 🎯 Overview

This guide will help you migrate from the local Express server (localhost:3001) to Supabase Edge Functions for M-Pesa STK push integration. The edge functions provide a production-ready, scalable solution that doesn't require maintaining a separate server.

## ✅ What's Been Created

### 1. Edge Function: `mpesa-stk-push`
- **Location**: `supabase/functions/mpesa-stk-push/index.ts`
- **Endpoints**:
  - `POST /rent-payment` - Initiate rent payment via M-Pesa STK push
  - `POST /utility-payment` - Initiate utility payment via M-Pesa STK push
  - `POST /callback` - Handle M-Pesa payment callbacks
  - `GET /payment-status/{checkoutRequestID}` - Check payment status

### 2. Database Migration
- **File**: `supabase/migrations/20250120000004_create_payment_requests_table.sql`
- **Table**: `payment_requests` - Tracks all M-Pesa STK push requests
- **Features**: RLS policies, indexes, triggers

### 3. Updated Frontend Components
- **Files**: 
  - `src/components/dashboard/tenant/MpesaRentPaymentModal.tsx`
  - `src/components/dashboard/tenant/MpesaUtilityPaymentModal.tsx`
- **Changes**: Updated to call Supabase edge functions instead of localhost:3001

## 🚀 Deployment Steps

### Step 1: Deploy Edge Functions

#### Option A: Using Supabase CLI (if installed)
```bash
# Make sure you're in the project root
cd /path/to/your/project

# Deploy the edge function
supabase functions deploy mpesa-stk-push

# Run the database migration
supabase db push
```

#### Option B: Manual Deployment (if CLI not available)
1. **Deploy Edge Function**:
   - Go to your Supabase Dashboard → Edge Functions
   - Click "Create a new function"
   - Name: `mpesa-stk-push`
   - Copy the contents of `supabase/functions/mpesa-stk-push/index.ts`
   - Deploy the function

2. **Create Database Table**:
   - Go to your Supabase Dashboard → SQL Editor
   - Copy and run the contents of `create-payment-requests-table.sql`

### Step 2: Set Environment Variables

Go to your Supabase Dashboard → Project Settings → Edge Functions → Secrets and add:

```env
KCB_API_KEY=your_kcb_api_key_here
KCB_CLIENT_ID=your_kcb_client_id_here
KCB_CLIENT_SECRET=your_kcb_client_secret_here
DARAJA_CALLBACK_URL=https://your-project.supabase.co/functions/v1/mpesa-stk-push/callback
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Update M-Pesa Callback URL

In your M-Pesa configuration, update the callback URL to:
```
https://your-project.supabase.co/functions/v1/mpesa-stk-push/callback
```

### Step 4: Test the Integration

1. **Test Rent Payment**:
   - Go to your tenant dashboard
   - Try to pay rent via M-Pesa
   - Check the Supabase logs for any errors

2. **Test Utility Payment**:
   - Go to utility bills section
   - Try to pay a utility bill via M-Pesa
   - Verify payment status updates

## 🔧 Configuration Details

### Edge Function URL Structure

```
https://your-project.supabase.co/functions/v1/mpesa-stk-push/
├── rent-payment          # POST - Initiate rent payment
├── utility-payment       # POST - Initiate utility payment
├── callback              # POST - M-Pesa callback handler
└── payment-status/{id}   # GET - Check payment status
```

### Database Schema

The `payment_requests` table tracks all M-Pesa transactions:

```sql
CREATE TABLE payment_requests (
  id UUID PRIMARY KEY,
  checkout_request_id TEXT UNIQUE NOT NULL,
  merchant_request_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('rent', 'utility')),
  lease_id UUID REFERENCES leases(id),
  bill_id UUID REFERENCES utility_bills(id),
  amount DECIMAL(10,2) NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_code INTEGER,
  result_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔍 Monitoring and Debugging

### View Edge Function Logs

```bash
# View real-time logs
supabase functions logs mpesa-stk-push

# View logs for a specific time period
supabase functions logs mpesa-stk-push --since 1h
```

### Check Database

```sql
-- View all payment requests
SELECT * FROM payment_requests ORDER BY created_at DESC;

-- View successful payments
SELECT * FROM payment_requests WHERE status = 'success';

-- View failed payments
SELECT * FROM payment_requests WHERE status = 'failed';
```

## 🚨 Troubleshooting

### Common Issues

1. **Function not found (404)**
   - Ensure the function is deployed: `supabase functions list`
   - Check the URL format in frontend components

2. **Authentication errors (401)**
   - Verify the Supabase anon key is correct
   - Check RLS policies on payment_requests table

3. **M-Pesa API errors**
   - Verify KCB API credentials are correct
   - Check callback URL is accessible from M-Pesa servers

4. **Database errors**
   - Ensure migration was applied: `supabase db push`
   - Check table permissions and RLS policies

### Debug Mode

Add logging to the edge function by checking the Supabase logs:

```bash
supabase functions logs mpesa-stk-push --follow
```

## 🔄 Migration from Express Server

### What Changed

1. **Frontend URLs**: Changed from `http://localhost:3001/api/mpesa/*` to Supabase edge functions
2. **Authentication**: Now uses Supabase auth instead of no auth
3. **Database**: Payment tracking moved to `payment_requests` table
4. **Deployment**: No need to maintain Express server

### Rollback Plan

If you need to rollback:

1. Revert frontend components to use localhost:3001
2. Start your Express server: `node server.js`
3. The database changes are backward compatible

## 📊 Performance Benefits

- **Scalability**: Edge functions auto-scale based on demand
- **Global CDN**: Faster response times worldwide
- **No Server Maintenance**: No need to manage Express server
- **Built-in Monitoring**: Supabase provides logging and monitoring
- **Security**: Built-in authentication and RLS policies

## 🎉 Success!

Once deployed, your M-Pesa integration will be production-ready and scalable. The edge functions handle all the complexity of M-Pesa STK push while providing a clean, maintainable codebase.

For any issues, check the Supabase logs and ensure all environment variables are properly set.
