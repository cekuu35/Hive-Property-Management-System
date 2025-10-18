# n8n Automation Guide for Property Management

## 🚀 Overview
I've created 5 comprehensive automation workflows for your property management system. Each workflow is designed to handle specific aspects of your business operations.

## 📋 Available Automations

### 1. 🏠 Rent Reminder Automation
**File**: `n8n-workflows/rent-reminder-automation.json`
**Trigger**: Monthly (1st of every month at 9 AM)
**Purpose**: Automatically remind tenants about upcoming rent payments

**What it does**:
- Runs monthly on the 1st at 9 AM
- Queries tenants with rent due within 5 days
- Sends M-Pesa STK Push payment requests
- Logs notifications in the database
- Updates tenant payment status

**Key Features**:
- Automated rent collection
- M-Pesa integration
- Notification tracking
- Payment status updates

### 2. 💰 M-Pesa Payment Processing
**File**: `n8n-workflows/mpesa-payment-processing.json`
**Trigger**: Webhook (M-Pesa callback)
**Purpose**: Process M-Pesa payment callbacks and update tenant records

**What it does**:
- Receives M-Pesa payment callbacks
- Extracts payment details (amount, receipt number, phone)
- Verifies payment success
- Updates tenant payment records
- Sends confirmation notifications
- Updates rent status and next due date

**Key Features**:
- Real-time payment processing
- Automatic record updates
- Payment verification
- Confirmation notifications

### 3. ⚡ Utility Billing Automation
**File**: `n8n-workflows/utility-billing-automation.json`
**Trigger**: Monthly (1st of every month)
**Purpose**: Generate and send utility bills to all active tenants

**What it does**:
- Runs monthly on the 1st
- Gets all active tenants
- Calculates utility bills (water, electricity, garbage)
- Creates utility bill records
- Sends notifications to tenants
- Initiates M-Pesa payment requests

**Key Features**:
- Automated bill generation
- Multi-utility support
- M-Pesa payment integration
- Tenant notifications

### 4. 🔧 Maintenance Request Automation
**File**: `n8n-workflows/maintenance-request-automation.json`
**Trigger**: Webhook (maintenance request submission)
**Purpose**: Handle maintenance requests from tenants

**What it does**:
- Receives maintenance request webhooks
- Extracts request details
- Gets tenant and property information
- Creates maintenance request records
- Prioritizes urgent requests
- Notifies both tenant and admin
- Sends confirmation responses

**Key Features**:
- Request prioritization
- Multi-level notifications
- Status tracking
- Admin alerts for urgent issues

### 5. 👥 Tenant Onboarding Automation
**File**: `n8n-workflows/tenant-onboarding-automation.json`
**Trigger**: Webhook (new tenant registration)
**Purpose**: Automate the tenant onboarding process

**What it does**:
- Receives tenant onboarding webhooks
- Extracts tenant and property data
- Creates tenant records
- Generates lease agreements
- Sends welcome notifications
- Initiates first payment collection
- Confirms successful onboarding

**Key Features**:
- Complete onboarding workflow
- Lease agreement generation
- Welcome communications
- First payment collection

## 🔧 Setup Instructions

### Step 1: Import Workflows
1. Open n8n at http://localhost:5678
2. Go to "Workflows" → "Import from File"
3. Import each JSON file from the `n8n-workflows/` folder

### Step 2: Configure Credentials
Set up these credentials in n8n:

**Supabase API**:
- Type: Header Auth
- Header: `Authorization`
- Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M`
- Additional Headers:
  - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M`
  - `Content-Type`: `application/json`

**Daraja API**:
- Type: Header Auth
- Header: `Authorization`
- Value: `Basic {base64_encoded_credentials}`
- Note: Replace with your actual M-Pesa credentials

### Step 3: Configure Webhooks
Update webhook URLs in your application to point to n8n:

- **M-Pesa Callback**: `http://localhost:5678/webhook/mpesa-callback`
- **Maintenance Request**: `http://localhost:5678/webhook/maintenance-request`
- **Tenant Onboarding**: `http://localhost:5678/webhook/tenant-onboarding`

### Step 4: Test Workflows
1. Activate each workflow
2. Test with sample data
3. Verify database updates
4. Check notification delivery

## 📊 Database Tables Required

Ensure these tables exist in your Supabase database:

```sql
-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone_number TEXT,
  property_id UUID REFERENCES properties(id),
  rent_amount DECIMAL,
  deposit_amount DECIMAL,
  move_in_date DATE,
  rent_due_date DATE,
  next_rent_due_date DATE,
  status TEXT DEFAULT 'active',
  rent_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  water_rate DECIMAL,
  electricity_rate DECIMAL,
  garbage_rate DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  amount DECIMAL NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  payment_date TIMESTAMP,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Utility Bills table
CREATE TABLE utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  property_id UUID REFERENCES properties(id),
  water_amount DECIMAL,
  electricity_amount DECIMAL,
  garbage_amount DECIMAL,
  total_amount DECIMAL NOT NULL,
  billing_month TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Requests table
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  property_id UUID REFERENCES properties(id),
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  requested_date TIMESTAMP DEFAULT NOW(),
  tenant_name TEXT,
  property_address TEXT
);

-- Leases table
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  property_id UUID REFERENCES properties(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount DECIMAL NOT NULL,
  deposit_amount DECIMAL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Workflow Dependencies

Some workflows depend on others:

1. **Rent Reminder** → **M-Pesa Payment Processing**
2. **Utility Billing** → **M-Pesa Payment Processing**
3. **Tenant Onboarding** → **M-Pesa Payment Processing**

## 🚨 Important Notes

### Security
- Store sensitive credentials in n8n's credential system
- Use environment variables for configuration
- Enable HTTPS for production webhooks

### Monitoring
- Check workflow execution logs regularly
- Monitor payment success rates
- Track notification delivery

### Customization
- Adjust timing for reminders and billing
- Modify notification messages
- Add additional validation rules
- Customize M-Pesa parameters

## 🆘 Troubleshooting

### Common Issues
1. **Webhook not receiving data**: Check URL configuration
2. **Database errors**: Verify table structure and permissions
3. **M-Pesa failures**: Check credentials and network connectivity
4. **Notification issues**: Verify tenant contact information

### Debug Tips
- Use "Set" nodes to log intermediate values
- Check execution logs for detailed error messages
- Test individual nodes before connecting them
- Verify webhook URLs are accessible

## 📈 Next Steps

1. **Import all workflows** into n8n
2. **Configure credentials** for Supabase and Daraja
3. **Test each workflow** with sample data
4. **Set up webhooks** in your application
5. **Monitor execution** and adjust as needed
6. **Create additional workflows** for specific needs

## 📞 Support

For issues or questions:
- Check n8n execution logs
- Verify database connections
- Test individual workflow nodes
- Review webhook configurations

Your property management system is now fully automated! 🎉

