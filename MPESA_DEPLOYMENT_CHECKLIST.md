# M-Pesa Edge Functions Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Supabase project is set up and accessible
- [ ] M-Pesa API credentials are available (KCB Buni or Safaricom Daraja)
- [ ] Database has the required tables (`leases`, `unit_bills`, `landlords`, `properties`)
- [ ] Frontend components are updated to use edge functions

## 🚀 Deployment Steps

### 1. Create Database Table
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Run the SQL from `create-payment-requests-table.sql`
- [ ] Verify table was created successfully

### 2. Deploy Edge Function
- [ ] Go to Supabase Dashboard → Edge Functions
- [ ] Click "Create a new function"
- [ ] Name: `mpesa-stk-push`
- [ ] Copy code from `supabase/functions/mpesa-stk-push/index.ts`
- [ ] Deploy the function

### 3. Set Environment Variables
- [ ] Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
- [ ] Add the following secrets:
  - [ ] `KCB_API_KEY` - Your KCB Buni API key
  - [ ] `KCB_CLIENT_ID` - Your KCB Buni client ID
  - [ ] `KCB_CLIENT_SECRET` - Your KCB Buni client secret
  - [ ] `DARAJA_CALLBACK_URL` - Your callback URL
  - [ ] `SUPABASE_URL` - Your Supabase project URL
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

### 4. Update M-Pesa Configuration
- [ ] Update M-Pesa callback URL to: `https://your-project.supabase.co/functions/v1/mpesa-stk-push/callback`
- [ ] Test callback URL is accessible

### 5. Test Integration
- [ ] Test rent payment flow
- [ ] Test utility payment flow
- [ ] Verify payment status updates
- [ ] Check database records are created

## 🔍 Verification Steps

### Check Edge Function
```bash
# Test if function is accessible
curl -X GET "https://your-project.supabase.co/functions/v1/mpesa-stk-push/health" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Check Database
```sql
-- Verify payment_requests table exists
SELECT * FROM payment_requests LIMIT 5;

-- Check table structure
\d payment_requests;
```

### Check Logs
- [ ] Go to Supabase Dashboard → Edge Functions → mpesa-stk-push → Logs
- [ ] Look for any errors or warnings
- [ ] Test a payment and verify logs show the process

## 🚨 Troubleshooting

### Common Issues
1. **Function not found (404)**
   - Verify function name is exactly `mpesa-stk-push`
   - Check function is deployed and active

2. **Authentication errors (401)**
   - Verify Supabase anon key is correct
   - Check RLS policies on payment_requests table

3. **Database errors**
   - Verify payment_requests table exists
   - Check foreign key constraints

4. **M-Pesa API errors**
   - Verify API credentials are correct
   - Check callback URL is accessible

### Debug Commands
```bash
# Test edge function with curl
curl -X POST "https://your-project.supabase.co/functions/v1/mpesa-stk-push/rent-payment" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"leaseId":"test-id","amount":1000,"phoneNumber":"254712345678"}'
```

## ✅ Post-Deployment

- [ ] Remove localhost:3001 references from code
- [ ] Update documentation
- [ ] Monitor edge function logs
- [ ] Set up monitoring/alerts if needed
- [ ] Test with real M-Pesa transactions

## 📞 Support

If you encounter issues:
1. Check the Supabase logs first
2. Verify all environment variables are set
3. Test with the debug commands above
4. Check the database for any constraint violations

