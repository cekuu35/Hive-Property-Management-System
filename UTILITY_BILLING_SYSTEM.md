# Utility Billing System

A complete utility billing system for the rental management app with Supabase backend, React frontend, and Paystack payment integration.

## 🚀 Features

### For Landlords
- Create utility bills for specific units
- Assign bills to specific tenants or make them available to any tenant in the unit
- View all bills with filtering and search capabilities
- Edit bill details (amount, due date, status)
- Mark bills as paid manually with reason
- Delete bills
- View comprehensive billing statistics

### For Tenants
- View all utility bills (unpaid, paid, overdue)
- Pay bills directly through Paystack integration
- Receive real-time notifications for new bills
- View payment history
- Track bill status and due dates

### System Features
- Real-time notifications
- Paystack payment processing
- Webhook handling for payment verification
- Row Level Security (RLS) policies
- Comprehensive audit logging
- Duplicate bill prevention

## 📁 File Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── tenant/
│   │   │   └── UtilityBillsSection.tsx          # Tenant utility bills UI
│   │   └── landlord/
│   │       ├── UtilityBillsManagement.tsx       # Landlord bills management
│   │       └── CreateBillModal.tsx              # Bill creation modal
│   └── Notifications.tsx                        # Notifications component
├── hooks/
│   ├── useUtilityBills.tsx                      # Utility bills hook
│   └── useNotifications.tsx                     # Notifications hook
└── integrations/
    └── supabase/
        └── functions/
            ├── utility-bills/
            │   └── index.ts                     # Bills API edge function
            └── paystack-webhook/
                └── index.ts                     # Paystack webhook handler

supabase/
└── migrations/
    ├── 20250101_create_utility_billing_system.sql
    └── 20250101_create_notifications_table.sql
```

## 🗄️ Database Schema

### Tables

#### `utilities`
- `id` (uuid, primary key)
- `name` (text) - e.g., "Water", "Electricity", "Internet"
- `created_at` (timestamptz)

#### `unit_bills`
- `id` (uuid, primary key)
- `unit_id` (uuid, foreign key to units)
- `tenant_id` (uuid, foreign key to tenant_info, nullable)
- `landlord_id` (uuid, foreign key to profiles)
- `utility_id` (uuid, foreign key to utilities)
- `month` (text) - e.g., "October 2025"
- `amount` (numeric)
- `due_date` (date)
- `status` (text) - 'unpaid', 'paid', 'overdue'
- `paystack_reference` (text, nullable)
- `payment_reason` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `notifications`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to profiles)
- `title` (text)
- `message` (text)
- `type` (text) - 'utility_bill', 'payment_success', etc.
- `data` (jsonb, nullable)
- `read` (boolean)
- `created_at` (timestamptz)

#### `webhook_logs`
- `id` (uuid, primary key)
- `event_type` (text)
- `payload` (jsonb)
- `processed` (boolean)
- `error_message` (text, nullable)
- `created_at` (timestamptz)

### Functions

- `get_tenant_bills(tenant_profile_id)` - Get bills for a specific tenant
- `get_landlord_bills(landlord_profile_id)` - Get bills for a specific landlord
- `create_utility_bill_notification(...)` - Create notification for new bill
- `mark_overdue_bills()` - Mark overdue bills
- `update_updated_at_column()` - Update timestamp trigger

### Triggers

- `trigger_notify_utility_bill_created` - Auto-create notifications for new bills
- `update_unit_bills_updated_at` - Auto-update timestamps

## 🔧 Setup Instructions

### 1. Database Setup

Run the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase-utility-billing-setup.sql
```

### 2. Environment Variables

Ensure these environment variables are set:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SITE_URL=your_site_url
```

### 3. Deploy Edge Functions

Deploy the Supabase Edge Functions:

```bash
# Deploy utility bills function
supabase functions deploy utility-bills

# Deploy Paystack webhook function
supabase functions deploy paystack-webhook
```

### 4. Configure Paystack Webhook

In your Paystack dashboard, set the webhook URL to:
```
https://your-project-ref.supabase.co/functions/v1/paystack-webhook
```

## 🎯 API Endpoints

### Utility Bills API (`/functions/v1/utility-bills`)

- `GET /api/tenant/bills` - Get tenant's bills
- `GET /api/landlord/bills` - Get landlord's bills
- `POST /api/landlord/bills` - Create new bill
- `PATCH /api/landlord/bills/:id` - Update bill
- `DELETE /api/landlord/bills/:id` - Delete bill
- `POST /api/paystack/initiate-bill-payment` - Initiate payment

### Paystack Webhook (`/functions/v1/paystack-webhook`)

- `POST /` - Handle Paystack webhook events

## 🔐 Security Features

### Row Level Security (RLS)

- Tenants can only view their own bills
- Landlords can only manage bills for their own properties
- Service role has full access for webhook processing

### Payment Security

- Server-side payment verification
- Webhook signature validation
- Secure metadata handling
- Transaction logging

## 🧪 Testing

### Manual Testing

1. **As Landlord:**
   - Create a utility bill for a unit
   - Verify tenant receives notification
   - Edit bill details
   - Mark bill as paid manually

2. **As Tenant:**
   - View utility bills in dashboard
   - Pay a bill through Paystack
   - Verify payment updates bill status
   - Check payment history

### Automated Testing

Run the test script:

```bash
node test-utility-billing-system.js
```

## 📱 UI Components

### Tenant Portal

- **Utility Bills Tab** - View and pay bills
- **Notifications** - Real-time bill notifications
- **Payment History** - Track all payments

### Landlord Portal

- **Utility Bills Management** - Complete bill management
- **Create Bill Modal** - Easy bill creation
- **Billing Statistics** - Overview of all bills

## 🔄 Payment Flow

1. **Bill Creation:**
   - Landlord creates bill
   - System creates notification
   - Tenant receives real-time notification

2. **Payment Processing:**
   - Tenant clicks "Pay Now"
   - System initiates Paystack payment
   - User completes payment on Paystack
   - Paystack sends webhook to system
   - System verifies payment and updates bill status
   - Tenant receives payment confirmation

3. **Status Updates:**
   - Bill status changes to "paid"
   - Payment record created
   - Tenant balance updated
   - Notification sent to tenant

## 🚨 Error Handling

- Duplicate bill prevention
- Payment verification failures
- Webhook processing errors
- RLS policy violations
- Network timeout handling

## 📊 Monitoring

- Webhook event logging
- Payment processing logs
- Error tracking
- Performance metrics

## 🔧 Maintenance

### Mark Overdue Bills

Run the function to mark overdue bills:

```sql
SELECT mark_overdue_bills();
```

### Clean Up Old Data

```sql
-- Delete old webhook logs (older than 30 days)
DELETE FROM webhook_logs 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete old notifications (older than 90 days)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days' 
AND read = true;
```

## 🎉 Success Metrics

- ✅ Complete end-to-end billing flow
- ✅ Real-time notifications
- ✅ Secure payment processing
- ✅ Comprehensive UI for both roles
- ✅ Database schema with proper constraints
- ✅ RLS policies for security
- ✅ Webhook handling for payments
- ✅ Error handling and logging

## 🚀 Next Steps

1. Deploy the system to production
2. Set up monitoring and alerts
3. Configure automated overdue bill processing
4. Add email notifications
5. Implement bill templates
6. Add bulk bill creation
7. Create billing reports and analytics

---

**Note:** This system is production-ready and includes all the features requested in the original requirements. The implementation follows best practices for security, performance, and user experience.




