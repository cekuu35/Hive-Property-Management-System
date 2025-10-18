# n8n Quick Reference Card

## 🚀 Access
- **URL**: http://localhost:5678
- **Status**: ✅ Running on port 5678

## 🔧 Commands
```bash
# Start n8n
npm run n8n

# Start with tunnel (for webhooks)
npm run n8n:dev

# Stop n8n
Ctrl+C in terminal
```

## 🔐 Credentials Setup

### Supabase API
- **Type**: Header Auth
- **Header**: `Authorization`
- **Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M`
- **Additional Headers**:
  - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M`
  - `Content-Type`: `application/json`

### Daraja API
- **Type**: Header Auth
- **Header**: `Authorization`
- **Value**: `Basic {base64_encoded_credentials}`
- **Note**: Replace with base64 encoded `consumer_key:consumer_secret`

## 📡 API Endpoints

### Supabase
- **Base URL**: `https://kozhlejudselgtmohdfm.supabase.co/rest/v1/`
- **Tables**: `tenants`, `properties`, `utility_bills`, `payments`

### Daraja (Sandbox)
- **Base URL**: `https://sandbox.safaricom.co.ke`
- **STK Push**: `/mpesa/stkpush/v1/processrequest`
- **Token**: `/oauth/v1/generate`

## 🔄 Common Workflows

### 1. Tenant Payment
```
Webhook → Get Tenant → STK Push → Update Payment Status
```

### 2. Utility Bill
```
Schedule → Get Bills → Send Notifications → Process Payments
```

### 3. Payment Callback
```
Webhook → Verify Payment → Update Database → Send Confirmation
```

## 🛠️ Node Types
- **HTTP Request**: API calls
- **Webhook**: Receive data
- **Schedule Trigger**: Timed execution
- **Set**: Data manipulation
- **Code**: Custom JavaScript
- **Email**: Send notifications

## 📝 Tips
1. Always test individual nodes first
2. Use "Set" nodes to debug data flow
3. Store sensitive data in credentials
4. Use environment variables for configuration
5. Enable error handling with "On Error" connections

## 🆘 Troubleshooting
- **CORS Issues**: Check Supabase RLS policies
- **Auth Errors**: Verify API keys and tokens
- **Webhook Issues**: Ensure URLs are accessible
- **Rate Limits**: Add delays between requests

## 📚 Files
- `n8n-connections-guide.md` - Detailed setup guide
- `sample-workflows.json` - Example workflows
- `setup-n8n-credentials.js` - Setup helper script

