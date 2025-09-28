# Paystack Integration Setup

## Quick Setup

### 1. Environment Variables

Create a `.env` file in your project root with these variables:

```env
# Supabase Configuration (already provided)
VITE_SUPABASE_URL=https://kozhlejudselgtmohdfm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g

# Paystack Configuration (add your keys here)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

### 2. Get Paystack API Keys

1. Sign up at [https://paystack.com](https://paystack.com)
2. Go to Settings → API Keys
3. Copy your Public Key (starts with `pk_test_` for testing)
4. Replace `pk_test_your_public_key_here` in your `.env` file

### 3. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the tenant dashboard and click "Pay Rent"

3. The Paystack payment button will appear - click it to open the payment gateway

### 4. Test Cards

For testing, use these card numbers:
- **Success**: 4084084084084081
- **Declined**: 4084084084084085
- **Insufficient Funds**: 4084084084084086

Use any future expiry date and any 3-digit CVV.

## How It Works

1. **Tenant clicks "Pay Rent"** → Payment modal opens
2. **Paystack button appears** → Shows payment amount and options
3. **Tenant clicks Paystack button** → Paystack payment gateway opens
4. **Tenant chooses payment method** → Cards, bank transfers, mobile money, etc.
5. **Payment processes** → Secure processing through Paystack
6. **Success notification** → Payment recorded in database

## Features

✅ **Streamlined Flow** - No payment method selection needed  
✅ **Multiple Payment Options** - Cards, bank transfers, mobile money  
✅ **Secure Processing** - All payments through Paystack  
✅ **Database Integration** - Payments automatically recorded  
✅ **Real-time Updates** - Payment status updates immediately  

## Production Deployment

1. Replace test keys with live keys in `.env`
2. Update `VITE_PAYSTACK_PUBLIC_KEY` to your live public key
3. Deploy your application

The integration is now complete and ready to use!
