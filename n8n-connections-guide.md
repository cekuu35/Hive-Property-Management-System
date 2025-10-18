# n8n Integration Guide

## Overview
n8n is now running locally on port 5678. This guide will help you connect it to your Supabase database and Daraja API.

## Access n8n
- **URL**: http://localhost:5678
- **Status**: ✅ Running and accessible

## 1. Supabase Database Connection

### Using HTTP Request Node
1. In n8n, create a new workflow
2. Add an "HTTP Request" node
3. Configure the following:

**Basic Settings:**
- Method: `GET`, `POST`, `PUT`, or `DELETE` (depending on your needs)
- URL: `https://kozhlejudselgtmohdfm.supabase.co/rest/v1/{table_name}`
- Authentication: `Header Auth`
- Header Name: `Authorization`
- Header Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M`
- Additional Headers:
  - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal` (for updates/inserts)

### Example Supabase Operations

**Read Data:**
```
GET https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants
```

**Insert Data:**
```
POST https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants
Body: {"name": "John Doe", "email": "john@example.com"}
```

**Update Data:**
```
PATCH https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?id=eq.123
Body: {"name": "John Updated"}
```

## 2. Daraja API Connection

### M-Pesa STK Push Workflow
1. Create a new workflow in n8n
2. Add the following nodes in sequence:

**Node 1: Get Access Token**
- Type: HTTP Request
- Method: `GET`
- URL: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
- Authentication: `Header Auth`
- Header Name: `Authorization`
- Header Value: `Basic {base64_encoded_credentials}`

**Node 2: STK Push Request**
- Type: HTTP Request
- Method: `POST`
- URL: `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- Headers:
  - `Authorization`: `Bearer {{$node["Get Access Token"].json["access_token"]}}`
  - `Content-Type`: `application/json`
- Body:
```json
{
  "BusinessShortCode": "174379",
  "Password": "{{$json.password}}",
  "Timestamp": "{{$json.timestamp}}",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": "{{$json.amount}}",
  "PartyA": "{{$json.phone_number}}",
  "PartyB": "174379",
  "PhoneNumber": "{{$json.phone_number}}",
  "CallBackURL": "https://your-callback-url.com/callback",
  "AccountReference": "{{$json.account_reference}}",
  "TransactionDesc": "Payment"
}
```

### Required Environment Variables
Add these to your n8n configuration or as workflow variables:

```
DARAJA_CONSUMER_KEY=your_consumer_key
DARAJA_CONSUMER_SECRET=your_consumer_secret
DARAJA_PASSKEY=your_passkey
DARAJA_SHORTCODE_SANDBOX=174379
DARAJA_SHORTCODE_PRODUCTION=your_production_shortcode
```

## 3. Sample Workflows

### Workflow 1: Tenant Payment Processing
1. **Trigger**: Webhook or Manual
2. **Get Tenant Data**: HTTP Request to Supabase
3. **Generate M-Pesa Payment**: STK Push to Daraja
4. **Update Payment Status**: HTTP Request to Supabase
5. **Send Notification**: Email/SMS node

### Workflow 2: Utility Bill Processing
1. **Trigger**: Schedule (monthly)
2. **Get Utility Bills**: HTTP Request to Supabase
3. **Send Payment Requests**: M-Pesa STK Push
4. **Process Callbacks**: Webhook from Daraja
5. **Update Bill Status**: HTTP Request to Supabase

## 4. Testing Your Connections

### Test Supabase Connection
1. Create a simple workflow with HTTP Request node
2. Use GET method to fetch from any table
3. Check if data is returned correctly

### Test Daraja Connection
1. Use the sandbox environment first
2. Test with small amounts
3. Verify callback handling

## 5. Security Notes

- Store sensitive credentials as n8n credentials, not in workflow JSON
- Use environment variables for configuration
- Enable HTTPS for production webhooks
- Regularly rotate API keys

## 6. Troubleshooting

### Common Issues:
1. **CORS Errors**: Ensure your Supabase RLS policies allow the requests
2. **Authentication Errors**: Check API keys and tokens
3. **Callback Issues**: Ensure webhook URLs are accessible
4. **Rate Limiting**: Implement delays between requests

### Debug Tips:
- Use the "Set" node to log intermediate values
- Check the execution log for detailed error messages
- Test individual nodes before connecting them

## Next Steps
1. Open n8n at http://localhost:5678
2. Create your first workflow
3. Test the Supabase connection
4. Test the Daraja API connection
5. Build your automation workflows

For more detailed information, refer to:
- [n8n Documentation](https://docs.n8n.io/)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [Daraja API Documentation](https://developer.safaricom.co.ke/docs)

