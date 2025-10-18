# 🚀 n8n Workflow Triggers Guide

## 📋 How to Trigger Each Workflow

### 1. 🏠 Rent Reminder Automation
**Trigger Type**: Schedule (Monthly)
**Current Status**: Waiting for next scheduled run

**How to Test:**
1. Open the workflow in n8n
2. Click the **"Execute Workflow"** button (play icon)
3. Or change the schedule to run more frequently for testing

**To Change Schedule for Testing:**
- Edit the "Monthly Rent Reminder" node
- Change cron expression from `0 9 1 * *` (1st of month at 9 AM) to `*/5 * * * *` (every 5 minutes)
- Save and activate the workflow

### 2. 💰 M-Pesa Payment Processing
**Trigger Type**: Webhook
**Current Status**: Waiting for webhook calls

**Webhook URL**: `http://localhost:5678/webhook/mpesa-callback`

**How to Test:**
1. Use the webhook URL to send test data
2. Or use the "Execute Workflow" button with sample data

**Test Data Format:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "test-123",
      "CheckoutRequestID": "test-456",
      "ResultCode": 0,
      "ResultDesc": "Success",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 1000},
          {"Name": "MpesaReceiptNumber", "Value": "test-receipt-123"},
          {"Name": "TransactionDate", "Value": "20250120120000"},
          {"Name": "PhoneNumber", "Value": "254768679899"}
        ]
      }
    }
  }
}
```

### 3. ⚡ Utility Billing Automation
**Trigger Type**: Schedule (Monthly)
**Current Status**: Waiting for next scheduled run

**How to Test:**
1. Click **"Execute Workflow"** button
2. Or change schedule to run more frequently

**To Change Schedule for Testing:**
- Edit the "Monthly Utility Billing" node
- Change cron expression from `0 0 1 * *` (1st of month) to `*/10 * * * *` (every 10 minutes)

### 4. 🔧 Maintenance Request Automation
**Trigger Type**: Webhook
**Current Status**: Waiting for webhook calls

**Webhook URL**: `http://localhost:5678/webhook/maintenance-request`

**Test Data Format:**
```json
{
  "tenant_id": "fdc59a21-806f-4fdf-8399-f980038b3545",
  "property_id": "83797eb2-dc1d-4a13-b524-16fb34cdf4d4",
  "issue_type": "Plumbing",
  "description": "Leaky faucet in kitchen",
  "priority": "medium",
  "urgency": "normal"
}
```

### 5. 👥 Tenant Onboarding Automation
**Trigger Type**: Webhook
**Current Status**: Waiting for webhook calls

**Webhook URL**: `http://localhost:5678/webhook/tenant-onboarding`

**Test Data Format:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone_number": "254712345678",
  "property_id": "83797eb2-dc1d-4a13-b524-16fb34cdf4d4",
  "rent_amount": 25000,
  "deposit_amount": 50000,
  "move_in_date": "2025-02-01",
  "lease_duration": 12
}
```

## 🧪 Quick Test Methods

### Method 1: Manual Execution
1. Open each workflow in n8n
2. Click the **"Execute Workflow"** button
3. The workflow will run with current data

### Method 2: Webhook Testing
Use curl or Postman to send test data:

```bash
# Test M-Pesa Payment Processing
curl -X POST http://localhost:5678/webhook/mpesa-callback \
  -H "Content-Type: application/json" \
  -d '{"Body":{"stkCallback":{"MerchantRequestID":"test-123","CheckoutRequestID":"test-456","ResultCode":0,"ResultDesc":"Success","CallbackMetadata":{"Item":[{"Name":"Amount","Value":1000},{"Name":"MpesaReceiptNumber","Value":"test-receipt-123"},{"Name":"TransactionDate","Value":"20250120120000"},{"Name":"PhoneNumber","Value":"254768679899"}]}}}}'

# Test Maintenance Request
curl -X POST http://localhost:5678/webhook/maintenance-request \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"fdc59a21-806f-4fdf-8399-f980038b3545","property_id":"83797eb2-dc1d-4a13-b524-16fb34cdf4d4","issue_type":"Plumbing","description":"Leaky faucet","priority":"medium","urgency":"normal"}'

# Test Tenant Onboarding
curl -X POST http://localhost:5678/webhook/tenant-onboarding \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","phone_number":"254712345678","property_id":"83797eb2-dc1d-4a13-b524-16fb34cdf4d4","rent_amount":30000,"deposit_amount":60000,"move_in_date":"2025-02-01","lease_duration":12}'
```

### Method 3: Schedule Testing
For scheduled workflows, temporarily change the cron expression:
- `*/1 * * * *` = Every minute
- `*/5 * * * *` = Every 5 minutes
- `*/10 * * * *` = Every 10 minutes

## 🎯 Expected Results

### Rent Reminder
- Should find 1 active tenant (Tevin Mokaya)
- Should calculate utility bills
- Should send M-Pesa STK Push (if Daraja configured)

### Utility Billing
- Should generate utility bills for active tenants
- Should send notifications
- Should initiate M-Pesa payments

### M-Pesa Payment Processing
- Should process payment callbacks
- Should update tenant records
- Should send confirmations

### Maintenance Request
- Should create maintenance records
- Should send notifications to tenant and admin
- Should return success response

### Tenant Onboarding
- Should create tenant and lease records
- Should send welcome notifications
- Should initiate first payment

## 🔧 Troubleshooting

If workflows don't execute:
1. Check that workflows are **Active** (toggle switch)
2. Verify Supabase credentials are configured
3. Check execution logs for errors
4. Ensure webhook URLs are accessible
5. Test individual nodes before running full workflow



