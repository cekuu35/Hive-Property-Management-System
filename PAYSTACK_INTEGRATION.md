# Paystack Integration Guide

This guide explains how to integrate Paystack payments into your property management application.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paystack Configuration (new)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
VITE_PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
```

### 2. Get Paystack API Keys

1. Sign up for a Paystack account at [https://paystack.com](https://paystack.com)
2. Go to your dashboard and navigate to Settings > API Keys
3. Copy your Public Key and Secret Key
4. For testing, use the test keys (they start with `pk_test_` and `sk_test_`)
5. For production, use the live keys (they start with `pk_live_` and `sk_live_`)

### 3. Install Dependencies

The required dependency has already been installed:

```bash
npm install @paystack/inline-js
```

## How It Works

### Payment Flow

1. **Tenant clicks "Pay Rent"** - Opens the payment modal
2. **Automatic Paystack initialization** - Payment gateway opens immediately
3. **Paystack checkout** - Tenant sees Paystack's secure payment form with all available options
4. **Payment completion** - Tenant chooses from cards, bank transfers, or mobile money
5. **Verification** - Backend verifies the payment with Paystack
6. **Database update** - Payment is recorded in your database
7. **Success notification** - Tenant sees confirmation

### Key Components

#### 1. Paystack Configuration (`src/lib/paystack.ts`)
- Handles Paystack API configuration
- Provides utility functions for currency conversion
- Generates unique payment references

#### 2. Payment Hook (`src/hooks/usePaystackPayment.tsx`)
- Manages payment state and processing
- Handles payment verification
- Records payments in the database
- Provides loading states and error handling

#### 3. Updated Payment Modal (`src/components/dashboard/tenant/TenantPaymentModal.tsx`)
- Streamlined payment flow - Paystack opens immediately
- No payment method selection required
- Tenant chooses from Paystack's available payment options
- Provides seamless user experience

## Features

### ✅ What's Included

- **Multiple Payment Methods**: Paystack supports cards, bank transfers, and mobile money
- **Secure Processing**: All payments are processed securely through Paystack
- **Real-time Verification**: Payments are verified immediately after completion
- **Database Integration**: Payments are automatically recorded in your Supabase database
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Clear loading indicators during payment processing
- **Receipt Generation**: Automatic receipt generation and email notifications

### 🔧 Customization Options

- **Currency**: Currently set to NGN (Nigerian Naira), can be changed to other supported currencies
- **Payment Methods**: Paystack automatically shows available payment methods based on user location
- **UI Styling**: Payment modal can be customized to match your brand
- **Webhook Integration**: Can be extended to handle webhook notifications

## Testing

### Test Cards

For testing, you can use these test card numbers:

- **Successful Payment**: 4084084084084081
- **Declined Payment**: 4084084084084085
- **Insufficient Funds**: 4084084084084086

Use any future expiry date and any 3-digit CVV.

### Test Bank Accounts

For bank transfer testing, use any valid Nigerian bank account details.

## Production Deployment

### 1. Update Environment Variables

Replace test keys with live keys:

```env
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
VITE_PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
```

### 2. Webhook Setup (Recommended)

Set up webhooks in your Paystack dashboard to handle payment notifications:

1. Go to Settings > Webhooks in your Paystack dashboard
2. Add webhook URL: `https://yourdomain.com/api/paystack-webhook`
3. Select events: `charge.success`, `charge.failed`
4. Implement webhook handler to update payment status

### 3. Security Considerations

- Never expose secret keys in client-side code
- Implement proper webhook signature verification
- Use HTTPS in production
- Regularly rotate API keys
- Monitor payment logs for suspicious activity

## Troubleshooting

### Common Issues

1. **"Paystack configuration is missing"**
   - Check that environment variables are set correctly
   - Ensure variables start with `VITE_` for Vite to pick them up

2. **Payment not processing**
   - Verify API keys are correct
   - Check browser console for errors
   - Ensure user has a valid email address

3. **Database errors**
   - Check Supabase connection
   - Verify user has proper permissions
   - Check that lease exists for the tenant

### Support

- Paystack Documentation: [https://paystack.com/docs](https://paystack.com/docs)
- Paystack Support: [https://paystack.com/help](https://paystack.com/help)

## Next Steps

1. Set up your Paystack account and get API keys
2. Add the environment variables to your `.env` file
3. Test the integration with test cards
4. Deploy to production with live keys
5. Set up webhooks for production monitoring

The integration is now ready to use! Tenants can click "Pay Rent" and complete payments securely through Paystack.
