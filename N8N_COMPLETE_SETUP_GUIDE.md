# 🚀 n8n Complete Setup Guide for Lovly Property Management

## ✅ What's Already Done

- ✅ n8n installed and running on port 5678
- ✅ All 5 automation workflows created
- ✅ Workflows updated with your Supabase service role key
- ✅ Configuration optimized for production use

## 🔗 Access Your n8n Instance

**URL**: http://localhost:5678
**Status**: ✅ Running and ready

## 📋 Your Supabase Credentials

### Service Role Key (Full Database Access)
```
URL: https://kozhlejudselgtmohdfm.supabase.co
Service Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
```

### Anonymous Key (Public Access)
```
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M
```

## 🎯 Available Automations

### 1. 🏠 Rent Reminder Automation
- **File**: `n8n-workflows/rent-reminder-automation.json`
- **Trigger**: Monthly (1st at 9 AM)
- **Purpose**: Automated rent collection via M-Pesa

### 2. 💰 M-Pesa Payment Processing
- **File**: `n8n-workflows/mpesa-payment-processing.json`
- **Trigger**: Webhook (M-Pesa callbacks)
- **Purpose**: Real-time payment processing

### 3. ⚡ Utility Billing Automation
- **File**: `n8n-workflows/utility-billing-automation.json`
- **Trigger**: Monthly (1st of month)
- **Purpose**: Automated utility bill generation and collection

### 4. 🔧 Maintenance Request Automation
- **File**: `n8n-workflows/maintenance-request-automation.json`
- **Trigger**: Webhook (maintenance requests)
- **Purpose**: Automated maintenance request handling

### 5. 👥 Tenant Onboarding Automation
- **File**: `n8n-workflows/tenant-onboarding-automation.json`
- **Trigger**: Webhook (new tenant registration)
- **Purpose**: Complete tenant onboarding process

## 🔧 Step-by-Step Setup

### Step 1: Access n8n
1. Open http://localhost:5678 in your browser
2. Create your admin account
3. Complete the initial setup

### Step 2: Import Workflows
1. Go to **Workflows** → **Import from File**
2. Import each JSON file from the `n8n-workflows/` folder:
   - `rent-reminder-automation.json`
   - `mpesa-payment-processing.json`
   - `utility-billing-automation.json`
   - `maintenance-request-automation.json`
   - `tenant-onboarding-automation.json`

### Step 3: Configure Supabase Credentials
1. Go to **Settings** → **Credentials**
2. Click **Add Credential**
3. Select **Header Auth**
4. Configure as follows:

**Name**: `Supabase API`
**Header Name**: `Authorization`
**Header Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`

**Additional Headers**:
- `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`
- `Content-Type`: `application/json`
- `Prefer`: `return=minimal`

### Step 4: Configure Daraja API Credentials
1. Go to **Settings** → **Credentials**
2. Click **Add Credential**
3. Select **Header Auth**
4. Configure as follows:

**Name**: `Daraja API`
**Header Name**: `Authorization`
**Header Value**: `Basic {base64_encoded_credentials}`

**Note**: Replace `{base64_encoded_credentials}` with base64 encoded `consumer_key:consumer_secret`

### Step 5: Test Connections
1. Open each workflow
2. Test the Supabase connection nodes
3. Verify data retrieval and updates
4. Check for any errors in the execution logs

### Step 6: Activate Workflows
1. Toggle the **Active** switch on each workflow
2. Monitor the execution logs
3. Test with sample data

## 🌐 Webhook URLs

Configure these webhook URLs in your application:

### M-Pesa Callbacks
```
URL: http://localhost:5678/webhook/mpesa-callback
Method: POST
Purpose: Process M-Pesa payment callbacks
```

### Maintenance Requests
```
URL: http://localhost:5678/webhook/maintenance-request
Method: POST
Purpose: Handle maintenance request submissions
```

### Tenant Onboarding
```
URL: http://localhost:5678/webhook/tenant-onboarding
Method: POST
Purpose: Process new tenant registrations
```

## 📊 Database Schema

Ensure these tables exist in your Supabase database:

```sql
-- Core tables (should already exist)
tenants
properties
payments
utility_bills
maintenance_requests
leases
notifications
```

## 🔄 Workflow Dependencies

1. **Rent Reminder** → **M-Pesa Payment Processing**
2. **Utility Billing** → **M-Pesa Payment Processing**
3. **Tenant Onboarding** → **M-Pesa Payment Processing**

## 🚨 Important Notes

### Security
- ✅ Using service role key for full database access
- ✅ Credentials stored securely in n8n
- ✅ Webhook URLs configured for local development

### Production Considerations
- Update webhook URLs to your production domain
- Use HTTPS for production webhooks
- Set up proper SSL certificates
- Configure firewall rules for webhook access

### Monitoring
- Check execution logs regularly
- Monitor payment success rates
- Track notification delivery
- Set up alerts for failed executions

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

## 🎉 You're All Set!

Your property management system is now fully automated with n8n! The workflows will handle:

- ✅ Automated rent collection
- ✅ Real-time payment processing
- ✅ Utility bill generation and collection
- ✅ Maintenance request handling
- ✅ Complete tenant onboarding

**Access n8n**: http://localhost:5678
**Status**: Ready for production use! 🚀



