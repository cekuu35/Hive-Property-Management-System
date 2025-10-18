# 🚀 n8n Manual Import Guide

## ✅ Your n8n is Ready!

**URL**: http://localhost:5678  
**Status**: ✅ Running with 1 existing workflow

## 📥 Manual Import Instructions

Since the API import had some issues, here's the manual import process:

### Step 1: Access n8n
1. Open http://localhost:5678 in your browser
2. You should see the n8n interface

### Step 2: Import Each Workflow
1. Click **"Workflows"** in the left sidebar
2. Click **"Import from File"** button
3. Select each JSON file from the `n8n-workflows/` folder:

#### Import These Files:
- ✅ `rent-reminder-automation.json`
- ✅ `mpesa-payment-processing.json` 
- ✅ `utility-billing-automation.json`
- ✅ `maintenance-request-automation.json`
- ✅ `tenant-onboarding-automation.json`

### Step 3: Configure Credentials
After importing, you'll need to set up credentials:

#### Supabase API Credential:
1. Go to **Settings** → **Credentials**
2. Click **"Add Credential"**
3. Select **"Header Auth"**
4. Configure:
   - **Name**: `Supabase API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`
   - **Additional Headers**:
     - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`
     - `Content-Type`: `application/json`
     - `Prefer`: `return=minimal`

#### Daraja API Credential:
1. Go to **Settings** → **Credentials**
2. Click **"Add Credential"**
3. Select **"Header Auth"**
4. Configure:
   - **Name**: `Daraja API`
   - **Header Name**: `Authorization`
   - **Header Value**: `Basic {base64_encoded_credentials}`
   - **Note**: Replace with your actual M-Pesa credentials

### Step 4: Test Workflows
1. Open each imported workflow
2. Test the Supabase connection nodes
3. Verify data retrieval works
4. Check for any errors

### Step 5: Activate Workflows
1. Toggle the **"Active"** switch on each workflow
2. Monitor execution logs
3. Test with sample data

## 🌐 Webhook URLs

Configure these in your application:

- **M-Pesa Callback**: `http://localhost:5678/webhook/mpesa-callback`
- **Maintenance Request**: `http://localhost:5678/webhook/maintenance-request`
- **Tenant Onboarding**: `http://localhost:5678/webhook/tenant-onboarding`

## 🎯 What Each Workflow Does

### 1. 🏠 Rent Reminder Automation
- **Trigger**: Monthly (1st at 9 AM)
- **Purpose**: Automated rent collection via M-Pesa
- **Features**: Tenant queries, STK Push, notifications

### 2. 💰 M-Pesa Payment Processing
- **Trigger**: Webhook (M-Pesa callbacks)
- **Purpose**: Real-time payment processing
- **Features**: Payment verification, record updates, confirmations

### 3. ⚡ Utility Billing Automation
- **Trigger**: Monthly (1st of month)
- **Purpose**: Automated utility bill generation
- **Features**: Bill calculation, notifications, payment collection

### 4. 🔧 Maintenance Request Automation
- **Trigger**: Webhook (maintenance requests)
- **Purpose**: Automated maintenance handling
- **Features**: Request prioritization, notifications, admin alerts

### 5. 👥 Tenant Onboarding Automation
- **Trigger**: Webhook (new tenant registration)
- **Purpose**: Complete onboarding process
- **Features**: Record creation, lease generation, first payment

## 🚨 Important Notes

- All workflows use your Supabase service role key
- Workflows are imported as **inactive** by default
- Test each workflow before activating
- Configure Daraja API credentials for M-Pesa functionality

## 🎉 You're All Set!

Once imported and configured, your property management system will be fully automated! 🚀



